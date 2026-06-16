# CheckinBliss — UI Rules & Design System

## Visual Identity
- **Brand name**: checkinBliss (lowercase `c`, uppercase `B`)
- **Tagline**: "Moments that move you."
- **Audience**: Culture, travel, and event-goers seeking Afro-centric experiences (festivals, fashion weeks, carnival)
- **Tone**: Curated, confident, warm-modern

## Color System

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `oklch(97% 0.005 280)` | Page background (light lavender-gray) |
| `--surface` | `oklch(100% 0 0)` | Cards, inputs, dropdowns |
| `--fg` | `oklch(18% 0.015 280)` | Primary body text |
| `--muted` | `oklch(50% 0.015 280)` | Secondary text, labels, placeholder |
| `--border` | `oklch(90% 0.008 280)` | Dividers, input borders, card outlines |
| `--accent` | `oklch(52% 0.16 255)` | Primary buttons, active filters, links |
| `--accent-light` | `oklch(62% 0.14 255)` | Button hover state |
| `--accent-dark` | `oklch(42% 0.16 255)` | Gradient edge on search CTA |
| `--star` | `#f59e0b` | Rating stars |
| **Logo accent** | `oklch(68% 0.14 255)` | checkin<span>Bliss</span> span |

All interactive colors are blue-hued (255° hue in OKLch). No purple, no emoji in UI.

## Typography

- **Font**: `Inter` (Google Fonts), 300–900 weights
- **Display**: 800 weight, tight letter-spacing -2px at hero scale
- **Body**: 400 weight, system default line-height
- **Eyebrow**: 600 weight, 2.5px letter-spacing, uppercase, 11–13px
- **Price**: 700 weight, 17px
- **Price per-person label**: 400 weight, 12px, muted

## Spacing & Layout Tokens

| Token | Value |
|-------|-------|
| `--radius-sm` | 8px |
| `--radius-md` | 16px |
| `--radius-lg` | 24px |
| `--radius-full` | 9999px |
| `--ease-out` | `cubic-bezier(0.33, 1, 0.68, 1)` |
| Container max | 1280px |

## Radius Rules
- **Buttons** → always `--radius-full` (pill)
- **Cards** → `--radius-md` (16px)
- **Search card** → `--radius-lg` (24px) desktop, `--radius-md` mobile
- **Inputs** → `--radius-sm` (8px)

## Component Patterns

### Navigation
- Absolute-positioned over hero, white text
- Logo: `font-size: 22px, font-weight: 700`
- Actions: translucent glass buttons (`rgba(255,255,255,0.1)` backdrop-blur)
- Primary CTA: accent fill
- Mobile: hide action buttons, show hamburger (☰)

### Hero
- Height: `clamp(440px, 62vh, 580px)`, dark background fallback
- Background image: `brightness(0.4) saturate(1.1)`
- Overlay gradient: transparent → 65% black
- Eyebrow above title in accent color
- Title: `clamp(38px, 5.5vw, 68px)` 800 weight, -2px letter-spacing
- Search card: translucent white (`0.95`), backdrop-blur, 3-column grid (location / date / button)

### Buttons
- All pill-shaped (`--radius-full`)
- Primary CTA: accent fill, white text, `box-shadow` glow on hover
- "Book now" in cards: accent fill, white text, 12px font
- "Load more": outlined with border, hover turns accent
- Filter chips: outlined by default, accent fill when `.active`

### Event Cards
- White surface, 1px border, `--radius-md`
- Hover: translateY(-4px), soft shadow, image scales 1.04x
- Image: 200px height, object-fit cover
- Rating: star icon (★) in #f59e0b, 12px muted text
- Title: 16px 700 weight
- Location: 13px muted, pin icon
- Footer: border-top divider, price left, "Book now" right
- Tag: absolute overlay on image, dark glass background, uppercase 10px

### Filters
- Row of pill chips + "Sort" dropdown
- Active chip gets accent fill
- Responsive wrap on small screens

### Grid
- 3 columns desktop, 2 tablet, 1 mobile
- 4 columns at 1440px+
- 20px gap

### Footer
- Dark surface (`#1a1a1e`), 4-column grid
- Uppercase 12px headings, 13px links
- Bottom bar with logo + copyright

