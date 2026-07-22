# CheckinBliss — landing page

This started as a single self-contained HTML mockup and has been split into
a proper local project: real files, a real folder structure, an image
manifest, and font-licensing notes — so it's ready to hand to a developer
who's building out the rest of the site (city pages, property listings,
etc.) on top of it.

## Structure

```
checkinbliss-site/
├── index.html              ← the landing page
├── css/
│   └── main.css            ← design tokens + every style, in source order
├── js/
│   ├── interactions.js     ← drag-to-scroll carousels, review slider, scroll-stack
│   └── parallax.js         ← hero parallax
└── assets/
    ├── fonts/               ← licensed display face goes here (see its README)
    └── images/               ← every photo slot the design needs (see its README)
```

Nothing here needs a build step — open `index.html` in a browser, or serve
the folder with any static server (`npx serve .`, `python3 -m http.server`,
etc.) if you want proper relative-path behaviour during development.

## Design tokens (`css/main.css`, top of file)

Everything visual is driven from one `:root` block:

- **Color** — 9 named variables (`--bg`, `--ink`, `--green`, etc.) forming
  the sage/oatmeal palette. Change these and the whole page re-themes.
- **Type** — `--display` (Gallient → Newsreader → Georgia fallback chain)
  and `--body` (Hanken Grotesk).
- **Spacing** — an 8px-based scale, `--s1` through `--s20`.
- **Radius** — `--r-sm` through `--r-pill`.
- **Shadow** — `--sh1` through `--sh4`, reserved for hover/overlay states only.

If you're building new pages or components, pull values from these
variables rather than hardcoding new colors/sizes — that's what keeps
everything sharing one visual system as the site grows.

## Adding photos

See `assets/images/README.md`. Short version: every placeholder already
has a `data-image="..."` attribute telling you exactly what file it wants
and where — drop the photo in, add the `ph-filled` class + a matching
inline background, done.

## Adding the licensed display font

See `assets/fonts/README.md`. Short version: drop `Gallient.woff2` /
`Gallient.woff` into that folder once licensed. Nothing else changes —
headings pick it up automatically and fall back gracefully until then.

## Building more pages on this system

This is currently a single static HTML file, which is fine for one page but
means the nav and footer would need to be copy-pasted into every new page
you add (city pages, property detail pages, etc.). Two ways to handle that
as the site grows, roughly in order of effort:

1. **Copy-paste, carefully** — for a handful of pages, duplicate `index.html`,
   keep the `<nav>` and `<footer>` blocks byte-for-byte identical across
   files, and share `css/main.css` and `js/` as-is. Simplest option, but the
   nav/footer will drift out of sync over time if edited in only one place.

2. **A tiny static-site generator** — once you're past a handful of pages
   (which, given the planned city → neighbourhood → building → property URL
   structure, will happen fast), pull the `<nav>` and `<footer>` out into
   partials and use something like [Eleventy](https://www.11ty.dev/) or
   [Astro](https://astro.build/) to assemble pages from them. Both can output
   plain static HTML/CSS/JS — you lose nothing from this file structure, you
   just stop hand-copying the nav. This is the better long-term choice given
   how many templated page types are coming (property pages alone will be
   generated from data, not hand-written).

Either way, the CSS/JS/token structure here doesn't need to change — it's
already organized so a developer can build new page templates against it
without touching what's already working.

## Browser support notes

The page uses `backdrop-filter` (frosted-glass nav), CSS custom properties,
and `IntersectionObserver` (scroll-stack progress). All are well-supported
in current browsers; no polyfills included. `prefers-reduced-motion` is
respected in the parallax script.
