# CheckinBliss — Brand Spec v3.0

## Positioning
The premium way to stay in Africa. Hand-selected apartments, instantly bookable from anywhere. Every property visited in person, photographed editorially, re-verified monthly.

## Voice
Calm, considered, quietly confident. Editorial like a design magazine, not a listings site. Premium through restraint; photography carries the richness.

## Color Tokens

| Token | Value | Role |
|-------|-------|------|
| `--bg` | `#E9ECE2` | Page background — oatmeal-sage |
| `--soft` | `#F4F6F0` | Soft surface / text on dark bands |
| `--card` | `#FCFDFB` | Card / elevated surface |
| `--ink` | `#171915` | Primary text / dark sections |
| `--body-c` | `#44483D` | Body text |
| `--mute` | `#6A6E63` | Labels, metadata, captions |
| `--line` | `#D8DBCF` | Borders, hairline dividers |
| `--green` | `#2F3D2C` | Primary accent — CTAs, dark band |
| `--green-d` | `#232E22` | Accent hover / press |
| `--green-soft` | `#5C6B4F` | Kickers, links, verified status |
| `--trustpilot` | `#00B67A` | Reviews module only (external) |

## Typography

```css
--font-display: 'Gallient', 'Newsreader', Georgia, serif; /* Gallient pending commercial licence (DYSA Studio) */
--font-body: 'Hanken Grotesk', system-ui, -apple-system, sans-serif; /* interim — licensed body face to replace Q3 */
--text-base: 16px; /* single source of truth (provisional — expect to raise once body font lands) */
```

| Role | Spec |
|------|------|
| Hero headline | Display · clamp(2.2rem,4.6vw,4rem) · LH 1.04 |
| Brand statement | Display · clamp(1.9rem,3.6vw,3rem) · italic emphasis in Moss |
| Full-bleed quote | Display italic · up to clamp(2.4rem,5vw,4.2rem) |
| Card kicker + title | Display · 30px · italic kicker (Moss) + title (Ink) |
| Body | Body · 16px default, 19px intro · LH 1.55–1.65 |
| Nav / small body | Body 500–600 · 14–14.5px |
| Eyebrow / label | Body 600 · 15px · uppercase · tracking .12em |

## Spacing (8px base)

| Token | Value | Use |
|-------|-------|-----|
| `--s1`…`--s8` | 4, 8, 12, 16, 20, 24, 28, 32px | Component padding, gaps |
| `--s10`…`--s20` | 40, 48, 64, 80px | Section rhythm |
| section pad | 160px top · 80px bottom | Most sections |
| gutter / container | 32px · 1240px max | Page width |

## Radius

| Value | Use |
|-------|-----|
| 0px | Cards & images |
| 3–4px | Search bar & buttons |
| 10/18px | Inputs / modals |
| 999px | Pills, dots, nodes |

## Shadows

| Token | Value | Role |
|-------|-------|------|
| `--sh1` | 0 1px 2px rgba(23,25,21,0.07) | Subtle lift |
| `--sh2` | 0 8px 24px rgba(23,25,21,0.10) | Floating element |
| `--sh3` | 0 14px 40px rgba(23,25,21,0.14) | Card hover |
| `--sh4` | 0 24px 60px rgba(23,25,21,0.20) | Hero search bar, overlay |

## Components

- **Buttons**: 3px radius. Primary = --green bg on --soft text. Secondary = outline. Hover → --green-d.
- **Nav pills**: Two frosted pills over hero. Left = EN\|USD (hides <560px). Right = menu+account. Logo centered. 1fr auto 1fr grid.
- **Editorial card**: Sharp 3:4 image, italic kicker + serif title (both 30px), link beneath. 1px hairlines. Image zoom 1.04×. Image area identical across sections.
- **Hero search bar**: Long, 4px radius, floating with --sh4. Stacks to one col <760px.
- **Drag carousel**: Horizontal track fixed-size cards, grab cursor, hidden scroll. <760px: 82% card width for peek.
- **Sticky scroll-stack**: Sticky left col (title + counter 01/03 + progress bar). Right = 3 step panels. Mobile: side-line with cumulative nodes.
- **Quote bands**: Full-bleed 100svh, ~42% dark scrim, large italic quote to ~4.2rem.
- **Hidden Trustpilot**: Built but commented out. One review, thin circular arrows, synced dots, fade. Activate ~month 3.

## Landing Page — 12 sections (locked order)

