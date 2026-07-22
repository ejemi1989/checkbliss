# CheckinBliss — Search Architecture

Implements the search bar: **[ Where — destinations or neighbourhoods ] [ Check in — add dates ] [ Check out — add dates ]**. For a coding agent. Grounded in PRD v2.3: editorial browse (§2C, §3), availability enforced from the CheckinBliss calendar (§4), and **late checkout is NOT a filter** (§6.4).

---

## 1. Principles (from the PRD)

- **Search is availability-driven, not a faceted filter wall.** Three inputs only: **where** + **check-in** + **check-out**. PRD §6.4 explicitly rejects filter-checkbox UI as <q>mass-market (Booking.com style)</q>.
- **Availability is enforced from the internal calendar** (§4.1, §4.4): a property is bookable for a range only if no confirmed reservation and no owner block overlaps it.
- **The database owns availability truth** — search reads the same `reservations` + `availability_blocks` that the GiST constraint protects. Search never has its own availability cache.
- **"Where" is destinations OR neighbourhoods** — Lagos / Abuja (cities) and their neighbourhoods (Victoria Island, Lekki, Maitama…), not free-text geocoding at launch.
- Results stay **editorial** (§3 magazine grid), same `PropertyCard` as the storefront.

---

## 2. The search inputs

| Input | Behaviour | Notes |
|---|---|---|
| **Where** | typeahead over a known set: cities + neighbourhoods | not open geocoding; matches `properties.city` / `properties.neighbourhood` |
| **Check in** | date ≥ today + 14 (PRD §4.2 advance rule) | surfaced as a trust feature, not an error |
| **Check out** | date > check-in | |

All three are **optional**: empty search = browse everything (the storefront). "Where" with no dates = all approved properties in that place. Dates with no "where" = everything available for those dates. This keeps the curated browse experience while letting intent narrow it.

---

## 3. URL = search state (shareable, server-read)

Search state lives in the **URL**, consistent with `State-Architecture-V1.md` (navigational state in the URL, server-read, no client store):

```
/                                         → browse all
/?where=Lagos                             → city
/?where=Victoria+Island                   → neighbourhood
/?where=Lagos&in=2026-09-15&out=2026-09-19  → availability-narrowed
```

`page.tsx` reads `searchParams` (async in Next 16 — `await`), passes to the data layer. Back/forward and link-sharing work for free.

---

## 4. Data model (no schema change needed)

Search reads existing tables:
- `properties` (status = `approved`) — `city`, `neighbourhood`, `nightly_rate_minor`, etc.
- `reservations` (status ≠ `cancelled`) — `daterange(check_in, check_out)`
- `availability_blocks` — `daterange(starts, ends)`

**Availability rule:** a property is available for `[in, out)` if **no** reservation and **no** block overlaps that range. This is the same overlap logic the GiST constraint enforces on write — search just reads it.

---

## 5. The query

A single SQL function keeps it correct and fast. Add as a migration:

```sql
-- Availability-aware search. Where + optional date range.
-- "where" matches city OR neighbourhood (case-insensitive). Empty = all.
create or replace function search_properties(
  p_where text default null,
  p_in    date default null,
  p_out   date default null
)
returns setof properties
language sql stable as $$
  select p.*
  from properties p
  where p.status = 'approved'
    and (
      p_where is null
      or p.city ilike p_where
      or p.neighbourhood ilike p_where
    )
    and (
      -- no date range given → availability not constrained
      p_in is null or p_out is null
      or not exists (
        select 1 from reservations r
        where r.property_id = p.id
          and r.status <> 'cancelled'
          and daterange(r.check_in, r.check_out, '[)')
              && daterange(p_in, p_out, '[)')
      )
      and not exists (
        select 1 from availability_blocks b
        where b.property_id = p.id
          and daterange(b.starts, b.ends, '[)')
              && daterange(p_in, p_out, '[)')
      )
    )
  order by p.is_featured desc, p.nightly_rate_minor asc;
$$;
```

Indexes already exist for the exclusion constraints; add a btree on `properties (status, city)` for the where-filter.

---

## 6. Data layer (`lib/data.ts`)

```ts
export async function searchProperties(opts: {
  where?: string; checkIn?: string; checkOut?: string;
}): Promise<Property[]> {
  if (!supabaseConfigured) return filterSeed(opts);           // mock mode
  const db = createServer();                                   // RLS: approved only
  const { data, error } = await db.rpc("search_properties", {
    p_where: opts.where ?? null,
    p_in: opts.checkIn ?? null,
    p_out: opts.checkOut ?? null,
  });
  if (error) throw error;
  return data ?? [];
}
```

Mock mode (`filterSeed`) applies the same where + overlap logic in JS over `seed-data.ts`, so search works with zero infrastructure.

---