## Responsive Behavior
| Breakpoint | Layout Changes |
|------------|----------------|
| < 640px | 1-col grid, stacked search card, hide nav actions, show hamburger |
| 640–900px | 2-col event grid |
| 900–1024px | 2-col search card layout (button spans full) |
| 1024–1440px | 3-col event grid |
| 1440px+ | 4-col event grid |
| < 768px | Footer collapses to 2-col |
| < 480px | Footer collapses to 1-col |

## JS Behavior
- **Event data**: inline array with id, title, location, rating, reviews, price, cat, img, tag
- **Filter**: category chips filter the grid, active state toggled
- **Search**: location input filters by city/title match
- **Pagination**: shows 6 initially, "Load more" adds 3
- **Date input**: `onfocus` switches type to "date" for native picker
- **Empty state**: "No events match" message when filter returns 0

## Anti-Patterns (Don't)
- No purple/violet gradients (accent is blue)
- No emoji feature icons (★ star is the only icon)
- No hand-drawn SVG illustrations
- No generic "Feature One / Feature Two" filler
- No rounded cards with left colored border accent
- No beige/peach/warm canvas backgrounds
- No card shadow on static state (only on hover)



# CheckinBliss — UI Rules

> SaaS dashboard system. Three role surfaces (owner / operator / admin) sharing one visual language. Blue-purple (indigo) primary, white canvas, minimal ornament.

---

## 1. Color

### Palette (canonical)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `oklch(99.5% 0.003 275)` | Page background (near-white, not grey) |
| `--surface` | `oklch(100% 0 0)` | Card, sidebar, topbar |
| `--fg` | `oklch(18% 0.015 275)` | Primary text |
| `--muted` | `oklch(48% 0.012 275)` | Secondary text, labels |
| `--border` | `oklch(91% 0.006 275)` | Hairline borders on cards/sections |
| `--primary` | `oklch(55% 0.18 275)` | Actions, active nav, links |
| `--primary-hover` | `oklch(50% 0.20 275)` | Button hover state |
| `--primary-bg` | `oklch(55% 0.04 275)` | Subtle primary tint (badge bg, info bars) |
| `--accent` | `oklch(58% 0.14 275)` | Secondary highlight |
| `--success` | `oklch(55% 0.18 275)` | Approved / success states (brand primary) |
| `--warning` | `oklch(60% 0.15 85)` | Amber states |
| `--danger` | `oklch(55% 0.18 25)` | Red states |

### Rules

- **No grey/zinc/neutral fills.** Body background is the near-white canvas (`oklch(99.5% 0.003 275)`), not zinc/grey. Cards and surfaces are pure white.
- **No tinted background on status pills.** All status badges use `background: transparent` — colored text only. The `.status-pill` class enforces this.
- **No filled icon containers.** Never wrap an icon in a 36px rounded-square background box.
- **Blue-purple is the only action color.** Success uses the brand primary (`--primary`); danger (red) is status signal, not an action fill.

---

## 2. Typography

- **Font:** `Inter` everywhere (display + body). Configured via Tailwind `fontFamily.sans`.
- **Scale:**
  - Page title: `text-2xl` / `text-3xl` (`clamp(1.25rem, 2.5vw, 1.875rem)`), `font-bold`, `tracking-tight`
  - Section title: `text-base`, `font-bold`
  - Card stats: `text-2xl`, `font-bold`, `tabular-nums`
  - Body/metadata: `text-xs` / `text-sm`, muted color
  - Tab labels: `text-sm`, `font-medium`
- **Tabular numerics** (`font-variant-numeric: tabular-nums`) on all financial values, counts, and metrics.
- **No hero or display type.** SaaS density — information is the feature.

---

## 3. Icons

- **Thin-stroke SVG only** (`stroke-width="1.5"` or `"2"`, `stroke-linecap="round"`). Never use filled/heavy icons.
- **No Font Awesome** for final UI. Lucide-style inline SVGs preferred.
- **No decorative icon containers.** Icons sit directly in the layout, never in a rounded box.
- **No icons inside buttons.** Action buttons are text-only.
- **Allowed icon use:** Navigation items, empty states, calendar/booked indicators, close/hamburger/chevron controls.

---

## 4. Button System

All buttons follow the **minimalist outline** style:

```
border: 1px solid <color>
background: transparent
color: <color>
border-radius: 12px
padding: 8px 16px (or proportionally larger)
font-size: 13-14px
font-weight: 500-600
hover: background tint (e.g. hover:bg-blue-50)
```

### Button variants

