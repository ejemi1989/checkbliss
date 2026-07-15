"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { formatMinor, convertMinor, type CurrencyCode, CURRENCY_OPTIONS } from "@/lib/currency";
import type { SeedProperty } from "@/lib/seed-data";
import { propertyHref } from "@/lib/slug";
import { Footer } from "@/components/footer";
import { SearchBar } from "@/components/search-bar";

const editorialCategories = [
  {
    kicker: "Remarkably",
    title: "Lagos",
    description: "View apartments in Lagos →",
    img: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&h=800&q=80",
    href: "/search?where=Lagos",
  },
  {
    kicker: "Apartments with a",
    title: "Pool",
    description: "View apartments with private pools →",
    img: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=600&h=800&q=80",
    href: "/search?where=Lagos&amenities=pool",
  },
  {
    kicker: "Calmly",
    title: "Abuja",
    description: "View apartments in Abuja →",
    img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&h=800&q=80",
    href: "/search?where=Abuja",
  },
];

function searchLink(path: string, currency: CurrencyCode): string {
  return currency === "GBP" ? path : `${path}${path.includes("?") ? "&" : "?"}currency=${currency}`;
}

const carouselStays = [
  { kicker: "Lagos", title: "Lagoon Living", label: "View apartments in Victoria Island →", img: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&h=800&q=80", href: "/search?where=Victoria+Island" },
  { kicker: "Abuja", title: "Hills & Hush", label: "View apartments in Maitama →", img: "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=600&h=800&q=80", href: "/search?where=Maitama" },
  { kicker: "By the water", title: "Private Pools", label: "View apartments with pools →", img: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&h=800&q=80", href: "/search?where=Lagos&amenities=pool" },
  { kicker: "Space and privacy", title: "Maisonettes", label: "View maisonettes in Lagos →", img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&h=800&q=80", href: "/search?where=Lagos&type=maisonette" },
  { kicker: "Lagos", title: "Banana Island", label: "View apartments on Banana Island →", img: "https://images.unsplash.com/photo-1600585154084-4e5fe7c39198?auto=format&fit=crop&w=600&h=800&q=80", href: "/search?where=Banana+Island" },
  { kicker: "Abuja", title: "Asokoro Calm", label: "View apartments in Asokoro →", img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&h=800&q=80", href: "/search?where=Asokoro" },
];

const howSteps = [
  {
    num: "01",
    heading: "Browse hand-selected apartments",
    body: "Every listing is inspected in person, photographed editorially, and verified monthly. We don't list what we haven't visited.",
    img: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80",
  },
  {
    num: "02",
    heading: "Book instantly with your card",
    body: "Pay in GBP, USD, or EUR through your card or digital wallet. Security deposit held on your card, never charged unless something breaks.",
    img: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=800&q=80",
  },
  {
    num: "03",
    heading: "Arrive to a stay we stand behind",
    body: "Our local teams handle the logistics. If anything isn't right, we make it right. The relationship doesn't end at booking.",
    img: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80",
  },
];

const promisePillars = [
  {
    kicker: "Always",
    title: "Inspected",
    body: "Every property is visited in person before it lists — and re-checked monthly, with photographs. No remote approvals, no owner-submitted listings, no exceptions.",
    img: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=600&h=800&q=80",
  },
  {
    kicker: "Entirely",
    title: "Ours to present",
    body: "Photography, descriptions, and presentation are produced by our team. No user-generated content — every listing shows you what's actually there.",
    img: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=600&h=800&q=80",
  },
  {
    kicker: "Personally",
    title: "Mediated",
    body: "If a dispute arises, our team mediates it directly. You're never left arguing with a host you've never met.",
    img: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&h=800&q=80",
  },
];

/* ---- draggable carousel hook ---- */
function useDraggable(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const track = ref.current;
    if (!track) return;
    let down = false, startX = 0, scrollLeft = 0, moved = 0;

    const onDown = (e: MouseEvent) => { down = true; moved = 0; track.classList.add("dragging"); startX = e.pageX - track.offsetLeft; scrollLeft = track.scrollLeft; };
    const onUp = () => { down = false; track.classList.remove("dragging"); };
    const onLeave = () => { if (down) { down = false; track.classList.remove("dragging"); } };
    const onMove = (e: MouseEvent) => { if (!down) return; e.preventDefault(); const x = e.pageX - track.offsetLeft; moved += Math.abs(x - startX); track.scrollLeft = scrollLeft - (x - startX); };
    const onLink = (e: MouseEvent) => { if (moved > 6) e.preventDefault(); };

    track.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    track.addEventListener("mouseleave", onLeave);
    track.addEventListener("mousemove", onMove);
    track.querySelectorAll("a").forEach((a) => a.addEventListener("click", onLink));

    return () => {
      track.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      track.removeEventListener("mouseleave", onLeave);
      track.removeEventListener("mousemove", onMove);
    };
  }, [ref.current]);
}

/* ---- image card for carousels ---- */
function CardImg({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative aspect-[3/4] overflow-hidden border border-line">
      <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
    </div>
  );
}

function PropertyCard({ p }: { p: SeedProperty }) {
  return (
    <Link href={propertyHref(p)} className="no-underline text-inherit group">
      <div className="mb-4 overflow-hidden relative aspect-[4/3]">
        <img src={p.cover_photo_url ?? undefined} alt={p.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
      </div>
      <p className="font-display italic text-[clamp(18px,1.5vw,22px)] text-green-soft mb-1">{p.neighbourhood}</p>
      <h3 className="font-display text-[clamp(22px,1.8vw,28px)] font-medium text-ink leading-tight mb-1">{p.name}</h3>
      <p className="font-sans text-sm text-mute">{p.city}, Nigeria</p>
      <div className="flex items-center gap-2 mt-2 font-sans text-sm">
        <span className="text-trustpilot">★★★★★</span>
        <span className="text-ink-secondary">4.8</span>
        <span>&middot;</span>
        <span className="text-xs font-semibold text-green-soft uppercase tracking-[0.06em]">&#10003; Verified</span>
      </div>
      <div className="flex items-center gap-2 mt-2 font-sans text-sm">
        <span className="font-semibold text-ink">{formatMinor(p.nightly_rate_minor, p.currency as CurrencyCode)}</span>
        <span className="text-ink-secondary">/night</span>
      </div>
    </Link>
  );
}

export function HomePageClient({ properties, hasSearch }: { properties: SeedProperty[]; hasSearch: boolean }) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [howStep, setHowStep] = useState(1);
  const howRightRef = useRef<HTMLDivElement>(null);
  const staysRef = useRef<HTMLDivElement>(null);
  const catsRef = useRef<HTMLDivElement>(null);
  const promiseRef = useRef<HTMLDivElement>(null);
  const [heroParallax, setHeroParallax] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>("GBP");
  const [currencyOpen, setCurrencyOpen] = useState(false);

  // Persist currency preference
  useEffect(() => {
    const stored = localStorage.getItem("checkbliss_currency");
    if (stored === "USD" || stored === "EUR") setCurrency(stored);
  }, []);
  useEffect(() => { localStorage.setItem("checkbliss_currency", currency); }, [currency]);

  useDraggable(staysRef);
  useDraggable(catsRef);
  useDraggable(promiseRef);

  /* hero parallax */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) { window.requestAnimationFrame(() => { const h = document.querySelector(".hero-subject"); if (h) { const r = h.getBoundingClientRect(); if (r.bottom > 0 && r.top < window.innerHeight) setHeroParallax(r.top * -0.36); } ticking = false; }); ticking = true; }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* how-it-works step tracker */
  useEffect(() => {
    if (!howRightRef.current) return;
    const steps = howRightRef.current.querySelectorAll("[data-how-step]");
    if (steps.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => { for (const entry of entries) { if (entry.isIntersecting) { const step = parseInt((entry.target as HTMLElement).dataset.howStep || "1"); setHowStep(step); } } },
      { rootMargin: "-40% 0px -50% 0px" }
    );
    steps.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Skip to content */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-brass focus:text-bone focus:px-4 focus:py-2 focus:rounded-lg focus:no-underline">Skip to content</a>

      {/* Organization JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "CheckinBliss", url: "https://checkinbliss.com", description: "Premium apartment stays in Lagos and Abuja. Verified, instantly bookable homes for the diaspora.", foundingDate: "2025", founder: { "@type": "Person", name: "Admin" }, address: { "@type": "PostalAddress", addressCountry: "NG" }, sameAs: ["https://trustpilot.com/review/checkinbliss.com"] }) }} />

      {/* HERO — nav floats on top inside the hero */}
      <section className="relative bg-ink flex items-center justify-center text-center text-white overflow-hidden pt-[174px] pb-[40px] max-sm:pt-[140px] max-sm:pb-[40px]" aria-label="Hero">
        {/* NAV — full-bleed overlay, floats transparently on the hero image */}
        <nav className="absolute top-0 left-0 right-0 z-50 bg-transparent border-b-0" aria-label="Main navigation">
          <div className="max-w-[1240px] mx-auto px-8 max-sm:px-5">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center h-[84px] max-sm:grid-cols-[auto_auto] max-sm:justify-between max-sm:gap-3">
              <div className="flex items-center gap-4 justify-self-start max-[560px]:hidden">
                {/* left side empty — nav-left in HTML */}
              </div>
              <Link href="/" className="justify-self-center flex items-center justify-center no-underline max-sm:text-center max-sm:order-0 max-sm:col-span-2" aria-label="CheckinBliss home">
                <img src="/checkbliss%20logo.png" alt="CheckinBliss" className="h-9 w-auto max-sm:h-7 brightness-0 invert" />
              </Link>
              <div className="flex items-center gap-4 justify-self-end justify-end">
                <div className="relative max-[560px]:hidden">
                  <button
                    className="flex items-center gap-2 font-sans text-sm font-semibold tracking-[0.02em] text-white bg-white/[0.14] border border-white/40 rounded-full py-[11px] px-[20px] cursor-pointer transition-colors hover:bg-white/[0.24] backdrop-blur-[14px]"
                    aria-label="Language and currency"
                    onClick={() => setCurrencyOpen(!currencyOpen)}
                    onBlur={() => setTimeout(() => setCurrencyOpen(false), 200)}
                  >
                    EN <span className="text-white/70 font-normal">|</span> {currency}
                  </button>
                  {currencyOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl border border-hairline shadow-xl z-50 overflow-hidden">
                      <div className="p-3 border-b border-hairline">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-mute mb-2">Language</p>
                        <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-ink bg-primary-bg cursor-pointer border-none">English</button>
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-mute mb-2">Currency</p>
                        {CURRENCY_OPTIONS.map((c) => (
                          <button
                            key={c.code}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium cursor-pointer border-none transition-colors ${currency === c.code ? "bg-primary text-white" : "text-ink-secondary hover:bg-bone"}`}
                            onClick={() => { setCurrency(c.code); setCurrencyOpen(false); }}
                          >
                            <span className="mr-2">{c.flag}</span>
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button className="flex items-center gap-3 bg-white/[0.14] border border-white/40 rounded-full py-2 px-[14px] pl-[18px] cursor-pointer text-white transition-colors hover:bg-white/[0.24] backdrop-blur-[14px]" aria-label="Menu and account" onClick={() => setMobileMenu(!mobileMenu)}>
                  <span className="flex flex-col gap-1">
                    <span className="w-[18px] h-[1.6px] bg-white rounded-[2px]" />
                    <span className="w-[18px] h-[1.6px] bg-white rounded-[2px]" />
                    <span className="w-[18px] h-[1.6px] bg-white rounded-[2px]" />
                  </span>
                  <span className="flex items-center text-white">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="9" r="3.2" />
                      <path d="M5.5 19c.6-3.2 3.2-5 6.5-5s5.9 1.8 6.5 5" />
                      <circle cx="12" cy="12" r="10.2" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </div>
          {mobileMenu && (
            <div className="absolute top-full right-8 mt-2 w-48 bg-card rounded-[var(--radius-md)] border border-line shadow-xl z-40 py-1 animate-slideIn max-sm:right-5">
              <Link href="/login" onClick={() => setMobileMenu(false)} className="block px-4 py-2.5 text-sm font-medium text-ink hover:bg-soft no-underline">Sign in</Link>
              <Link href="/signup" onClick={() => setMobileMenu(false)} className="block px-4 py-2.5 text-sm font-medium text-green-soft hover:bg-soft no-underline">Get started</Link>
            </div>
          )}
        </nav>
        <img className="absolute left-0 right-0 -top-[15%] h-[130%] w-full object-cover" src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2400&q=80" alt="Premium Lagos apartment interior" style={{ transform: `translate3d(0,${heroParallax}px,0)`, willChange: "transform" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/32 via-black/12 to-black/50" />
        <div className="relative z-10 w-full px-6" id="main-content">
          <h1 className="font-display font-normal text-[clamp(2.2rem,4.6vw,4rem)] leading-[1.04] tracking-[0.005em] max-w-[16ch] mx-auto mb-[18px]" style={{ textShadow: "0 2px 30px rgba(0,0,0,.22)" }}>
            The premium way to stay in Africa.
          </h1>
          <p className="font-sans font-normal text-[clamp(1rem,1.7vw,1.18rem)] leading-[1.5] text-white/90 max-w-[46ch] mx-auto mb-[40px] max-sm:mb-[24px]" style={{ textShadow: "0 1px 16px rgba(0,0,0,.3)" }}>
            Hand-selected apartments in Lagos and Abuja. Instantly bookable from anywhere.
          </p>
          <div className="max-w-[780px] mx-auto max-sm:max-w-[440px]">
            <Suspense fallback={<div className="h-[56px] bg-white/80 rounded animate-pulse" />}>
              <SearchBar />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Intro */}
      {!hasSearch && (
        <section className="py-[80px] max-w-[900px] px-8 max-sm:px-5 mx-auto">
          <div className="text-left">
            <p className="font-sans text-[15px] font-semibold uppercase tracking-[0.12em] text-green-soft">Welcome to CheckinBliss</p>
            <h2 className="font-display font-normal text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.12] tracking-[0.005em] text-ink mt-6 mb-7">
              A premium stay should feel certain — chosen with care, verified in person, and <em className="italic text-green-soft">stood behind from arrival to checkout.</em>
            </h2>
            <p className="font-sans text-[19px] leading-[1.6] text-ink-secondary">
              We built CheckinBliss for people with one foot in two places — who want to return to Africa, or simply arrive well, without leaving the experience to chance. Every apartment we list offers what a hotel can&rsquo;t: a home that&rsquo;s truly yours, in the places you actually want to be. Somewhere better to stay.
            </p>
          </div>
        </section>
      )}

      {/* EDITORIAL CATEGORY CARDS — horizontal drag carousel */}
      {!hasSearch && (
        <section className="pb-[80px]">
          <div className="max-w-[1240px] mx-auto px-8 max-sm:px-5">
            <div ref={catsRef} className="flex gap-0 overflow-x-auto scrollbar-none cursor-grab scroll-smooth select-none pb-1 max-sm:pb-0" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              {editorialCategories.map((cat) => (
                <Link key={cat.title} href={cat.href} className="no-underline text-inherit flex flex-col group flex-shrink-0 w-[calc(100%/3)] min-w-[300px] px-4 max-sm:w-[82%] max-sm:min-w-0">
                  <div className="relative aspect-[3/4] overflow-hidden border border-line">
                    <img src={cat.img} alt={cat.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500" loading="lazy" />
                  </div>
                  <div className="flex flex-col flex-1 pt-[18px]">
                    <p className="font-display italic text-[30px] text-green-soft leading-[1.12]">{cat.kicker}</p>
                    <h3 className="font-display font-normal text-[30px] text-ink leading-[1.12] tracking-[0.005em] mt-[2px] mb-[14px]">{cat.title}</h3>
                    <span className="font-sans text-[15px] font-semibold text-ink border-b border-ink pb-[2px] transition-colors hover:text-green-soft hover:border-green-soft self-start mt-auto">{cat.description}</span>
                  </div>
                </Link>
              ))}
            </div>
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-mute text-center mt-[20px]">Drag to explore →</p>
          </div>
        </section>
      )}

      {/* Big Quote */}
      {!hasSearch && (
        <section className="relative w-full h-screen flex items-center justify-center text-center text-white overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#3c4734] to-[#222a1d]" />
          <div className="absolute inset-0 bg-black/[0.42]" />
          <div className="relative z-10 max-w-[760px] px-6">
            <span className="block font-display text-[72px] text-white/50 leading-[0] mb-[30px]">&ldquo;</span>
            <p className="font-display font-normal italic text-[clamp(2.4rem,5vw,4.2rem)] leading-[1.15] max-w-[18ch] mx-auto">
              You&rsquo;ll <em className="italic border-b-2 border-green-soft pb-[2px]">never</em> settle for an ordinary stay again.
            </p>
            <div className="mt-8 font-sans font-semibold tracking-[0.06em] text-[15px] uppercase opacity-85">— Publication Name</div>
          </div>
        </section>
      )}

      {/* How we choose */}
      {!hasSearch && (
        <section className="py-[80px] max-w-[900px] px-8 max-sm:px-5 mx-auto">
          <div className="text-left">
            <p className="font-sans text-[15px] font-semibold uppercase tracking-[0.12em] text-green-soft">How we choose properties</p>
            <h2 className="font-display font-normal text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.12] tracking-[0.005em] text-ink mt-6 mb-7">
              Most platforms list whatever owners submit. <em className="italic text-green-soft">We don&rsquo;t.</em>
            </h2>
            <p className="font-sans text-[19px] leading-[1.6] text-ink-secondary">
              Every property on CheckinBliss has been visited by our team, evaluated against our standards, and approved before going live. Listings are removed if standards slip. This is the work that makes the platform work — and it&rsquo;s why we list fewer properties than anyone else in the market.
            </p>
          </div>
        </section>
      )}

      {/* STAYS — drag-to-slide carousel */}
      {!hasSearch && (
        <section className="pb-[64px]">
          <div className="max-w-[1240px] mx-auto px-8 max-sm:px-5">
            <div ref={staysRef} className="flex gap-0 overflow-x-auto cursor-grab scroll-smooth scrollbar-none pb-1 select-none" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              {carouselStays.map((stay) => (
                <Link key={stay.title} href={searchLink(stay.href, currency)} className="no-underline text-inherit flex flex-col group flex-shrink-0 w-[calc(100%/3_-_12px)] min-w-[300px] px-[10px] max-sm:w-[82%] max-sm:min-w-0">
                  <div className="relative aspect-[3/4] overflow-hidden border border-line">
                    <img src={stay.img} alt={stay.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500" loading="lazy" />
                  </div>
                  <div className="flex flex-col flex-1 pt-[18px]">
                    <p className="font-display italic text-[30px] text-green-soft leading-[1.12]">{stay.kicker}</p>
                    <h3 className="font-display font-normal text-[30px] text-ink leading-[1.12] tracking-[0.005em] mt-[2px] mb-[14px]">{stay.title}</h3>
                    <span className="font-sans text-[15px] font-semibold text-ink border-b border-ink pb-[2px] transition-colors group-hover:text-green-soft group-hover:border-green-soft self-start mt-auto">{stay.label}</span>
                  </div>
                </Link>
              ))}
            </div>
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-mute text-center mt-[24px]">Drag to explore →</p>
          </div>
        </section>
      )}

      {/* HOW CHECKINBLISS WORKS — sticky scroll-stack */}
      <section className="bg-brass text-bone py-[160px] pb-[80px]">
        <div className="max-w-[1240px] mx-auto px-8 max-sm:px-5">
          <div className="grid grid-cols-[0.85fr_1.15fr] gap-[64px] items-start max-md:grid-cols-1 max-md:gap-[24px]">
            <div className="sticky top-[18vh] self-start max-md:static max-md:top-auto">
              <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-white/50 mb-2">The process</p>
              <h2 className="font-display font-normal text-[clamp(2.2rem,3.6vw,3.2rem)] tracking-[0.01em] leading-[1.05] mt-[14px] mb-[40px] max-md:mb-[24px]">How CheckinBliss works</h2>
              <div className="max-md:hidden">
                <div className="flex items-baseline gap-2 font-display">
                  <span className="text-[64px] leading-none text-white">{String(howStep).padStart(2, "0")}</span>
                  <span className="text-[34px] text-white/50">/</span>
                  <span className="text-[34px] text-white/50">03</span>
                </div>
                <div className="mt-[24px] h-[2px] bg-white/20 w-[200px] max-w-[60%] rounded-sm">
                  <span className="block h-full bg-[#d8e2cd] rounded-sm transition-[width] duration-400" style={{ width: `${(howStep / 3) * 100}%` }} />
                </div>
              </div>
            </div>

            <div ref={howRightRef} className="flex flex-col gap-[48px]">
              {howSteps.map((step) => (
                <div key={step.num} data-how-step={step.num} className="wstep bg-white/[0.04] border border-white/[0.16] overflow-hidden opacity-100 max-md:relative max-md:pl-[46px] max-md:pb-[48px]">
                  <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#3a4634] to-[#2a3424]">
                    <img src={step.img} alt={step.heading} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-[40px] pb-[48px] max-md:p-0 max-md:pt-0">
                    <span className="block font-display text-[18px] text-white/60 mb-[10px]">{step.num}</span>
                    <h3 className="font-display font-normal text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15] mb-[14px] text-white">{step.heading}</h3>
                    <p className="font-sans text-white/70 text-[16px] leading-[1.6] max-w-[46ch]">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* THE STANDARD, UPHELD — 3 pillars with images */}
      <section className="py-[160px] pb-[80px]">
        <div className="max-w-[1240px] mx-auto px-8 max-sm:px-5">
          <h2 className="font-display font-normal text-center text-[clamp(2rem,3.4vw,2.9rem)] tracking-[0.005em] text-ink mb-[64px]">The standard, upheld.</h2>
          <div ref={promiseRef} className="flex gap-0 overflow-x-auto cursor-grab scroll-smooth scrollbar-none pb-1 select-none" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {promisePillars.map((p, i) => (
              <div key={p.title} className="flex-shrink-0 w-[calc(100%/3)] min-w-[300px] px-4 max-sm:w-[82%] max-sm:min-w-0">
                <div className="relative aspect-[3/4] overflow-hidden border border-line">
                  <img src={p.img} alt={p.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="pt-[18px]">
                  <p className="font-display italic text-[30px] text-green-soft leading-[1.12]">{p.kicker}</p>
                  <h3 className="font-display font-normal text-[30px] text-ink leading-[1.12] tracking-[0.005em] mt-[2px] mb-4">{p.title}</h3>
                  <p className="font-sans text-[14.5px] text-ink-secondary leading-[1.55] mt-[2px]">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Standard */}
      <section className="py-[160px] text-center">
        <div className="max-w-[1240px] mx-auto px-8 max-sm:px-5">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-green-soft mb-6">Our standard</p>
          <h2 className="font-display font-normal text-[clamp(2rem,3.8vw,3.2rem)] leading-[1.22] tracking-[0.005em] text-ink max-w-[24ch] mx-auto">
            We don&rsquo;t ask you to trust strangers&rsquo; reviews. We ask you to trust <em className="italic text-green-soft">the work we put in</em> before a single guest arrives.
          </h2>
        </div>
      </section>

      {/* Second Quote */}
      {!hasSearch && (
        <section className="relative w-full h-screen flex items-center justify-center text-center text-white overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#46523c] to-[#262e1f]" />
          <div className="absolute inset-0 bg-black/[0.4]" />
          <div className="relative z-10 max-w-[640px] px-6">
            <span className="block font-display text-[72px] text-white/50 leading-[0] mb-[30px]">&ldquo;</span>
            <p className="font-display font-normal italic text-[clamp(2.4rem,5vw,4.2rem)] leading-[1.15] max-w-[18ch] mx-auto">High standards of service.</p>
            <div className="mt-8 font-sans font-semibold tracking-[0.06em] text-[15px] uppercase text-white/85">— Publication Name</div>
          </div>
        </section>
      )}

      {/* Closing */}
      <section className="text-center py-[160px] pb-[100px]">
        <div className="max-w-[1240px] mx-auto px-8 max-sm:px-5">
          <div className="inline-flex items-center justify-center mx-auto mb-6 border border-line rounded-[10px] bg-card py-[18px] px-[34px]">
            <img src="/checkbliss%20logo.png" alt="CheckinBliss" className="h-7 w-auto" />
          </div>
          <div className="font-display font-normal text-[42px] tracking-[0.01em] text-ink">CheckinBliss</div>
          <div className="font-sans text-[12px] tracking-[0.12em] uppercase text-mute mt-[6px]">Verified Hospitality</div>
          <h2 className="font-display font-normal text-[clamp(1.7rem,3.2vw,2.6rem)] max-w-[20ch] mx-auto mt-[48px] leading-[1.25] text-ink">
            Built on trust, shaped by detail, defined by <span className="text-mute">quality, intention, and care.</span>
          </h2>
        </div>
      </section>

      {/* Partner CTA — owner / operator recruitment */}
      <section className="py-[120px] bg-card border-y border-line">
        <div className="max-w-[1240px] mx-auto px-8 max-sm:px-5 text-center">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-green-soft mb-4">Join the platform</p>
          <h2 className="font-display font-normal text-[clamp(2rem,3.6vw,3rem)] leading-[1.15] tracking-[0.005em] text-ink max-w-[20ch] mx-auto mb-5">
            List your property or help us verify apartments in Lagos &amp; Abuja.
          </h2>
          <p className="font-sans text-[18px] leading-[1.6] text-ink-secondary max-w-[32ch] mx-auto mb-8">
            Join the platform built for the diaspora. Every apartment inspected in person. Every owner paid in their currency.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/signup" className="inline-flex items-center justify-center px-8 py-3.5 bg-brass text-soft font-sans text-[15px] font-semibold rounded-sm no-underline hover:bg-brass-dark transition-colors">
              Become an owner
            </Link>
            <Link href="/signup" className="inline-flex items-center justify-center px-8 py-3.5 border border-line text-ink font-sans text-[15px] font-semibold rounded-sm no-underline hover:border-brass hover:text-brass transition-colors">
              Become an operator
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
