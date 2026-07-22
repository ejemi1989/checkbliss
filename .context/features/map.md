# CheckinBliss — Map View (Split Listings Map Pane)

Persistent interactive Mapbox map pane alongside the editorial listing rail on city pages (`/lagos`, `/abuja`) and search results. For a coding agent. Grounded in PRD v2.3: premium browsing experience with a luxury-property map display. Mapbox GL JS v3.26.0.

---

## 1. Principles

- **Map is a browse aid, not a filtering tool.** The map shows property locations and prices — users browse the rail, not the map.
- **Mapbox GL JS client-side only.** Token is `NEXT_PUBLIC_MAPBOX_TOKEN` — a **public** token (`pk.` prefix), never a secret token (`sk.`).
- **Graceful degradation is mandatory.** If no token, wrong token type, or tiles fail to load → show a styled fallback (brand-consistent "Map unavailable" placeholder). Never a broken white/grey canvas.
- **Mobile hides the map entirely** (≤640px: scrolling page, no map). Tablet (≤1080px): map becomes a full-screen overlay toggled by a floating button.

---

## 2. Architecture

### 2.1 Component tree

```
app/(listings)/page.tsx (Server Component, hardcoded props)
  └─ ListingsClient (Client Component)
       └─ MapBox (Client Component, mapbox-gl)
            ├─ Ref: HTMLDivElement (map container)
            ├─ useEffect: initialise Mapbox GL Map
            └─ Fallback: "Map unavailable" when token missing OR tiles fail
```

### 2.2 Token authentication

| Concern | Detail |
|---|---|
| Token var | `NEXT_PUBLIC_MAPBOX_TOKEN` |
| Prefix | **Must** be `pk.` (public token scoped for client-side tile loading) |
| `sk.` prefix | Rejected silently by Mapbox tile CDN — map renders blank |
| URL restriction | Should be restricted to `checkinbliss.vercel.app` + `localhost` in Mapbox dashboard |
| Missing token | Shows "Map unavailable" fallback immediately (never mounts a doomed map) |

### 2.3 Mapbox GL JS lifecycle (`components/map-box.tsx`)

| Phase | Behaviour |
|---|---|
| **Mount** | If `NEXT_PUBLIC_MAPBOX_TOKEN` is falsy → render fallback immediately; never call `new mapboxgl.Map()` |
| **Initialise** | `mapboxgl.accessToken = token` → `new mapboxgl.Map({ container, style: "mapbox://styles/mapbox/light-v11", center, zoom, interactive })` |
| **Markers** | For each `MapMarker`: create an HTML element (pill badge with price label), `new mapboxgl.Marker({ element, anchor: "bottom" }).setLngLat().addTo(map)` |
| **Error** | Listen for `map.on("error")` — if tile/authentication errors occur → unmount the map and show fallback UI |
| **Unmount** | `useEffect` cleanup: remove all markers, `map.remove()` |

---

## 3. Marker design

Property markers are circular pill badges matching the CheckinBliss design tokens:

```
<span style="
  background: var(--color-brass);
  color: var(--color-card);
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0,0,0,.2);
">$240</span>
```

- Label: `$${price}` (from `ListingProperty.price`)
- Default color: `#2F3D2C` (brass)
- Interactive markers show a `Popup` on click (search-results map only)

---

## 4. Map pane layout rules

| Breakpoint | Behaviour |
|---|---|
| Desktop (>1080px) | Split grid: results rail (62.5%) + map pane (37.5%). Both visible. |
| Tablet (≤1080px) | Map is a fixed full-screen overlay, toggled by a floating green pill button ("Show map" / "Hide map") |
| Mobile (≤640px) | Map pane and toggle button hidden (`display: none !important`); no map at all |
| Map pane closeable | Desktop user can toggle the map off with the same "Hide map" button |

---

## 5. Fallback states

| State | Trigger | UI |
|---|---|---|
| No token | `!NEXT_PUBLIC_MAPBOX_TOKEN` | Dark background (`bg-ink/90`), map-pin SVG icon, "Map unavailable" text in `white/40` |
| Map error | `map.on("error", ...)` where error is authentication/network/tile-load | Same fallback as "No token" — replaces the canvas entirely |
| Zero markers | `markers.length === 0` | Map centred on city default (Lagos: 6.4295/3.4219; Abuja: 9.0695/7.4837), no markers |
| Pane hidden | `mapOpen === false` or mobile viewport | `mappane--hidden` class hides the aside |

---

## 6. Implementation checklist

- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN` is a `pk.` (public) token, not `sk.` (secret)
- [ ] Public token URL-restricted in Mapbox dashboard to `checkinbliss.vercel.app` + localhost
- [ ] `map-box.tsx`: fallback renders when token is missing or truthy-falsy
- [ ] `map-box.tsx`: `map.on("error")` handler catches tile/auth errors → shows fallback
- [ ] `map-box.tsx`: cleanup properly removes map instance + markers on unmount/update
- [ ] Markers styled with CheckinBliss design tokens (brass pills, not default Mapbox teardrops)
- [ ] Lagos page shows map centre at 6.4295, 3.4219 with zoom 11
- [ ] Abuja page shows map centre at 9.0695, 7.4837 with zoom 11
- [ ] Desktop: split pane with map visible
- [ ] Tablet: map overlay toggles correctly
- [ ] Mobile: map hidden entirely
- [ ] Map closeable by user on desktop (toggle persists across remounts)
- [ ] Works in mock mode (no token → fallback shown)
