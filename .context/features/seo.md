# CheckinBliss — SEO & Search Discoverability Implementation

For a coding agent. Implements the three-layer naming structure (branded · building · neighbourhood/city) across data, UI, URLs, and structured data. **Launch-Critical** — URL structure is the one thing on this platform that is cheap to build now and expensive to retrofit (indexed-URL redirects, lost SEO equity), unlike most backlog items.

---

## 0. The problem this solves

Customers search for **landmarks they know** ("Iconic Towers Lekki apartment"), not CheckinBliss's editorial property names ("The Palm Nest"). Three layers, three purposes:

| Layer | Purpose | Example |
|---|---|---|
| **Branded name** | customer-facing, editorial, brand-defining | "The Palm Nest" |
| **Building/development name** | search-facing — what people actually search | "Iconic Towers" |
| **Neighbourhood + city** | geo-facing — location context people also search | "Lekki Phase 1, Lagos" |

All three already exist as concepts in the schema (`name`, `city`, `neighbourhood`) except **branded name vs building name are currently the same field** (`name`). This spec splits them and wires the result through routing, titles, structured data, and the sitemap.

---

## 1. Schema change

Current `properties` table has `name` (the only name field), plus `city`, `neighbourhood`, `slug`. Migrate to three explicit name layers:

```sql
-- 0004_seo_naming.sql
alter table properties
  rename column name to branded_name;          -- "The Palm Nest" — what guests see

alter table properties
  add column building_name text not null default '',  -- "Iconic Towers" — search-facing
  add column country text not null default 'Nigeria',
  add column building_slug text,               -- "iconic-towers" (derived, see §2)
  add column neighbourhood_slug text;          -- "lekki-phase-1" (derived, see §2)

-- backfill existing rows: building_name = branded_name until real data is entered
update properties set building_name = branded_name where building_name = '';

create index properties_building_neighbourhood_idx
  on properties (city, neighbourhood, building_name);
```

