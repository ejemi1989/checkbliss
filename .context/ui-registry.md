# UI Registry

Living document. Updated after every component is built. Read this before building any new component — match existing patterns exactly before inventing new ones.

---

## How to Use

Before building any component:

1. Check if a similar component already exists here
2. If yes — match its exact classes and structure
3. If no — build it following `ui-rules.md` and `ui-tokens.md`, then add it here

After building any component — update this file with the component name, file path, and exact classes used.

> **Token rule:** all colors come from the `@theme` tokens in `app/globals.css` (`ink`, `ink-soft`, `bone`, `lagoon`, `lagoon-deep`, `lagoon-mist`, `lagoon-sage`, `brass`, `brass-soft`, `hairline`, `cream`). Use `font-serif` (Playfair Display) and `font-sans` (Inter). **No hardcoded hex** except the two intentional brand exceptions noted below (Trustpilot green, duotone art gradients).

---

## Components Built

### Layout

#### Header

**File:** `app/layout.tsx`

**Usage:** Sticky editorial header on all pages — wordmark, Trustpilot rating, Stays link, currency toggle.

**Structure:**
```tsx
<header className="sticky top-0 z-50 border-b border-hairline bg-white/90 backdrop-blur">
  <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between gap-6 px-6 sm:px-8">
    {/* wordmark + brass dot */}
    {/* trust + Stays + CurrencyToggle */}
  </div>
</header>
```

**Key Classes:**
- Container: `mx-auto flex h-[72px] max-w-[1240px] items-center justify-between gap-6 px-6 sm:px-8`
- Sticky bar: `sticky top-0 z-50 border-b border-hairline bg-white/90 backdrop-blur`
- Wordmark: `font-serif text-[21px] font-semibold tracking-[0.04em]`
- Brass dot: `ml-2 inline-block h-[7px] w-[7px] -translate-y-px rounded-full bg-brass`
- Trust label: `hidden items-center gap-2 text-xs text-ink-soft sm:flex` (stars: `tracking-[1px] text-[#00b67a]` — Trustpilot green, intentional exception)
- Nav link: `hidden text-[13px] uppercase tracking-[0.06em] text-ink-soft hover:text-ink sm:block`

---

#### Footer

**File:** `app/layout.tsx`

**Usage:** Minimal single-row footer on all pages.

**Key Classes:**
- Container: `border-t border-hairline px-6 py-12 text-[12.5px] text-ink-soft sm:px-8`
- Inner: `mx-auto flex max-w-[1240px] flex-wrap justify-between gap-6`

---

### Currency

#### CurrencyToggle

**File:** `components/currency.tsx` (`"use client"`)

**Usage:** GBP/USD/EUR display toggle in the header. Display-only — does not affect charged amount.

**Structure:**
```tsx
<div className="flex overflow-hidden rounded-full border border-hairline" role="group" aria-label="Display currency">
  {/* one button per currency */}
</div>
```

**Key Classes:**
- Container: `flex overflow-hidden rounded-full border border-hairline`
- Button: `px-3.5 py-1.5 text-xs tracking-[0.05em] transition-colors`
- Active: `bg-ink text-white`
- Inactive: `text-ink-soft hover:text-ink`

**A11y:** `role="group"`, `aria-label`, `aria-pressed` per button.

---

#### Price

**File:** `components/currency.tsx` (`"use client"`)

**Usage:** Renders a GBP-minor amount in the selected display currency. Use everywhere money is shown.

**Usage:**
```tsx
<Price minor={p.nightly_rate_minor} />
<Price minor={p.deposit_minor} className="font-serif text-3xl font-medium" />
```

**Props:** `minor: number` (GBP pence), `className?: string`

---

### Property

#### PropertyCard

**File:** `components/property-card.tsx`

**Usage:** Property item in the storefront grid. PRD 6.5 hierarchy — price → name → location → meta row.

**Structure:**
```tsx
<Link href={`/stays/${p.slug}`} className="group block md:col-span-2">
  <div className="relative overflow-hidden bg-bone aspect-[4/3]">
    <EditorialArt p={p} />
  </div>
  {/* price / name / location / meta */}
</Link>
```

