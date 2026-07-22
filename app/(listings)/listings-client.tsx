"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import Link from "next/link";

/* ---------- Data ---------- */
export interface ListingProperty {
  id: string;
  kicker: string;
  title: string;
  meta: string;
  tags: string[];
  price: number;
  beds: number;
  img?: string;
  href?: string;
  lat: number;
  lng: number;
}

export interface ListingsPageProps {
  city: "Lagos" | "Abuja";
  eyebrow: string;
  properties: ListingProperty[];
  totalCount: number;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

/* ---------- Component ---------- */
export function ListingsClient({ city, eyebrow, properties, totalCount }: ListingsPageProps) {
  const [filter, setFilter] = useState<"all" | "1-2-beds" | "3-4-beds" | "5-plus">("all");
  const [tags, setTags] = useState<string[]>([]);
  const [sort, setSort] = useState<"featured" | "price-asc" | "price-desc">("featured");
  const [mapOpen, setMapOpen] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);

  const visible = properties.filter((p) => {
    if (filter === "1-2-beds" && !(p.beds >= 1 && p.beds <= 2)) return false;
    if (filter === "3-4-beds" && !(p.beds >= 3 && p.beds <= 4)) return false;
    if (filter === "5-plus" && !(p.beds >= 5)) return false;
    if (tags.length > 0 && !tags.every((t) => p.tags.includes(t))) return false;
    return true;
  });

