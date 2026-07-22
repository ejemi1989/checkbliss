"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import "./landing.css";



const WORKS_STEPS = [
  {
    n: "01",
    title: "Browse Vetted Homes",
    body:
      "Curated apartments inspected in person, photographed editorially, and verified monthly.",
    img: "/assets/images/works/step-1-browse.avif",
  },
  {
    n: "02",
    title: "Book Securely",
    body:
      "Pay instantly in GBP, USD, or EUR. Security deposits are held, never charged upfront.",
    img: "/assets/images/works/step-2-book.avif",
  },
  {
    n: "03",
    title: "Arrive with Confidence",
    body:
      "Our local teams handle the logistics. If anything isn\u2019t right, we fix it on the spot.",
    img: "/assets/images/works/step-3-arrive.avif",
  },
];

const STAYS = [
  {
    slug: "lagoon-view-loft",
    name: "Lagoon View Loft",
    kicker: "Lagos \u00B7 Victoria Island",
    href: "/lagos/victoria-island/ocean-parade-towers/lagoon-view-loft",
    img: "/assets/images/stays/lagos-lagoon-living.avif",
  },
  {
    slug: "maitama-garden-studios",
    name: "Maitama Garden Studios",
    kicker: "Abuja \u00B7 Maitama",
    href: "/abuja/maitama/yakubu-gowon-gardens/maitama-garden-studios",
    img: "/assets/images/stays/abuja-hills-hush.avif",
  },
  {
    slug: "jabi-lake-penthouse",
    name: "Jabi Lake Penthouse",
    kicker: "Abuja \u00B7 Jabi",
    href: "/abuja/jabi/jabi-lake-tower/jabi-lake-penthouse",
    img: "/assets/images/stays/jabi-lake-penthouse.avif",
  },
  {
    slug: "the-palms-maisonette",
    name: "The Palms Maisonette",
    kicker: "Lagos \u00B7 Victoria Island",
    href: "/lagos/victoria-island/ahmadu-bello-mansions/the-palms-maisonette",
    img: "/assets/images/stays/maisonettes.avif",
  },
  {
    slug: "banana-island-villa",
    name: "Banana Island Villa",
    kicker: "Lagos \u00B7 Banana Island",
    href: "/lagos/banana-island/banana-island-estate/banana-island-villa",
    img: "/assets/images/stays/banana-island.avif",
  },
  {
    slug: "asokoro-state-house-view",
    name: "Asokoro State House View",
    kicker: "Abuja \u00B7 Asokoro",
    href: "/abuja/asokoro/diplomatic-ridge/asokoro-state-house-view",
    img: "/assets/images/stays/asokoro-calm.avif",
  },
];