**Key Classes:**
- Wrapper: `group block` + `md:col-span-3` (feature) / `md:col-span-2` (standard)
- Art frame: `relative overflow-hidden bg-bone` + `aspect-[16/10]` (feature) / `aspect-[4/3]` (standard)
- Price row: `mt-4 text-[13px] tracking-[0.05em]` (suffix `text-ink-soft`)
- Name: `mt-1.5 font-serif font-medium leading-tight` + `text-3xl` (feature) / `text-2xl` (standard)
- Location: `mt-1 text-[13px] tracking-[0.03em] text-ink-soft`
- Meta row: `mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-soft`
- Late-checkout indicator: `inline-flex items-center gap-1.5` + dot `h-[5px] w-[5px] rounded-full bg-brass` (same weight as bedroom count — never a filter)

---

#### EditorialArt

**File:** `components/property-card.tsx`

**Usage:** Duotone placeholder art per property until photography lands. Uses `hero_hues` (intentional inline gradient — not a token).

**Key Classes:**
- Layer: `grain absolute inset-0 grid place-items-center transition-transform duration-700 ease-out group-hover:scale-[1.045]`
- Monogram: `select-none font-serif text-[104px] italic text-white/35`
- Background: inline `radial-gradient(...) , linear-gradient(160deg, {a}, {b})` from `hero_hues` (brand exception to the no-hex rule — per-property art)
- Grain overlay: `.grain::after` defined in `app/globals.css`

---

### Storefront (page sections)

> Built inline in `app/page.tsx` (not yet extracted to components). Documented for extraction.

#### Hero

**File:** `app/page.tsx`

**Key Classes:**
- Section: `relative mx-auto max-w-[1240px] px-6 pb-16 pt-20 sm:px-8 sm:pt-24`
- Eyebrow: `mb-6 flex items-center gap-3.5 text-xs uppercase tracking-[0.22em] text-brass`
- Heading: `max-w-[13ch] font-serif text-[clamp(40px,6.4vw,76px)] leading-[1.06] tracking-[-0.01em]` (emphasis `italic text-lagoon`)
- Subtext: `mt-7 max-w-[46ch] font-light text-ink-soft`
- Stat value: `mb-0.5 block font-serif text-[22px] font-medium text-ink`
- Rotating seal: `motion-safe:animate-[spin_28s_linear_infinite]` (textPath; disabled under reduced-motion)

#### City Tabs

**File:** `app/page.tsx`

**Key Classes:**
- Bar: `mx-auto flex max-w-[1240px] items-center gap-2.5 border-b border-hairline px-6 pb-7 sm:px-8`
- Tab: `rounded-full border px-4.5 py-2 text-[13px] tracking-[0.04em] transition-colors`
- Active: `border-ink text-ink` / Inactive: `border-transparent text-ink-soft hover:text-ink`
- Count: `ml-auto text-xs tracking-[0.05em] text-ink-soft`

#### Property Grid

**File:** `app/page.tsx`

**Key Classes:**
- Section: `mx-auto max-w-[1240px] px-6 py-14 sm:px-8`
- Grid: `grid grid-cols-1 gap-x-7 gap-y-10 sm:grid-cols-2 md:grid-cols-6`

#### Brand Interlude

**File:** `app/page.tsx`

**Key Classes:**
- Section: `bg-lagoon px-6 py-20 text-cream sm:px-8`
- Grid: `mx-auto grid max-w-[1240px] items-center gap-16 md:grid-cols-2`
- Heading: `font-serif text-[clamp(28px,3.6vw,44px)] leading-[1.15]` (emphasis `italic text-brass-soft`)
- Pillar item: `py-5 border-b border-cream/15` (first adds `border-t`)
- Pillar title: `font-serif text-lg font-medium` / body: `mt-1 text-[13px] text-lagoon-mist`

---

### Property Detail (page sections)

> Built inline in `app/stays/[slug]/page.tsx`.

#### Detail Header

**Key Classes:**
- Back link: `text-[13px] tracking-[0.04em] text-ink-soft hover:text-ink`
- Name: `font-serif text-[clamp(34px,4.6vw,54px)] font-medium leading-[1.08]`
- Meta: `mt-2.5 text-sm tracking-[0.04em] text-ink-soft`
- Price: `font-serif text-3xl font-medium` + label `text-xs uppercase tracking-[0.08em] text-ink-soft`