## 7. Page wiring (`app/page.tsx`)

```tsx
export const dynamic = "force-dynamic";

export default async function Home({ searchParams }:{ searchParams: Promise<{ where?: string; in?: string; out?: string }> }) {
  const { where, in: checkIn, out: checkOut } = await searchParams;
  const properties = await searchProperties({ where, checkIn, checkOut });
  return (
    <>
      <SearchBar defaultWhere={where} defaultIn={checkIn} defaultOut={checkOut} />
      {/* existing editorial grid renders `properties` */}
      {properties.length === 0 && <EmptyState where={where} in={checkIn} out={checkOut} />}
    </>
  );
}
```

---

## 8. The SearchBar component (`components/search-bar.tsx`, client)

Three fields in a single editorial bar matching the design tokens (hairline borders, lagoon focus, not a chunky filter widget).

```
┌──────────────────────────┬───────────────┬───────────────┬────┐
│ Where — destinations…    │ Check in      │ Check out     │ →  │
└──────────────────────────┴───────────────┴───────────────┴────┘
```

- **Where:** text input with a typeahead dropdown listing cities + neighbourhoods (fetched once from `/api/locations`, or passed as a prop). Selecting sets `where`.
- **Check in / Check out:** date inputs. `in` min = today + 14 (§4.2); `out` min = `in` + 1.
- **Submit:** pushes `/?where=…&in=…&out=…` (router push). Server re-renders results. No client fetch of business data.

**Behaviour rules:**
- All fields optional; submitting empty = browse all.
- Selecting "Lagos" (city) shows all Lagos; selecting "Victoria Island" (neighbourhood) narrows further.
- The 14-day floor on check-in is shown as helper text ("Stays open 14+ days ahead"), not an error after the fact.
- **No late-checkout, rating, or amenity filters** (§6.4) — those are property *indicators*, never search inputs.

---

## 9. Locations source (`/api/locations`)

```
GET /api/locations  →  { cities: ["Lagos","Abuja"], neighbourhoods: ["Victoria Island","Lekki","Maitama", ...] }
```
Derived `distinct` from `approved` properties so the typeahead only ever offers places that have inventory. Cache it.

---

## 10. Empty state (cold-start UX)

At launch, thin availability is normal — never render a blank grid:
- "No stays in {where} for those dates" → offer: nearby dates, other neighbourhood, the other city (Abuja/Lagos), or "notify me" capture.
- This is the most common early result; design it deliberately.

---

## 11. What search must NOT become

- **Not a faceted filter wall** (§6.4) — no checkbox columns for amenities/late-checkout/rating.
- **Not open geocoding** at launch — "where" is the known city/neighbourhood set, not "anywhere near X km".
- **Not its own availability cache** — always read live `reservations` + `availability_blocks`.
- **Not a client-side fetch** of results — server-rendered from the URL.

(Map view, distance, and richer filters are Phase 2 considerations — see lifestyle verticals; keep launch search to where + dates.)

---

## 12. Definition of done

- [ ] `search_properties(where, in, out)` migration — availability via overlap on `reservations` + `availability_blocks`
- [ ] `searchProperties()` in `lib/data.ts` with mock-mode parity
- [ ] `/api/locations` typeahead source (distinct city/neighbourhood from approved inventory)
- [ ] `SearchBar` (where typeahead + two date inputs), pushes URL params
- [ ] `app/page.tsx` reads `searchParams`, renders results + empty state
- [ ] Check-in enforces today + 14 (§4.2); check-out > check-in
- [ ] Empty results show alternatives, never a blank grid
- [ ] No amenity/late-checkout/rating filters (§6.4)
- [ ] Works in mock mode (no Supabase)

---

## 13. One paragraph for your coding agent

> Build availability-driven search with three inputs: **where** (typeahead over city/neighbourhood from approved inventory, not open geocoding), **check-in**, **check-out**. State lives in the URL (`/?where=&in=&out=`), read server-side in `app/page.tsx` (`await searchParams`, `force-dynamic`). Add a `search_properties(p_where, p_in, p_out)` SQL function that returns `approved` properties matching where (city OR neighbourhood, `ilike`) and, when both dates are given, excludes any property whose `reservations` (non-cancelled) or `availability_blocks` overlap `daterange(in, out, '[)')` — the same overlap logic the GiST constraint enforces on write. Wire `searchProperties()` in `lib/data.ts` with mock-mode parity over seed data, a `/api/locations` typeahead source, and a `SearchBar` client component that pushes URL params (no client fetch of results). Check-in min = today + 14 (PRD §4.2). Render the existing editorial grid for results and a designed empty state (nearby dates / other city / notify-me) when none. Do NOT add amenity/late-checkout/rating filters — PRD §6.4 forbids the faceted-filter UI; search is where + dates only.