01 Hero — full-viewport image, overlay nav, headline + subhead + search.
02 Welcome — eyebrow, brand statement (italic emphasis), brand story.
03 Category cards — 3 editorial cards, hairline-divided, drag track.
04 Quote band — full-viewport image + scrim + large italic quote.
05 How we choose properties — intro-style differentiation centrepiece.
06 Stays carousel — 6 cards, drag-to-slide, peek of next.
07 How CheckinBliss works — sticky scroll-stack, 3 steps, counter/mobile side-line.
08 Three pillars — "The standard, upheld." Inspected / Ours to present / Mediated.
09 Our standard — eyebrow + big quote (interim). Trustpilot hidden behind.
10 Quote band 2 — full-viewport image + quote.
11 Closing — logo placeholder, wordmark, Verified Hospitality, brand line.
12 Footer — Navigation / Legal / Destinations / Contact + socials (no "Become a Host").

## Responsive Breakpoints

| Width | Change |
|-------|--------|
| 980px | Minor reflow, carousel widens |
| 860px | Scroll-stack → one column + mobile side-line |
| 760px | Cards → 82% drag-peek, search stacks, hero grows |
| 560px | EN\|USD pill hides |
| Hero | 100svh |

## Do / Don't

**Do**: oatmeal-sage breathing room (160px top), Forest green for actions only, display face for headlines/kickers/quotes, sharp-edged editorial imagery + search bar, hairlines not boxes, dark scrim over imagery, body sizing from --text-base.

**Don't**: second accent, display face for body/labels/buttons, Forest green as panel fill, pure #000 or #fff, over-badging verification, hardcoded body sizes, build Lifestyle yet, Trustpilot green outside reviews module.

## Developer Notes

### Fonts — two licensed, self-hosted, token-swappable
Display: Gallient (DYSA Studio), commercial licence, self-host at `/fonts/Gallient.woff2`, Newsreader fallback. Body: a licensed body face will replace Hanken Grotesk (interim fallback). Wire both as `--font-display` and `--font-body` tokens for one-line swaps. Expect to raise `--text-base` once the real body font is in (see Typography §03).

### Imagery — swap points & ratios
Every grey IMAGE block is a swap point. Hero full-bleed 100svh (~16:9, min 2400px). Cards 3:4. Works steps 16:10. Quote bands full-bleed landscape, darker images preferred. Grade warm/natural. `object-fit: cover`, 1× and 2×, lazy-load, link files (no base64) in production.

### Interactions — reproduce + enhance
Port the three vanilla-JS behaviours: drag carousels, scroll-stack with counter/side-line, hidden review nav. Add touch/swipe, keyboard nav, `focus-visible`, scroll-snap. Honour `prefers-reduced-motion`.

### Accessibility
Ink on Sage and Soft on Forest pass WCAG AA for body text. Moss (`#5C6B4F`) is AA for large/bold + marks — pair small verified labels with the glyph, not colour alone. Visible `✦` focus on all controls. Keep scrim on text-over-image.

### Responsive — breakpoints
980px minor reflow · 860px scroll-stack → one column + mobile side-line · 760px cards → 82% drag-peek, search stacks, hero grows to fit · 560px EN\|USD pill hides. Hero uses 100svh. Verify centered-logo nav grid (1fr auto 1fr) on small screens.

### Scope
Stay pillar only. Lifestyle is Year 2 (footer tease, no routes). Hidden Trustpilot module replaces the interim "Our standard" section when reviews exist (~month 3).


## Landing Page — 9 sections (current implementation)