#### Gallery

**Key Classes:**
- Grid: `grid h-auto grid-cols-1 gap-3.5 md:h-[480px] md:grid-cols-3 md:grid-rows-2`
- Primary cell: `md:col-span-2 md:row-span-2`
- Cell: `group relative overflow-hidden bg-bone`

#### Prose Section

**Key Classes:**
- Section: `border-b border-hairline py-10` (first `pb-10`)
- Eyebrow: `mb-4 text-[11.5px] uppercase tracking-[0.2em] text-brass`
- Body: `max-w-[60ch] font-light text-ink-soft`
- Amenities list: `grid grid-cols-1 gap-x-8 gap-y-3 text-sm text-ink-soft sm:grid-cols-2` (bullet `text-xl leading-none text-brass`)

#### Checkout Options

**Key Classes:**
- Row: `flex items-baseline justify-between py-4 text-sm` (divider `border-b border-hairline`)
- Note: `mt-3 text-[12.5px] font-light text-ink-soft`

#### Route Callout

**Key Classes:**
- Box: `border-l-2 border-brass bg-bone px-6 py-5 text-[13.5px] font-light text-ink-soft`

#### Booking Panel

**Key Classes:**
- Aside: `h-fit rounded-sm bg-lagoon p-8 text-cream md:sticky md:top-[104px]`
- From label: `text-xs uppercase tracking-[0.14em] text-lagoon-mist`
- From price: `mt-1.5 font-serif text-[34px] font-medium`
- Line: `flex justify-between text-[13px] text-lagoon-sage`
- Divider: `my-5 border-cream/20`
- CTA: `block w-full bg-brass-soft py-4 text-center text-[13px] font-medium uppercase tracking-[0.14em] text-lagoon-deep transition-opacity hover:opacity-90`
- Reassurance: `mt-4 text-xs font-light leading-relaxed text-lagoon-mist`

---

## Rules

**Before adding a new component to this registry:**

1. Component file exists and is exported (named export)
2. All Tailwind classes documented exactly
3. Colors via `@theme` tokens (no hardcoded hex except the two brand exceptions)
4. Money rendered via `<Price>`; never hardcode a currency symbol
5. Tested at mobile and desktop breakpoints; `prefers-reduced-motion` respected for any motion

**When updating a component:**

1. Update this registry at the same time
2. Document exact class changes
3. Update dependent components

**Intentional hex exceptions (do not "fix" to tokens):**
- Trustpilot star green `#00b67a` — external brand colour
- `EditorialArt` duotone gradients from `hero_hues` — per-property generated art

---

## Pages Built

| Page | Route | File | Status |
|------|-------|------|--------|
| Storefront | `/` | `app/page.tsx` | ✅ built |
| Property detail | `/stays/[slug]` | `app/stays/[slug]/page.tsx` | ✅ built |
| Booking (wrapper) | `/book/[slug]` | `app/book/[slug]/page.tsx` | ✅ server wrapper; client flow pending |

---

## Pending Components

_Planned, not yet built — follow the patterns above when building._

- **BookingFlow** (`components/booking-flow.tsx`) — 3-step client flow (dates/guest → checkout option → payment). Reuse `<Price>`, hairline borders, lagoon panel for the payment summary.
- **Confirmation** (`app/confirmation/[reference]/page.tsx`) — reference, per-stay summary, deposit explainer. Reuse prose-section + lagoon panel patterns.
- **AdminClaimQueue + ClaimDetail** (`app/admin/claims/page.tsx`) — table + detail with Approve/Adjust/Reject. New table pattern to register when built.
- **AvailabilityCalendar** — date-range picker fed by `property_unavailable_ranges()`; constrained by the 14-day rule.
- **Toast** — booking success/failure ("nothing was charged"), validation feedback. Bottom-center, auto-dismiss.
- **Empty / loading / error states** — for inventory and booking surfaces.

When any of these is built: add its file path, structure, and exact classes here, and tick it off in `progress-tracker.md`.