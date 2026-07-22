# Fonts

Three typefaces make up the CheckinBliss type system. Each has a distinct role
and should not be swapped without a design decision.

---

## Gallient — display face (DYSA Studio) · self-hosted

**Role:** Hero headlines, pull-quotes, standard section statement, section H2s.
The emotional, editorial voice of the brand.

`@font-face` is declared in `css/main.css`. Files in this folder:

- `Gallient-Regular.woff2` ← primary
- `Gallient-Regular.woff` ← older-browser fallback

```css
--display: "Gallient", "Newsreader", Georgia, serif;
```

**Newsreader** (Google Fonts) remains the fallback — rendered automatically if
Gallient fails to load.

Used on: `hero h1`, `.bigquote p`, `.standard-content p`, section `.intro h2`,
`.works-aside h2`, `.promise h2`, `.closing h2`, `.cat-kicker` (italic),
counter numerals.

---

## DM Sans — body face · SemiBold self-hosted, other weights via Google Fonts

**Role:** All body copy, UI labels, navigation, search bar, buttons, captions,
footer, and the hero tagline. The clean, modern workhorse.

```css
--body: "DM Sans", system-ui, sans-serif;
```

`@font-face` for weight 600 (SemiBold) is declared in `css/main.css`. Files
in this folder:

- `DMSans18pt-SemiBold.woff2` ← weight 600, primary
- `DMSans18pt-SemiBold.woff` ← weight 600, older-browser fallback

Weights 400, 500, 700, and italic 400 are loaded via Google Fonts. To fully
self-host, download the remaining weights from
[Google Fonts](https://fonts.google.com/specimen/DM+Sans), drop them here,
add matching `@font-face` blocks per weight, and remove the `DM+Sans` entry
from the Google Fonts `<link>` in `index.html`.

Used on: `.hero-sub`, all `p`, `.cat-link`, `.cat-text`, nav pills, search
fields, buttons, footer, eyebrow labels, body paragraphs site-wide.

---

## Type hierarchy at a glance

| Level | Font | Variable | Weight | Example |
|---|---|---|---|---|
| Display / Section headings / Quotes | Gallient | `--display` | 400 | "The Premium way to stay in Africa" |
| Card kicker + Card title | Playfair Display | `--heading` | 400 | *Remarkably* · Lagos Lagoon Living |
| Body / UI | DM Sans | `--body` | 400–700 | "Hand-selected luxury apartments…" |

---

## Applying to new pages

Every new page (listing, checkout, about, profile, etc.) should:

- Link the same Google Fonts `<link>` tags from `index.html` (or extract into
  a shared `<head>` partial/component).
- Reference only the three CSS variables above — never hard-code a font-family
  string directly in page-level CSS.
- Follow the hierarchy table: Gallient for hero/section statements, Playfair
  Display for property/collection names, DM Sans for everything else.