export function HomePageClient() {

  const stepsRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const steps = stepsRef.current?.querySelectorAll(".wstep");
    if (!steps || steps.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            const idx = Array.from(steps).indexOf(entry.target as HTMLElement);
            if (idx >= 0) setActiveStep(Math.max(idx, activeStep));
          }
        });
      },
      { threshold: 0.25 }
    );
    steps.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [activeStep]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div>
      {/* ── Hero + Nav ── */}
      <section className="hero">
        <img
          className="hero-bg"
          src="/assets/images/hero/hero-01.jpg"
          alt=""
          loading="eager"
        />
        <div className="hero-shade"></div>
        <nav aria-label="Main navigation">
          <div className="nav-inner">
            <div className="nav-side">
              <span className="lang-pill">
                <span>EN</span>
                <span className="divider">|</span>
                <span>USD</span>
              </span>
            </div>
            <Link href="/" className="logo">
              <img src="/assets/images/logo/Logo1.png" alt="CheckinBliss" className="logo-img" />
            </Link>
            <div className="nav-side nav-right" ref={menuRef}>
              <div className="menu-dropdown-wrap">
                <button
                  className="menu-pill"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="Menu"
                  aria-expanded={menuOpen}
                >
                  <span className="burger" aria-hidden="true">
                    <span></span><span></span><span></span>
                  </span>
                  <span className="avatar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                </button>
                {menuOpen && (
                  <div className="menu-dropdown">
                    <Link href="/login" className="menu-dropdown-item" onClick={() => setMenuOpen(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                        <polyline points="10 17 15 12 10 7"/>
                        <line x1="15" y1="12" x2="3" y2="12"/>
                      </svg>
                      Sign in
                    </Link>
                    <Link href="/signup" className="menu-dropdown-item" onClick={() => setMenuOpen(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="8.5" cy="7" r="4"/>
                        <line x1="20" y1="8" x2="20" y2="14"/>
                        <line x1="23" y1="11" x2="17" y2="11"/>
                      </svg>
                      Create account
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>
        <div className="hero-content">
          <p className="eyebrow" style={{ color: "rgba(255,255,255,0.7)", marginBottom: "var(--s4)" }}>Lagos &amp; Abuja</p>
          <h1>The premium way to stay in Africa</h1>
          <p className="hero-sub">Hand-selected luxury apartments in Lagos and Abuja. Book instantly from anywhere.</p>
        </div>
      </section>

      {/* ── Search bar ── */}
      <div className="search-wrap">
        <div className="search">
          <div className="field">
            <label>Where</label>
            <span>Lagos, Nigeria</span>
          </div>
          <div className="field">
            <label>Check-in</label>
            <span>22 Jun 2026</span>
          </div>
          <div className="field">
            <label>Check-out</label>
            <span>26 Jun 2026</span>
          </div>
          <div className="field">
            <label>Guests</label>
            <span>2 guests</span>
          </div>
          <Link href="/search" className="search-btn" style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
            Search
          </Link>
        </div>
      </div>

      {/* ── Intro band ── */}
      <section className="intro">
        <div className="wrap">
          <p className="eyebrow">Arrive well. Leave nothing to chance.</p>
          <h2>
            We eliminate the guesswork of premium travel. Every apartment is handpicked and verified in person, giving you hotel-grade certainty with the <em>true feeling of home</em>.
          </h2>
        </div>
      </section>

      {/* ── Browse by Category ── */}
      <section className="cats">
        <div className="wrap">
          <p className="eyebrow cats-eyebrow">Explore</p>
          <h2 className="cats-headline">Where would you like to stay?</h2>
        </div>
        <div className="wrap">
          <div className="cats-grid">
            <article className="cat">
              <Link href="/lagos" style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", flex: 1 }}>
                <div className="cat-img">
                  <img src="/assets/images/cats/lagos.avif" alt="Lagos" loading="lazy" />
                </div>
                <div className="cat-body">
                  <p className="cat-kicker">Remarkably Lagos</p>
                  <h3 className="cat-title">Lagos</h3>
                  <p>Island apartments with Atlantic views, from Ikoyi to Victoria Island.</p>
                  <span className="cat-link">View apartments in Lagos &rarr;</span>
                </div>
              </Link>
            </article>
            <article className="cat">
              <Link href="/lagos" style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", flex: 1 }}>
                <div className="cat-img">
                  <img src="/assets/images/stays/maisonettes.avif" alt="Maisonettes" loading="lazy" />
                </div>
                <div className="cat-body">
                  <p className="cat-kicker">Space &amp; Privacy</p>
                  <h3 className="cat-title">Maisonettes</h3>
                  <p>Multi-level homes with room to live, work, and entertain.</p>
                  <span className="cat-link">View maisonettes in Lagos &rarr;</span>
                </div>
              </Link>
            </article>
            <article className="cat">
              <Link href="/abuja" style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", flex: 1 }}>
                <div className="cat-img">
                  <img src="/assets/images/cats/abuja-calm.avif" alt="Abuja" loading="lazy" />
                </div>
                <div className="cat-body">
                  <p className="cat-kicker">Calmly Abuja</p>
                  <h3 className="cat-title">Abuja</h3>
                  <p>Spacious residences in Maitama, Asokoro, and Jabi. Built for longer stays.</p>
                  <span className="cat-link">View apartments in Abuja &rarr;</span>
                </div>
              </Link>
            </article>
          </div>
        </div>
        <div className="wrap">
          <p className="drag-hint">Drag to explore</p>
        </div>
      </section>

      {/* ── Big quote ── */}
      <section className="bigquote">
        <img
          className="bigquote-bg"
          src="/assets/images/quotes/bigquote-bg.avif"
          alt=""
          loading="lazy"
        />
        <div className="bigquote-shade"></div>
        <div className="bigquote-content">
          <span className="mark">&ldquo;</span>
          <p>You&rsquo;ll never settle for an <em>ordinary stay</em> again.</p>
          <p className="attr">&mdash; Pulse</p>
        </div>
      </section>

      {/* ── We reject 9 out of 10 ── */}
      <section className="reject">
        <div className="wrap">
          <p className="reject-num">9/10</p>
          <h2>We reject 9 out of 10 homes.</h2>
          <p>Most platforms list anything. We don&rsquo;t. If quality slips, listings are removed. We list fewer homes so you get a better stay.</p>
        </div>
      </section>

      {/* ── Featured Stays ── */}
      <section className="stays">
        <div className="wrap">
          <div className="stays-head">
            <div>
              <span className="eyebrow">Hand-selected stays</span>
              <h2>Featured apartments</h2>
            </div>
            <Link href="/lagos" className="cat-link" style={{ alignSelf: "flex-end" }}>View all stays &rarr;</Link>
          </div>
          <div className="stays-track">
            {STAYS.map((s) => (
              <Link key={s.slug} href={s.href} className="scard">
                <div className="cat-img">
                  <img src={s.img} alt={s.name} loading="lazy" />
                </div>
                <div className="cat-body">
                  <p className="cat-kicker">{s.kicker}</p>
                  <h3 className="cat-title">{s.name}</h3>
                  <span className="cat-link">View &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div className="wrap">
          <p className="drag-hint">Drag to explore</p>
        </div>
      </section>

      {/* ── How CheckinBliss Works ── */}
      <section className="works">
        <div className="wrap">
          <div className="works-grid">
            <aside className="works-aside">
              <p className="eyebrow">How it works</p>
              <h2>Three steps to bliss.</h2>
              <div className="works-counter">
                <span className="wc-num">0{activeStep + 1}</span>
                <span className="wc-sep">/</span>
                <span className="wc-total">03</span>
              </div>
              <div className="works-progress">
                <span style={{ width: `${((activeStep + 1) / 3) * 100}%` }}></span>
              </div>
            </aside>
            <div className="works-steps" ref={stepsRef}>
              {WORKS_STEPS.map((step) => (
                <div key={step.n} className="wstep">
                  <div className="wstep-inner">
                    <div className="wstep-img">
                      <img src={step.img} alt={step.title} loading="lazy" />
                    </div>
                    <div className="wstep-body">
                      <span className="wstep-n">Step {step.n}</span>
                      <h3>{step.title}</h3>
                      <p>{step.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Promise ── */}
      <section className="promise">
        <div className="wrap">
          <p className="eyebrow" style={{ textAlign: "center", display: "block" }}>The Standard, Upheld</p>
          <h2>Every stay, verified</h2>
          <div className="promise-grid">
            <div className="promise-card">
              <svg className="promise-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3>Always Inspected</h3>
              <p>Zero remote approvals. Zero owner submissions. Physically vetted before launch and re-checked monthly.</p>
            </div>
            <div className="promise-card">
              <svg className="promise-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
              <h3>Truth in&nbsp;Presentation</h3>
              <p>No user-generated content. Every photograph and description is produced by our team. You see reality.</p>
            </div>
            <div className="promise-card">
              <svg className="promise-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3>Personally Mediated</h3>
              <p>No distant hosts. No arguments. Our local teams step in and resolve issues directly on the ground.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Our Standard (the creed) ── */}
      <section className="standard">
        <div className="standard-content">
          <p>
            </p>
        </div>
      </section>

      {/* ── Closing band ── */}
      <section className="closing">
        <div className="wrap">
          <div className="closing-logo">
            <img src="/assets/images/logo/Logo1.png" alt="CheckinBliss" className="closing-logo-img" />
          </div>
          <h2>
            Built on <span className="fade">trust, shaped by detail, defined by</span> quality, intention, and care.
          </h2>
        </div>
      </section>

      {/* ── Newsletter — The Insider List ── */}
      <section className="nl">
        <img className="nl-bg" src="/assets/images/newsletter-bg.jpg" alt="" loading="lazy" />
        <div className="nl-shade"></div>
        <div className="nl-content">
          <div className="nl-text">
            <p className="nl-eyebrow">The Insider List</p>
            <h2>New homes, exclusive offers, and early access.</h2>
            <p className="nl-legal">No spam. Unsubscribe anytime. <a href="#">Privacy Policy</a></p>
          </div>
          <form className="nl-form" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Your email" aria-label="Email" required />
            <button type="submit" className="nl-btn">Subscribe</button>
          </form>
        </div>
      </section>

      {/* ── Site footer ── */}
      <footer className="site-footer">
        <div className="wrap">
          <div className="foot-nav">
            <div>
              <p className="fcol-head">Explore</p>
              <span className="fcol-link--soon">
                <span>List your property</span>
              </span>
              <span className="fcol-link fcol-link--coming">Partnerships</span>
              <span className="fcol-link fcol-link--coming">Affiliate programme</span>
              <span className="fcol-link fcol-link--coming">Journal</span>
              <span className="fcol-link fcol-link--coming">CheckinBliss vs Airbnb</span>
            </div>
            <div>
              <p className="fcol-head">Support</p>
              <a href="#" className="fcol-link">Help centre</a>
              <a href="mailto:hello@checkinbliss.com" className="fcol-link">Contact us</a>
              <a href="#" className="fcol-link">Policy</a>

            </div>
            <div>
              <p className="fcol-head">CheckinBliss</p>
              <a href="#" className="fcol-link">Our story</a>
              <a href="#" className="fcol-link">The CheckinBliss standard</a>
              <a href="#" className="fcol-link">CheckinBliss for business</a>
              <a href="#" className="fcol-link">Press</a>
            </div>
          </div>
          <div className="foot-bottom">
            <div className="foot-row foot-row--statement">
              <div className="foot-row">
                <Link href="/lagos" className="foot-dest-link">Lagos</Link>
                <span className="foot-sep">&middot;</span>
                <Link href="/abuja" className="foot-dest-link">Abuja</Link>
                <span className="foot-dest-soon">Coming soon: Port Harcourt, Accra, Nairobi</span>
              </div>
              <div className="foot-socials">
                <a href="#" className="foot-social-link" aria-label="Instagram">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="2" width="20" height="20" rx="5"/>
                    <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
                  </svg>
                </a>
                <a href="#" className="foot-social-link" aria-label="TikTok">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 12a4 4 0 104 4V4a5 5 0 005 5"/>
                  </svg>
                </a>
              </div>
            </div>
            <div className="foot-row foot-row--statement">
              <p className="foot-legal">CheckinBliss is operated by Lyxio Curtis Ltd, a UK-registered company. Company number SC863027. &copy; 2026</p>
              <div className="foot-row">
                <a href="#" className="foot-legal-link">Privacy</a>
                <span className="foot-sep">&middot;</span>
                <a href="#" className="foot-legal-link">Terms</a>
                <span className="foot-sep">&middot;</span>
                <a href="#" className="foot-legal-link">Cookies</a>
                <span className="foot-sep">&middot;</span>
                <a href="#" className="foot-legal-link">Accessibility</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
