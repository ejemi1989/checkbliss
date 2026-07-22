# Image manifest

Every gap in the design is a `<div class="ph">` (a soft green gradient with an
"IMAGE" label). Each one now carries a `data-image="assets/images/..."`
attribute in `index.html` telling you exactly which file it's waiting for and
where it lives. The hero is already wired up as the reference example.

## How to drop in a real photo

1. Save the photo at the path in its `data-image` attribute (create the
   folder if it isn't there yet).
2. In `index.html`, add `ph-filled` to the element's class list and set an
   inline background, matching the hero:

   ```html
   <!-- before -->
   <div class="ph" data-image="assets/images/stays/lagos-lagoon-living.jpg"></div>

   <!-- after -->
   <div class="ph ph-filled" data-image="assets/images/stays/lagos-lagoon-living.jpg"
        style="background-image:url('assets/images/stays/lagos-lagoon-living.jpg')"></div>
   ```

   `ph-filled` (defined in `css/main.css`) switches the placeholder from
   "gradient + label" to "cover-fit background photo," so nothing else needs
   to change.
3. Run every photo through `premium_grade.py` (see Claude's memory of this
   project, or ask Claude to regenerate it) so everything shares the same
   grade — Plum Guide / The Modern House / AD, not straight-out-of-camera.

## The manifest

| Path | Section | Notes |
|---|---|---|
| `hero/hero-01.jpg` | Hero background | Already wired up. Currently a stock placeholder pulled out of the original mockup — swap for a real Lagos/Abuja apartment shot before launch. Wide, cinematic, 3:2 or wider, ≥2000px. |
| `cats/lagos.jpg` | "Remarkably Lagos" teaser card | Portrait-ish crop, 4:5 |
| `cats/pool.jpg` | "Apartments with a Pool" teaser card | 4:5 |
| `cats/abuja-calm.jpg` | "Calmly Abuja" teaser card | 4:5 |
| `quotes/bigquote-bg.jpg` | First full-bleed quote background | Wide, moody, works with a dark overlay |
| `stays/lagos-lagoon-living.jpg` | Stays carousel — Lagoon Living (Lagos) | 4:5 |
| `stays/abuja-hills-hush.jpg` | Stays carousel — Hills & Hush (Abuja) | 4:5 |
| `stays/private-pools.jpg` | Stays carousel — Private Pools | 4:5 |
| `stays/maisonettes.jpg` | Stays carousel — Maisonettes | 4:5 |
| `stays/banana-island.jpg` | Stays carousel — Banana Island (Lagos) | 4:5 |
| `stays/asokoro-calm.jpg` | Stays carousel — Asokoro Calm (Abuja) | 4:5 |
| `works/step-1-browse.jpg` | "How it works" — Browse | 1:1 or 4:5 |
| `works/step-2-book.jpg` | "How it works" — Book | 1:1 or 4:5 |
| `works/step-3-arrive.jpg` | "How it works" — Arrive | 1:1 or 4:5 |
| `promise/inspected.jpg` | "The standard, upheld" — Inspected | 4:5 |
| `promise/ours-to-present.jpg` | "The standard, upheld" — Ours to present | 4:5 |
| `promise/mediated.jpg` | "The standard, upheld" — Mediated | 4:5 |
| `quotes/quote2-bg.jpg` | Second full-bleed quote background | Wide, moody |

`logo/` and `testimonials/` are set up for later — the current design uses a
text-based logo mark and a Trustpilot-style review widget rather than photos,
but keep them here for a real wordmark and guest headshots when ready.