| # | Section | Implementation |
|---|---------|---------------|
| 01 | **Hero** | `app/client.tsx:167`. Full-viewport (`h-screen min-h-[640px]`), background image with overlay, nav pills overlaid, headline "The premium way to stay in Africa", subhead, floating `SearchBar` below. City kicker in `text-lagoon`. |
| 02 | **Category cards** | `app/client.tsx:198`. 3 editorial cards (Lagos / Abuja / Our Picks) in `grid-cols-3` grid, each with city eyebrow, serif title, description in `text-ink-secondary`, "Browse" link. Hairline-divided (`border-l border-line`). |
| 03 | **Search results** | `app/client.tsx:237`. Conditional — only shown when search params present. Property grid from `searchPropertiesAsync`. Empty state with browse-Lagos/Abuja pill links. |
| 04 | **Stays carousel** | `app/client.tsx:265`. 5 featured properties in horizontal scroll-snap carousel. Each card: 3:4 image, italic neighbourhood kicker, serif name, rating + price. "View all stays" link. |
| 05 | **Quote band** | `app/client.tsx:309`. Full-bleed image with `bg-black/52` scrim. Large italic quote in white. `min-h-[480px]`. |
| 06 | **How CheckinBliss works** | `app/client.tsx:328`. `bg-soft`. Sticky left column: "How it works" heading + step counter (`01/03`) + progress bar. Right: 3 step panels (Discover, Book, Arrive). Mobile: collapses to single column. |
| 07 | **Trustpilot reviews** | `app/client.tsx:371`. Trustpilot-branded section with 6 review cards. Header with "4.8 · 340+ reviews" badge. Arrow navigation + 6 dot indicators. Fade transitions. |
| 08 | **Our Promise** | `app/client.tsx:473`. `bg-soft`. 3-column pillar grid: "Inspected in person", "Photographed editorially", "Fixed within the hour". SVG icons per pillar. |
| 09 | **Quote band 2** | `app/client.tsx:496`. Same as quote band 1: full-bleed image, scrim, italic quote. `min-h-[480px]`. |

**Explicitly not implemented from prior spec:** Welcome section (#2), How we choose properties (#5), Closing section (#11). Trustpilot is active (not hidden).

## Responsive Breakpoints

Tailwind defaults (re-declared in `globals.css`):

| Breakpoint | Value | Effect |
|------------|-------|--------|
| `sm` | 640px | Minor padding adjustments |
| `md` | 768px | Category cards stack to single column. Search bar stacks. Scroll-stack collapses to single column. Carousel adjusts. |
| `lg` | 1024px | General layout reflow |
| `xl` | 1280px | Container max-width binding |

No custom breakpoints at 560px, 760px, 860px, or 980px. Hero uses `h-screen` (100vh, not 100svh). No EN\|USD pill on the landing page.

## Do / Don't

**Do**: oatmeal-sage breathing room (80px sections), Forest green (`brass`) for actions only, display face (Newsreader) for headlines/kickers/quotes, sharp-edged editorial imagery + search bar, hairlines not boxes, dark scrim over imagery, body sizing from Inter `font-sans`.

**Don't**: second accent, display face for body/labels/buttons, Forest green as panel fill, pure `#000` or `#fff`, over-badging verification, hardcoded body sizes, build Lifestyle yet (footer teaser only), Trustpilot green outside reviews module.

## Developer Notes

### Fonts — three loaded, two used

Four fonts loaded via next/font in `app/layout.tsx`:
- **Inter** — `--font-sans`, actual body text. Licensed, Google Fonts.
- **Newsreader** — `--font-display`, headlines and card titles. Licensed (Google Fonts / open-source).
- **Playfair Display** — `--font-serif`, alternate serif. Not currently used on landing page. Licensed (Google Fonts / open-source).
- **Hanken Grotesk** — `--font-body`, declared but not used on the storefront. Interim fallback; to be replaced with licensed body face Q3.

Gallient (DYSA Studio) referenced as fallback in `--font-display` but **not loaded**. Wire when commercial licence acquired and `/fonts/Gallient.woff2` is available.

### Imagery — swap points & ratios

Hero: full-bleed `h-screen` (~16:9, min 2400px). Cards: 3:4. Works steps: 16:10. Quote bands: full-bleed landscape, darker images preferred. Grade warm/natural. `object-fit: cover`, lazy-load via next/image patterns.

### Interactions

Scroll-snap carousel for stays (native scroll, no drag). Sticky scroll-stack with IntersectionObserver-based step counter. No drag carousels implemented. Trustpilot reviews have fade transition on arrow/dot click. Arrow keyboard navigation not implemented. `prefers-reduced-motion` not currently honoured.

### Accessibility

Ink on Bone (#171915 on #E9ECE2) passes WCAG AAA (~15.8:1). Bone on Brass (#F4F6F0 on #2F3D2C) passes AA for body text. Lagoon (#5C6B4F) passes AA for large/bold text only — pair small labels with a glyph, not colour alone. Images have `alt` attributes. Hero has `aria-label="Hero"`. Skip-link present on storefront with `#main-content` target. No `focus-visible` outline strategy implemented.

### Scope

Stay pillar only. Lifestyle is Year 2 (footer tease, no routes). Trustpilot is active with 6 reviews — will be replaced with live feed once Trustpilot account is connected.