`branded_name` keeps the existing `name` semantics everywhere already wired (notifications, WhatsApp templates say "Sunset Dove Unit 2" — that's `branded_name`, unchanged). `building_name` is new and **required** going forward (operators must enter it at onboarding — it has no fallback once backfilled).

---

## 2. Slug generation (deterministic, for URLs)

Slugs are lowercase, hyphenated, ASCII. Generate once on insert/update, store (don't compute per-request).

```ts
// lib/slug.ts
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")  // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

- `city_slug` = `slugify(city)` → "lagos"
- `neighbourhood_slug` = `slugify(neighbourhood)` → "lekki-phase-1"
- `building_slug` = `slugify(building_name)` → "iconic-towers"
- `slug` (existing column) = `slugify(branded_name)` → "the-palm-nest"

**Uniqueness:** `building_slug` is **not** globally unique (multiple buildings could slugify the same) — uniqueness is enforced on the **full path** `(city_slug, neighbourhood_slug, building_slug, slug)`, since that's the actual URL. Add a uniqueness check on property create/update; on collision, append a numeric suffix to `slug` only (the branded name's slug), never to the building/neighbourhood (those should match the real building consistently across properties in it).

```sql
alter table properties add constraint properties_url_path_unique
  unique (city, neighbourhood, building_name, slug);
```

Recompute slugs server-side whenever the underlying text fields change (operator edits building name → `building_slug` regenerates; **old URLs must then 301 redirect**, see §3.4).

---

## 3. URL structure

### 3.1 Route shape

```
/[city]/[neighbourhood]/[building]/[property]
```
Example: `/lagos/lekki-phase-1/iconic-towers/the-palm-nest`

Next.js App Router:
```
app/[city]/[neighbourhood]/[building]/[property]/page.tsx
```

### 3.2 Resolution (server)

```ts
// app/[city]/[neighbourhood]/[building]/[property]/page.tsx
export default async function PropertyPage({ params }: {
  params: Promise<{ city: string; neighbourhood: string; building: string; property: string }>
}) {
  const { city, neighbourhood, building, property } = await params;
  const listing = await getPropertyBySlugPath({ city, neighbourhood, building, property });
  if (!listing) notFound();
  // ... render (see §4)
}
```

```ts
// lib/data.ts
export async function getPropertyBySlugPath(p: {
  city: string; neighbourhood: string; building: string; property: string;
}) {
  // match on slugified columns, NOT raw text — case/accent-insensitive by construction
  const db = createServer();
  const { data } = await db
    .from("properties")
    .select("*")
    .eq("status", "approved")
    .ilike("city", p.city.replace(/-/g, " "))            // simple match; or store + match on *_slug columns directly (preferred — see §2)
    .eq("building_slug", p.building)
    .eq("neighbourhood_slug", p.neighbourhood)
    .eq("slug", p.property)
    .maybeSingle();
  return data;
}
```

**Prefer matching directly on stored `*_slug` columns** (as written above) over re-slugifying `city` at request time — it's faster and avoids any slugify drift between write-time and read-time.

### 3.3 Card links (storefront, search results)

Every `<Link>` to a property must build the full 4-segment path:

```ts
const propertyHref = (p: Property) =>
  `/${slugify(p.city)}/${p.neighbourhood_slug}/${p.building_slug}/${p.slug}`;
```

### 3.4 Redirects on rename

If an operator edits `building_name`, `neighbourhood`, or `branded_name` post-publish, the URL changes. **Required:** before updating, write the old path to a `url_redirects` table; serve a 301 from the old path.

```sql
create table url_redirects (
  id uuid primary key default gen_random_uuid(),
  old_path text not null unique,
  new_path text not null,
  created_at timestamptz not null default now()
);
```
Middleware checks `url_redirects` for unmatched paths before falling through to 404:
```ts
// middleware.ts (or a catch-all route) — check url_redirects, 301 if found, else continue
```

---

## 4. Page content — the three-layer hierarchy

### 4.1 Property card (storefront, search results)

```
The Palm Nest                    ← branded_name, large, editorial (existing card title weight)
Iconic Towers · Lekki Phase 1, Lagos   ← building_name · neighbourhood, city — secondary weight
2BR · Sleeps 4 · Late checkout
```
This is a **content change** to the existing `PropertyCard` component — add the building/neighbourhood line beneath the existing title, in the smaller supporting type weight already used for the amenities line. No new component.

### 4.2 Property detail page

```
The Palm Nest                                          ← <h1>, branded_name
A two-bedroom apartment at Iconic Towers, Lekki Phase 1  ← descriptive line: bedrooms + building_name + neighbourhood
```
The descriptive line does double duty: orientation for the guest, keyword content for SEO. Generate it:
```ts
const descriptiveLine = (p: Property) =>
  `A ${bedroomWord(p.bedrooms)} apartment at ${p.building_name}, ${p.neighbourhood}`;
```

### 4.3 Page `<title>` (meta title)

```
The Palm Nest at Iconic Towers, Lekki — CheckinBliss
```
```ts
export async function generateMetadata({ params }): Promise<Metadata> {
  const p = await getPropertyBySlugPath(await params);
  if (!p) return {};
  return {
    title: `${p.branded_name} at ${p.building_name}, ${shortNeighbourhood(p.neighbourhood)} — CheckinBliss`,
    description: buildMetaDescription(p), // §5
    alternates: { canonical: propertyHref(p) },
  };
}
```

---

## 5. Auto-generated meta descriptions

Template over building + neighbourhood + amenity context — not free text, deterministic and SEO-safe:

```ts
// lib/seo.ts
export function buildMetaDescription(p: Property): string {
  const amenities = topAmenities(p, 3).join(", ");  // e.g. "pool, gym, 24/7 power"
  return `${p.branded_name}, a ${bedroomWord(p.bedrooms)} stay at ${p.building_name} in ` +
    `${p.neighbourhood}, ${p.city}. ${amenities ? `Featuring ${amenities}. ` : ""}` +
    `Instant booking, verified by CheckinBliss.`;
}
```
Keep under ~155 characters for search-result truncation; truncate amenities list first if needed.

---

## 6. Schema.org structured data

Use `LodgingBusiness` (more specific than generic `LocalBusiness` — correct for short-stay accommodation). Inject as JSON-LD in the detail page:

```tsx
// app/[city]/[neighbourhood]/[building]/[property]/page.tsx
function PropertyJsonLd({ p }: { p: Property }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: p.branded_name,
    containedInPlace: {
      "@type": "Place",
      name: p.building_name,
      address: {
        "@type": "PostalAddress",
        addressLocality: p.neighbourhood,
        addressRegion: p.city,
        addressCountry: p.country,
      },
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: p.neighbourhood,
      addressRegion: p.city,
      addressCountry: p.country,
    },
    image: p.cover_photo_url ?? undefined,        // see Property-Media-Implementation.md
    priceRange: formatPriceRange(p.nightly_rate_minor),
    url: `https://checkinbliss.com${propertyHref(p)}`,
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```
Render this inside the detail page `<head>`-equivalent (Next.js: place in the page body; Next hoists `<script>` JSON-LD correctly, or use `generateMetadata`'s `other` field if preferred).

---

## 7. Sitemap

`app/sitemap.ts` (Next.js native sitemap route — generates `/sitemap.xml` automatically):

```ts
import type { MetadataRoute } from "next";
import { getAllApprovedProperties } from "@/lib/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const properties = await getAllApprovedProperties(); // status = 'approved' only
  const base = "https://checkinbliss.com";
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/lagos`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/abuja`, changeFrequency: "daily", priority: 0.8 },
    ...properties.map((p) => ({
      url: `${base}${propertyHref(p)}`,
      lastModified: p.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
```
**Only `approved` properties** are included — never `draft`/`pending_review`/`suspended` (matches the curation gate in `Property-Media-Implementation.md`).

---

## 8. robots.txt

`app/robots.ts`:
```ts
import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/", "/book/"] },
    sitemap: "https://checkinbliss.com/sitemap.xml",
  };
}
```
Booking flow (`/book/*`) and admin/API routes excluded — no SEO value, avoid indexing transactional pages with guest data in query strings.

---

## 9. Operator data-entry requirement

`building_name` has no safe fallback once backfilled — operators must enter the real building/development name at property onboarding (curation queue, `Property-Media-Implementation.md` §4d). Add a required field to that flow:

- Curation form gains **Building / development name** (required) and **Country** (defaults "Nigeria") alongside the existing branded name field.
- Validation: reject publish (`pending_review → approved`) if `building_name` is empty or equals the auto-backfilled placeholder.

---

## 10. Hard rules (must not break)

- **`branded_name`** stays the customer-facing, dominant-weight name everywhere (cards, detail `<h1>`, WhatsApp notifications, emails). Never replaced by building name.
- **URL path segments come from stored `*_slug` columns**, not computed ad hoc at request time — avoids drift.
- **Renaming any layer post-publish requires a redirect row** (§3.4) — never let a previously indexed URL 404.
- **Sitemap includes `approved` only.**
- **Meta description is templated, not freeform** — deterministic, safe, under ~155 chars.
- **JSON-LD uses `LodgingBusiness`**, with `containedInPlace` carrying the building name — this is the specific field Google uses to associate a listing with a named building.
- **Country defaults to Nigeria** but is a real column for future multi-region (ties to `User-Flow-V2.md` Flow 11).

---

## 11. Definition of done

- [ ] Migration `0004_seo_naming.sql` applied (`branded_name`, `building_name`, `country`, `*_slug` columns, `url_redirects` table, uniqueness constraint)
- [ ] `lib/slug.ts` slugify function; slugs computed and stored on create/update, not per-request
- [ ] Route restructured to `/[city]/[neighbourhood]/[building]/[property]`
- [ ] `getPropertyBySlugPath` matches on stored slug columns
- [ ] Card + detail UI show the three-layer hierarchy (branded dominant, building+neighbourhood secondary)
- [ ] `generateMetadata` produces the "{branded} at {building}, {neighbourhood} — CheckinBliss" title
- [ ] `buildMetaDescription` templated, under ~155 chars
- [ ] `LodgingBusiness` JSON-LD rendered on every detail page
- [ ] `app/sitemap.ts` includes only `approved` properties, with `lastModified`
- [ ] `app/robots.ts` excludes `/api/`, `/admin/`, `/book/`
- [ ] Redirect-on-rename: editing building/neighbourhood/branded name post-publish writes an `url_redirects` row; old path 301s
- [ ] Curation form requires `building_name` + `country` before a property can reach `approved`
- [ ] Works in mock mode (seed data carries `building_name`/`neighbourhood_slug`/`building_slug`)

---

## 12. One paragraph for your coding agent

> Split the existing `properties.name` into `branded_name` (customer-facing, unchanged everywhere it's already used) and a new required `building_name` (search-facing — the actual building/development name, e.g. "Iconic Towers"). Add `country`, `building_slug`, `neighbourhood_slug`, and reuse the existing `slug` for the branded name; store all slugs (don't compute per-request) and enforce uniqueness on `(city, neighbourhood, building_name, slug)`. Restructure property routes to `/[city]/[neighbourhood]/[building]/[property]`, resolving by matching the stored slug columns. Update `PropertyCard` and the detail page to show branded name dominant with "{building_name} · {neighbourhood}, {city}" as a secondary line (content change to existing components, not new ones). Add `generateMetadata` producing "{branded_name} at {building_name}, {neighbourhood} — CheckinBliss" titles and a templated, ~155-char meta description built from building+neighbourhood+top amenities. Render `LodgingBusiness` JSON-LD per property with `containedInPlace` set to the building. Add `app/sitemap.ts` (approved properties only) and `app/robots.ts` (excluding `/api/`, `/admin/`, `/book/`). **Critical:** any post-publish rename of building/neighbourhood/branded name must write an `url_redirects` row and 301 the old path — never let an indexed URL 404. Require `building_name` + `country` in the operator curation form before a property can become `approved`.