  const sorted = [...visible].sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    return 0;
  });

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current || !window.mapboxgl) return;
    try {
      window.mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new window.mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: city === "Lagos" ? [3.4219, 6.4295] : [7.4837, 9.0695],
        zoom: 11,
      });
      mapRef.current = map;

      // Add markers
      const markers = properties.map((p) => {
        const el = document.createElement("div");
        el.className = "map-pin";
        el.textContent = `$${p.price}`;
        const marker = new window.mapboxgl.Marker(el).setLngLat([p.lng, p.lat]).addTo(map);
        return marker;
      });
      markersRef.current = markers;
    } catch (err) {
      console.warn("Mapbox init failed:", err);
    }

    return () => {
      markersRef.current.forEach((m) => m.remove());
      mapRef.current?.remove();
    };
  }, [city, properties]);

  const toggleTag = (t: string) => {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  return (
    <>
      <Script id="cb-mapbox-token" strategy="beforeInteractive">
        {`window.__CB_MAPBOX_TOKEN__=${JSON.stringify(MAPBOX_TOKEN)};`}
      </Script>
      <Script src="https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js" strategy="afterInteractive" />
      <Script src="/js/listings.js" strategy="afterInteractive" />
      <Script src="/js/interactions.js" strategy="afterInteractive" />

      <header className="lst-header">
        <nav>
          <div className="wrap nav-inner">
            <div className="nav-side nav-left"></div>
            <Link href="/" className="logo" aria-label="CheckinBliss home">
              <img src="/assets/images/logo/logo-wrd.png" alt="CheckinBliss" className="logo-img" />
            </Link>
            <div className="nav-side nav-right">
              <button className="lang-pill" aria-label="Language and currency">EN <span className="divider">|</span> USD</button>
              <Link href="/login" className="menu-pill" aria-label="Menu and account">
                <span className="burger"><span></span><span></span><span></span></span>
                <span className="avatar">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="9" r="3.2" />
                    <path d="M5.5 19c.6-3.2 3.2-5 6.5-5s5.9 1.8 6.5 5" />
                    <circle cx="12" cy="12" r="10.2" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <div className="searchband" id="searchBand">
        <div className="searchband-inner">
          <form className="sbar" role="search" onSubmit={(e) => e.preventDefault()}>
            <label className="sbar-field">
              <span className="sbar-label">Where</span>
              <input type="text" defaultValue={city} aria-label="Destination" />
            </label>
            <label className="sbar-field">
              <span className="sbar-label">When</span>
              <input type="text" placeholder="Add dates" aria-label="Dates" />
            </label>
            <label className="sbar-field sbar-field-last">
              <span className="sbar-label">Who</span>
              <input type="text" placeholder="Add guests" aria-label="Guests" />
              <button className="sbar-go" aria-label="Search stays" type="submit">
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="8.5" cy="8.5" r="5.5" />
                  <path d="M12.8 12.8 17 17" />
                </svg>
              </button>
            </label>
          </form>
          <button
            className="filter-btn"
            aria-expanded={filterOpen}
            aria-controls="filterPanel"
            onClick={() => setFilterOpen((v) => !v)}
            type="button"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M2 4h12M4 8h8M6 12h4" />
            </svg>
            Filter &amp; sort
          </button>
        </div>

        <div className="filter-panel" id="filterPanel" hidden={!filterOpen}>
          <div className="filter-panel-inner">
            <div className="fgroup">
              <span className="fgroup-label">Bedrooms</span>
              <div className="filter-chips">
                {[
                  { id: "all", label: "All" },
                  { id: "1-2-beds", label: "1–2" },
                  { id: "3-4-beds", label: "3–4" },
                  { id: "5-plus", label: "5+" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    className={`fchip ${filter === opt.id ? "active" : ""}`}
                    onClick={() => setFilter(opt.id as any)}
                    type="button"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="fgroup">
              <span className="fgroup-label">Features</span>
              <div className="filter-chips">
                {["pool", "gym", "workspace"].map((t) => (
                  <button
                    key={t}
                    className={`fchip ${tags.includes(t) ? "active" : ""}`}
                    onClick={() => toggleTag(t)}
                    type="button"
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="fgroup">
              <span className="fgroup-label">Sort by</span>
              <div className="filter-chips">
                {[
                  { id: "featured", label: "Featured" },
                  { id: "price-asc", label: "Price low to high" },
                  { id: "price-desc", label: "Price high to low" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    className={`schip ${sort === opt.id ? "active" : ""}`}
                    onClick={() => setSort(opt.id as any)}
                    type="button"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="split">
        <section className="results" id="resultsPane" aria-label={`${city} apartments`}>
          <div className="results-inner">
            <header className="results-head">
              <nav className="lst-breadcrumb" aria-label="Breadcrumb">
                <Link href="/">Home</Link><span className="sep">/</span><span>{city}</span>
              </nav>
              <div className="lst-eyebrow">{eyebrow}</div>
              <h1 className="lst-city">{city}</h1>
              <p className="results-count">
                <strong>{sorted.length}</strong> of {totalCount} apartments
              </p>
            </header>

            <div className="results-list" id="listingsGrid">
              {sorted.map((p) => (
                <Link
                  key={p.id}
                  href={p.href ?? `/${city.toLowerCase()}/${p.kicker.toLowerCase().replace(/\s+/g, "-")}/${p.title.toLowerCase().replace(/\s+/g, "-")}`}
                  className="pcard"
                  data-beds={p.beds}
                  data-price={p.price}
                  data-tags={p.tags.join(" ")}
                  data-lat={p.lat}
                  data-lng={p.lng}
                  data-id={p.id}
                >
                  <div className="pcard-img">
                    <div
                      className={`ph ${p.img ? "ph-filled" : ""}`}
                      style={p.img ? { backgroundImage: `url('${p.img}')` } : {}}
                    ></div>
                  </div>
                  <div className="pcard-body">
                    <div className="pcard-kicker">{p.kicker}</div>
                    <h2 className="pcard-title">{p.title}</h2>
                    <div className="pcard-meta">{p.meta}</div>
                    {p.tags.length > 0 && (
                      <div className="pcard-tags">
                        {p.tags.map((t) => (
                          <span key={t} className="pcard-tag">
                            {t === "pool" ? "Pool" : t === "gym" ? "Gym" : t === "workspace" ? "Workspace" : t === "free-cancellation" ? "Free cancellation" : t === "late-checkout" ? "Late checkout" : t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="pcard-footer">
                      <span className="pcard-price">${p.price}</span>
                      <span className="pcard-per">/ night</span>
                    </div>
                  </div>
                </Link>
              ))}

              {sorted.length === 0 && (
                <p className="no-results" id="noResults">
                  No apartments match this filter. Clear a filter to see more of {city}.
                </p>
              )}
            </div>

            <nav className="pager" aria-label="Pagination">
              <span className="pager-range">
                <strong>1–{sorted.length}</strong> of {sorted.length} apartments
              </span>
              <div className="pager-btns">
                <button className="pager-btn" disabled aria-label="Previous page" type="button">
                  <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 3 5 8l5 5" />
                  </svg>
                  Prev
                </button>
                <button className="pager-btn" disabled aria-label="Next page" type="button">
                  Next
                  <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3l5 5-5 5" />
                  </svg>
                </button>
              </div>
            </nav>

            <footer className="rail-foot" role="contentinfo">
              <nav className="foot-nav" aria-label="Footer navigation">
                <div className="fcol">
                  <h4 className="fcol-head">Explore</h4>
                  <a href="#" className="fcol-link">List your property</a>
                  <a href="#" className="fcol-link fcol-link--coming" tabIndex={-1} aria-label="Partnerships — coming soon">Partnerships</a>
                  <span className="fcol-link fcol-link--soon">Affiliate programme<span className="fcol-soon-badge">Soon</span></span>
                  <a href="#" className="fcol-link fcol-link--coming" tabIndex={-1} aria-label="Journal — coming soon">Journal</a>
                  <a href="#" className="fcol-link fcol-link--coming" tabIndex={-1} aria-label="CheckinBliss vs Airbnb — coming soon">CheckinBliss vs Airbnb</a>
                </div>
                <div className="fcol">
                  <h4 className="fcol-head">Support</h4>
                  <a href="#" className="fcol-link">Help centre</a>
                  <a href="mailto:hello@checkinbliss.com" className="fcol-link">Contact us</a>
                  <a href="policy.html" className="fcol-link">Policy</a>
                  <span className="fcol-link fcol-link--soon">Reviews<span className="fcol-soon-badge">Soon</span></span>
                </div>
                <div className="fcol">
                  <h4 className="fcol-head">CheckinBliss</h4>
                  <a href="#" className="fcol-link">Our story</a>
                  <a href="#" className="fcol-link">The CheckinBliss standard</a>
                  <a href="#" className="fcol-link">CheckinBliss for business</a>
                  <a href="#" className="fcol-link">Press</a>
                </div>
              </nav>

              <div className="foot-bottom">
                <div className="foot-row">
                  <Link href="/lagos" className="foot-dest-link">Lagos</Link>
                  <span className="foot-sep" aria-hidden="true">·</span>
                  <Link href="/abuja" className="foot-dest-link">Abuja</Link>
                  <span className="foot-sep" aria-hidden="true">·</span>
                  <span className="foot-dest-soon">Coming soon:</span>
                  <span className="foot-dest-muted">Port Harcourt, Accra, Nairobi</span>
                </div>
                <div className="foot-row">
                  <a href="#" className="foot-legal-link">Privacy</a>
                  <span className="foot-sep" aria-hidden="true">·</span>
                  <a href="#" className="foot-legal-link">Terms</a>
                  <span className="foot-sep" aria-hidden="true">·</span>
                  <a href="#" className="foot-legal-link">Cookies</a>
                  <span className="foot-sep" aria-hidden="true">·</span>
                  <a href="#" className="foot-legal-link">Accessibility</a>
                </div>
                <div className="foot-row foot-row--statement">
                  <p className="foot-legal">CheckinBliss is operated by Lyxio Curtis Ltd, a UK-registered company. Company number SC863027. &copy;&nbsp;2026</p>
                  <div className="foot-socials">
                    <a href="#" className="foot-social-link" aria-label="CheckinBliss on Instagram" target="_blank" rel="noopener noreferrer">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="2" y="2" width="20" height="20" rx="5.5" ry="5.5" />
                        <circle cx="12" cy="12" r="4" />
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                      </svg>
                    </a>
                    <a href="#" className="foot-social-link" aria-label="CheckinBliss on TikTok" target="_blank" rel="noopener noreferrer">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.28 8.28 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </section>

        <aside className={`mappane ${mapOpen ? "" : "mappane--hidden"}`} aria-label={`Map of ${city} apartments`}>
          <div id="map" className="map-canvas" ref={mapContainerRef}></div>
          <div className="map-fallback" id="mapFallback" hidden>
            <p>Map unavailable. Add your Mapbox token in <code>js/listings.js</code> to enable it.</p>
          </div>
        </aside>
      </main>

      <button
        className="map-toggle"
        aria-pressed={mapOpen}
        onClick={() => setMapOpen((v) => !v)}
        type="button"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
          <path d="M1.5 3.5 5.5 2l5 1.5 4-1.5v10l-4 1.5-5-1.5-4 1.5z" />
          <path d="M5.5 2v10.5M10.5 3.5V14" />
        </svg>
        <span id="mapToggleLabel">{mapOpen ? "Hide map" : "Show map"}</span>
      </button>
    </>
  );
}

/* ---------- Mapbox types ---------- */
declare global {
  interface Window {
    mapboxgl?: any;
  }
}
