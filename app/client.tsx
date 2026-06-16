"use client";

import { useRef, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import type { SeedProperty } from "@/lib/seed-data";
import { formatMinor, type CurrencyCode } from "@/lib/currency";
import { SearchBar } from "@/components/search-bar";
import { Footer } from "@/components/footer";

const cities = [
  { name: "Asokoro", city: "Abuja", img: "https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=600&q=80" },
  { name: "Eko Atlantic", city: "Lagos", img: "https://images.unsplash.com/photo-1599809275671-b5942cabc7a2?w=600&q=80" },
  { name: "Banana Island", city: "Lagos", img: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80" },
  { name: "Ikeja", city: "Lagos", img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80" },
  { name: "Maitama", city: "Abuja", img: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=600&q=80" },
  { name: "Jabi", city: "Abuja", img: "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=600&q=80" },
  { name: "Victoria Island", city: "Lagos", img: "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=600&q=80" },
];

const promises = [
  { heading: "Only the best apartments", body: "Our local team personally inspects every listing. We only accept the top properties so you never have to wonder if it&rsquo;s real." },
  { heading: "Awardwinning care", body: "A dedicated concierge is assigned to every booking. Someone who knows your city, knows your apartment, and is a text away." },
  { heading: "Unrivalled protection", body: "If something isn&rsquo;t right, we make it right. No runaround, no hidden terms, no &ldquo;contact the host&rdquo;." },
];

function PropertyCard({ p }: { p: SeedProperty }) {
  return (
    <Link
      href={`/stays/${p.slug}`}
      className="group bg-white rounded-[var(--radius-md)] border border-hairline overflow-hidden no-underline transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)]"
    >
      <div className="aspect-[4/3] bg-ink overflow-hidden">
        <div className="h-full w-full bg-gradient-to-br from-ink to-ink/80 flex items-center justify-center text-white/15">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
      </div>
      <div className="p-5">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[1.5px] text-brass mb-1">{p.neighbourhood}, {p.city}</p>
        <h3 className="font-serif text-lg font-bold tracking-tight text-ink mb-2 group-hover:text-brass transition-colors">{p.name}</h3>
        <div className="flex items-center gap-x-3 text-xs text-ink-secondary mb-3">
          <span>{p.bedrooms} bed{p.bedrooms > 1 ? "s" : ""}</span><span>·</span><span>Sleeps {p.sleeps}</span>
        </div>
        <div className="flex items-baseline justify-between pt-3 border-t border-hairline">
          <div>
            <span className="font-sans text-base font-bold tabular-nums text-ink">{formatMinor(p.nightly_rate_minor, p.currency as CurrencyCode)}</span>
            <span className="font-sans text-xs text-ink-secondary"> / night</span>
          </div>
          <span className="font-sans text-[11px] font-semibold text-brass group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-x-1">View →</span>
        </div>
      </div>
    </Link>
  );
}

export function HomePageClient({ properties, hasSearch }: { properties: SeedProperty[]; hasSearch: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  useEffect(() => {
    if (rootRef.current) rootRef.current.classList.replace("opacity-0", "opacity-100");
  }, []);

  return (
    <div ref={rootRef} className="transition-opacity duration-500 opacity-0">
      {/* Skip to content (accessibility) */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-brass focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:no-underline">Skip to content</a>

      {/* Hero */}
      <section className="relative h-screen min-h-[600px] overflow-hidden bg-ink" aria-label="Hero">
        <img
          className="absolute inset-0 h-full w-full object-cover object-[center_35%] brightness-[0.28] saturate-[1.05]"
          src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1600&q=80"
          alt="Luxury apartment interior in Lagos"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/20 via-transparent to-ink/90" />

        <nav className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-8 py-5 max-sm:px-5" aria-label="Main navigation">
          <Link href="/" className="font-sans text-xl font-bold tracking-tight text-white drop-shadow-sm no-underline" aria-label="CheckinBliss home">checkin<span className="text-brass">Bliss</span></Link>

          {/* Desktop nav */}
          <div className="flex items-center gap-3 max-sm:hidden">
            <Link href="/login" className="rounded-full border border-white/15 bg-white/8 px-5 py-2 text-xs font-medium text-white/85 backdrop-blur-sm transition-colors hover:bg-white/16 no-underline">Sign in</Link>
            <Link href="/login" className="rounded-full bg-brass px-5 py-2 text-xs font-semibold text-white transition-all hover:bg-brass-dark no-underline">Get started</Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="hidden max-sm:flex w-9 h-9 items-center justify-center rounded-lg text-white cursor-pointer border-none bg-white/10 backdrop-blur-sm"
            aria-label={mobileMenu ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenu}
          >
            {mobileMenu ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            )}
          </button>

          {/* Mobile menu dropdown */}
          {mobileMenu && (
            <div className="absolute top-full right-4 mt-2 w-48 bg-white rounded-xl border border-hairline shadow-xl z-40 py-1 animate-slideIn max-sm:block hidden">
              <Link href="/login" onClick={() => setMobileMenu(false)} className="block px-4 py-2.5 text-sm font-medium text-ink hover:bg-primary-bg no-underline">Sign in</Link>
              <Link href="/login" onClick={() => setMobileMenu(false)} className="block px-4 py-2.5 text-sm font-medium text-brass hover:bg-brass-light/30 no-underline">Get started</Link>
            </div>
          )}
        </nav>

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 max-sm:px-4" id="main-content">
          <p className="font-sans text-xs font-semibold uppercase tracking-[3px] text-brass-light mb-5 text-center">For the diaspora. By people who know the way home.</p>
          <h1 className="font-serif text-[clamp(44px,6.5vw,96px)] font-bold leading-[0.92] tracking-tight text-white text-center max-w-[860px] mb-6">
            Book from anywhere.<br /><span className="text-brass">Arrive home.</span>
          </h1>

          {/* Search bar */}
          <Suspense fallback={<div className="h-14 w-full max-w-[680px] rounded-full bg-white/20 animate-pulse" />}>
            <SearchBar />
          </Suspense>

          <p className="font-sans text-sm leading-relaxed text-white/40 text-center max-w-[520px] mt-6">
            Verified apartments across Lagos and Abuja. Book instantly in your currency.
          </p>
        </div>
      </section>

      {/* Search results (only shown when there's an active search) */}
      {hasSearch && (
        <section className="bg-bone py-section max-sm:py-section-sm" aria-label="Search results">
          <div className="px-8 max-w-[1280px] mx-auto max-sm:px-5">
            <p className="font-sans text-xs font-semibold uppercase tracking-[2.5px] text-brass text-center mb-2">Search results</p>
            <h2 className="font-serif text-[clamp(24px,3vw,38px)] font-bold leading-tight tracking-tight text-ink text-center mb-2">
              {properties.length} {properties.length === 1 ? "stay" : "stays"} found
            </h2>

            {properties.length === 0 ? (
              /* Empty state */
              <div className="text-center py-12">
                <p className="font-sans text-sm text-ink-secondary mb-6 max-w-[480px] mx-auto">
                  No stays available for those dates. Try nearby dates, a different neighbourhood, or the other city.
                </p>
                <div className="flex items-center justify-center gap-x-3 flex-wrap">
                  <Link href="/?where=Lagos" className="rounded-full border border-hairline px-5 py-2.5 text-xs font-medium text-ink-secondary hover:bg-white transition-colors no-underline">Browse Lagos</Link>
                  <Link href="/?where=Abuja" className="rounded-full border border-hairline px-5 py-2.5 text-xs font-medium text-ink-secondary hover:bg-white transition-colors no-underline">Browse Abuja</Link>
                  <Link href="/" className="rounded-full bg-brass px-5 py-2.5 text-xs font-semibold text-white hover:bg-brass-dark transition-colors no-underline">Clear search</Link>
                </div>
              </div>
            ) : (
              /* Results grid */
              <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1 mt-8">
                {properties.map((p) => <PropertyCard key={p.id} p={p} />)}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Three filter cards */}
      {!hasSearch && (
        <section className="py-section max-sm:py-section-sm">
          <div className="px-8 max-w-[1280px] mx-auto max-sm:px-5">
            <p className="font-sans text-xs font-semibold uppercase tracking-[2.5px] text-brass text-center mb-4">Find your kind of stay</p>
            <div className="grid grid-cols-3 gap-8 max-lg:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-6">
              {[
                { label: "Banana Island, Lagos", title: <>REMARKABLY<br />EKO</>, link: "View apartments in Banana Island →", img: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80" },
                { label: "Lekki, Lagos", title: <>SPLASH OUT<br />STAYS</>, link: "View apartments with a pool →", img: "https://images.unsplash.com/photo-1576013551627-0cc20b5c5b15?w=800&q=80" },
                { label: "Maitama, Abuja", title: <>EXQUISITE<br />ELEGANCE</>, link: "View apartments in Maitama →", img: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80" },
              ].map((card) => (
                <div key={card.label} className="group cursor-pointer">
                  <div className="relative aspect-[77/100] overflow-hidden rounded-[var(--radius-md)] bg-ink mb-5">
                    <img src={card.img} alt="" className="absolute inset-0 h-full w-full object-cover brightness-[0.55] transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
                    <div className="absolute inset-0 z-10 flex items-center justify-center p-8">
                      <div className="text-center">
                        <p className="font-sans text-[10px] font-semibold uppercase tracking-[2.5px] text-brass-light mb-2">{card.label}</p>
                        <h3 className="font-serif text-[clamp(22px,2.6vw,38px)] font-bold leading-tight tracking-tight text-white">{card.title}</h3>
                      </div>
                    </div>
                  </div>
                  <Link href="/login" className="font-sans text-xs font-semibold text-brass no-underline transition-colors hover:text-brass-dark">{card.link}</Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Browse stays */}
      {!hasSearch && (
        <section className="bg-bone py-section max-sm:py-section-sm" aria-label="Browse stays">
          <div className="px-8 max-w-[1280px] mx-auto max-sm:px-5">
            <p className="font-sans text-xs font-semibold uppercase tracking-[2.5px] text-brass text-center mb-2">Browse stays</p>
            <h2 className="font-serif text-[clamp(28px,3.2vw,42px)] font-bold leading-tight tracking-tight text-ink text-center mb-4 max-w-[640px] mx-auto">Verified apartments in Lagos &amp; Abuja</h2>
            <p className="font-sans text-sm leading-relaxed text-ink-secondary text-center max-w-[540px] mx-auto mb-10">Every apartment is personally inspected by our team. Browse freely — no sign-up required.</p>
            <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
              {properties.map((p) => <PropertyCard key={p.id} p={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* Trusted for a reason */}
      <section className="bg-white py-section max-sm:py-section-sm">
        <div className="px-8 max-w-[1280px] mx-auto max-sm:px-5">
          <p className="font-sans text-xs font-semibold uppercase tracking-[2.5px] text-brass text-center mb-2">Trusted for a reason</p>
          <h2 className="font-serif text-[clamp(28px,3.2vw,42px)] font-bold leading-tight tracking-tight text-ink text-center mb-4 max-w-[640px] mx-auto">Why the diaspora chooses CheckinBliss</h2>
          <p className="font-sans text-base leading-relaxed text-ink-secondary text-center max-w-[600px] mx-auto mb-12">
            Airbnb and Booking.com work almost everywhere. Nigeria is different. The power grid, the traffic, the neighbourhoods that matter, the currency you actually hold &mdash; we built for that reality.
          </p>
          <div className="grid grid-cols-3 gap-10 max-lg:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-8">
            {[
              { n: 1, heading: "Pay in your currency", body: "Book in GBP, USD, or EUR with your international card. No wire transfers, no unexplained bank fees, no \u201Cyou need a local account\u201D." },
              { n: 2, heading: "Every apartment is verified", body: "Our team inspects every property before it\u2019s listed. Working AC, reliable power backup, clean water, safe neighbourhood. What you see is what you get." },
              { n: 3, heading: "Instant booking, no host", body: "No \u201Csend a message and wait 24 hours\u201D. No \u201Cthe host declined your request\u201D. Find your apartment, book it, receive confirmation. That\u2019s it." },
              { n: 4, heading: "The neighbourhoods that matter", body: "Ikoyi. Banana Island. Maitama. Asokoro. Buildings with reliable power, streets that don\u2019t flood in rainy season. We\u2019re here \u2014 we know." },
              { n: 5, heading: "Dedicated concierge", body: "A real person assigned to every booking. Airport pickup, dinner reservations, backup generator \u2014 just ask. Someone who knows your city is a text away." },
              { n: 6, heading: "Trusted by travellers", body: "Rated 4.8 on Trustpilot. Our guests come back because the experience works \u2014 from booking to check-out to the next trip." },
            ].map((item) => (
              <div key={item.n}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brass/10 text-lg font-bold text-brass">{item.n}</div>
                <h4 className="font-serif text-xl font-semibold tracking-tight text-ink mb-2">{item.heading}</h4>
                <p className="font-sans text-sm leading-relaxed text-ink-secondary">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-12 flex max-w-[520px] items-center gap-4 rounded-full border border-hairline bg-bone px-7 py-5">
            <span className="text-xl tracking-[2px] text-[#00b67a]">★★★★★</span>
            <div>
              <div className="font-sans text-xs font-semibold text-ink">Excellent</div>
              <div className="font-sans text-[11px] text-ink-secondary">Rated 4.8 on Trustpilot</div>
            </div>
          </div>
        </div>
      </section>

      {/* City directory */}
      {!hasSearch && (
        <section className="py-section max-sm:py-section-sm">
          <div className="px-8 max-w-[1280px] mx-auto max-sm:px-5">
            <p className="font-sans text-xs font-semibold uppercase tracking-[2.5px] text-brass text-center mb-2">Where we are</p>
            <h2 className="font-serif text-[clamp(28px,3.2vw,42px)] font-bold leading-tight tracking-tight text-ink text-center mb-3">View apartments in</h2>
            <p className="font-sans text-sm leading-relaxed text-ink-secondary max-w-[540px] mx-auto text-center mb-10">Lagos and Abuja. The neighbourhoods that matter to the diaspora returnee.</p>
            <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-3 max-sm:grid-cols-2 max-[420px]:grid-cols-1">
              {cities.map((loc) => (
                <div key={loc.name} className="group relative h-[clamp(140px,16vw,220px)] cursor-pointer overflow-hidden rounded-[var(--radius-md)] bg-ink">
                  <img src={loc.img} alt={loc.name} className="absolute inset-0 h-full w-full object-cover brightness-[0.45] saturate-[1.05] transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/30 to-transparent" />
                  <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-white">
                    <span className="font-serif text-lg font-semibold tracking-tight">{loc.name}</span>
                    <span className="font-sans text-[10px] tracking-[0.3px] text-white/50 mt-1">{loc.city}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Promise */}
      <section className="bg-brass py-section max-sm:py-section-sm">
        <div className="px-8 max-w-[1280px] mx-auto max-sm:px-5">
          <p className="font-sans text-xs font-semibold uppercase tracking-[2.5px] text-brass-light text-center mb-2">High standards of service</p>
          <h2 className="font-serif text-[clamp(30px,3.6vw,48px)] font-bold leading-[1.1] tracking-tight text-white text-center mb-4">The CheckinBliss Promise</h2>
          <p className="font-sans text-sm leading-relaxed text-white/55 max-w-[540px] mx-auto text-center mb-12">Every apartment is verified. Every booking is protected. Every guest has a real person looking out for them.</p>
          <div className="grid grid-cols-3 gap-8 max-lg:grid-cols-1 max-lg:gap-6 max-w-[960px] mx-auto">
            {promises.map((item) => (
              <div key={item.heading} className="text-center">
                <h4 className="font-serif text-lg font-semibold tracking-tight text-white mb-2">{item.heading}</h4>
                <p className="font-sans text-xs leading-relaxed text-white/55" dangerouslySetInnerHTML={{ __html: item.body }} />
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/login" className="inline-block rounded-full bg-white px-9 py-3.5 text-sm font-semibold text-brass no-underline transition-all hover:bg-white/90 hover:-translate-y-px">Find your stay</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