| Style | Border | Text | Hover bg |
|-------|--------|------|----------|
| Primary action | `--primary` | `--primary` | `--primary-bg` |
| Danger action | `--danger` | `--danger` | `oklch(55% 0.04 25)` |
| Default | `--border` | `--muted` | `oklch(55% 0.04 275)` |
| Inline link | none | `--primary` | none |

- No filled buttons (no `bg-emerald-600`, no `bg-blue-600` fills).
- No icon+button combos.
- Pill shape (`rounded-xl` to `rounded-2xl`) depending on context.

---

## 5. Status Badges

```
font-size: 11px
padding: 2px 10px
border-radius: 999px
font-weight: 600
background: transparent   ← never tinted
letter-spacing: 0.02em
```

| State | Color |
|-------|-------|
| Active / Approved / Paid | `--success` |
| Pending / Processing | `--primary` (blue-purple) |
| Suspended / Rejected / Failed | `--danger` |
| Draft / Resubmitted | `--muted` |

---

## 6. Cards & Containers

```
background: white
border-radius: 12px (rounded-xl)
border: 1px solid --border
padding: 20px (p-5)
```

- **No shadows.** Depth comes from border separation, not elevation.
- **Hover lift** (`translateY(-2px)` + subtle shadow) only on stat cards and project cards — not on list items.
- **List items** use hover background tint (hover on `oklch(97% 0.005 275)`) not lift.
- **Tab bars** use a 2px bottom border underline for active state, no pill/tab background fills.

---

## 7. Layout

- **Sidebar + topbar + content grid** — the standard SaaS shell.
- Sidebar: 256px (`w-64`), white, border-right. Role switcher pills in a segmented control.
- Topbar: `h-14`, white, border-bottom. Hamburger on mobile, title, help icon.
- Content: `flex-1 overflow-auto`, padded `p-4 lg:p-8`.
- Responsive: sidebar slides out on mobile via absolute positioning + transform, with overlay backdrop.

---

## 8. Interactions

| Element | Behavior |
|---------|----------|
| Stat card hover | `translateY(-2px)`, `box-shadow: 0 8px 24px rgba(0,0,0,0.06)` |
| List item hover | Background tint `oklch(97% 0.005 275)` |
| Button hover | Background tint only |
| Modal open | `scale(0.97) + translateY(8px)` → `scale(1) + translateY(0)`, 200ms ease |
| Modal overlay | `rgba(0,0,0,0.3)`, `backdrop-filter: blur(4px)` |
| Section enter | `translateY(-6px)` → `translateY(0)`, 250ms ease |
| Sidebar open (mobile) | `translateX(-100%)` → `translateX(0)`, 300ms cubic-bezier |
| Escape key | Closes all open modals |

---

## 9. Data Display

- **Financial values:** Naira symbol (`₦`), `tabular-nums`, right-aligned in tables.
- **Percentages:** Rounded to whole number, `tabular-nums`.
- **Empty states:** Short honest placeholder (`—`, grey block, labelled stub). Never invent fake data.
- **Tables:** No row striping. Hairline borders between rows. Hover tint on rows.

---

## 10. Anti-Patterns (Blocked)

- ❌ Grey/zinc page backgrounds
- ❌ Filled buttons of any color
- ❌ Icons inside buttons
- ❌ Icon background containers (36px rounded squares behind icons)
- ❌ Tinted status badge backgrounds (transparent only)
- ❌ Font Awesome icons in final UI (use thin-stroke SVGs)
- ❌ Hero imagery or marketing copy on dashboard surfaces
- ❌ Shadows on cards (use borders for separation)
- ❌ Gradient backgrounds
- ❌ Generic feature icons (emojis, filled symbols)

---

## 11. Surface Separation (PRD §8.1)

| Audience | Primary Surface | Web Role |
|----------|----------------|----------|
| Owner | WhatsApp | Minimal (calendar, bookings, consolidated earnings) |
| Operator | WhatsApp (field) + Web (review) | Curation, pipeline, inspection, verification |
| Admin | Web only | Platform overview, claims, operators, finance, audit |

No audience sees another audience's controls. Multi-unit owners see all units consolidated on one dashboard with consolidated payouts.

---

## 12. Responsive Breakpoints

- 360px: Single column, sidebar hidden, stacked stats (2-col grid)
- 640px: 2-col stats, single-col content
- 1024px: Sidebar visible, 4-col stats, 2-col content split
- 1280px+: 3-col project grids, full content split
- 1920px: Max-width container (1600px) centered

No horizontal scroll at any supported breakpoint.
