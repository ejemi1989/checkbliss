"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { HeroSearch } from "@/components/hero-search";
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

const TRUSTPILOT_REVIEWS = [
  {
    text: "CheckinBliss has completely changed how I travel within Nigeria. Every apartment I&rsquo;ve booked has been immaculate &mdash; the photos are honest, the hosts are warm, and the booking process is seamless.",
    by: "Amara O.",
    date: "March 2026",
    location: "Lagos",
  },
  {
    text: "We have stayed in Lagos dozens of times over the years. This was the first time everything &mdash; from the airport transfer to the apartment &mdash; was handled before I arrived.",
    by: "Chidi O.",
    date: "February 2026",
    location: "Lagos",
  },
  {
    text: "Finally &mdash; a place in Abuja that understands privacy and consistency. Not a single issue during my two-week stay.",
    by: "Adaeze M.",
    date: "January 2026",
    location: "Abuja",
  },
];

const STAYS = [
  {
    slug: "lagoon-living",
    kicker: "Lagos",
    title: "Lagoon Living",
    href: "/lagos",
    link: "View apartments in Victoria Island \u2192",
    img: "/assets/images/stays/lagos-lagoon-living.avif",
  },
  {
    slug: "hills-hush",
    kicker: "Abuja",
    title: "Hills & Hush",
    href: "/abuja",
    link: "View apartments in Maitama \u2192",
    img: "/assets/images/stays/abuja-hills-hush.avif",
  },
  {
    slug: "private-pools",
    kicker: "By the water",
    title: "Private Pools",
    href: "/search?where=Lagos&amenities=pool",
    link: "View apartments with pools \u2192",
    img: "/assets/images/stays/private-pools.avif",
  },
  {
    slug: "maisonettes",
    kicker: "Space & privacy",
    title: "Maisonettes",
    href: "/search?where=Lagos",
    link: "View maisonettes in Lagos \u2192",
    img: "/assets/images/stays/maisonettes.avif",
  },
  {
    slug: "banana-island",
    kicker: "Lagos",
    title: "Banana Island",
    href: "/lagos",
    link: "View apartments on Banana Island \u2192",
    img: "/assets/images/stays/banana-island.avif",
  },
  {
    slug: "asokoro-calm",
    kicker: "Abuja",
    title: "Asokoro Calm",
    href: "/abuja",
    link: "View apartments in Asokoro \u2192",
    img: "/assets/images/stays/asokoro-calm.avif",
  },
];

export function HomePageClient() {

  const stepsRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [revIdx, setRevIdx] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const steps = stepsRef.current?.querySelectorAll(".wstep");
    if (!steps || steps.length === 0) return;
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
          }
        });
      },
      { threshold: 0.25 }
    );
    steps.forEach((s) => revealObs.observe(s));
    const activeObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Array.from(steps).indexOf(entry.target as HTMLElement);
            if (idx >= 0) {
              setActiveStep(idx);
              steps.forEach((s, i) => {
                s.classList.toggle("active", i === idx);
                s.classList.toggle("done", i <= idx);
              });
            }
          }
        });
      },
      { threshold: 0, rootMargin: "-40% 0px -40% 0px" }
    );
    steps.forEach((s) => activeObs.observe(s));
    return () => {
      revealObs.disconnect();
      activeObs.disconnect();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    const tracks = document.querySelectorAll("#staysTrack, .cats-grid");
    if (!tracks.length) return;

    const cleanups: (() => void)[] = [];

    tracks.forEach((track) => {
      const el = track as HTMLElement;
      let down = false, startX = 0, scrollStart = 0;

      const onDown = (e: Event) => {
        down = true;
        startX = (e as MouseEvent).pageX - el.offsetLeft;
        scrollStart = el.scrollLeft;
      };
      const onUp = () => {
        if (down) el.classList.remove("dragging");
        down = false;
      };
      const onMove = (e: Event) => {
        if (!down) return;
        e.preventDefault();
        el.classList.add("dragging");
        const x = (e as MouseEvent).pageX - el.offsetLeft;
        el.scrollLeft = scrollStart - (x - startX);
      };

      el.addEventListener("mousedown", onDown);
      window.addEventListener("mouseup", onUp);
      el.addEventListener("mouseleave", onUp);
      el.addEventListener("mousemove", onMove);

      cleanups.push(() => {
        el.removeEventListener("mousedown", onDown);
        window.removeEventListener("mouseup", onUp);
        el.removeEventListener("mouseleave", onUp);
        el.removeEventListener("mousemove", onMove);
        el.classList.remove("dragging");
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setRevIdx((i) => (i + 1) % TRUSTPILOT_REVIEWS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

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
          <h1>The Premium way to stay in Africa.</h1>
          <p className="hero-sub">Hand-selected luxury apartments in Lagos and Abuja. Book instantly from anywhere.</p>
        </div>
      </section>

      {/* ── Search bar ── */}
      <div className="search-wrap">
        <HeroSearch />
      </div>

      {/* ── Intro band ── */}
      <section className="intro">
        <div className="wrap">
          <h2>Arrive well. Leave <em>nothing to chance.</em></h2>
          <p>We eliminate the guesswork of premium travel. Every apartment is handpicked and verified in person, giving you hotel-grade certainty with the true feeling of home.</p>
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
            <Link href="/lagos" className="cat" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="cat-img">
                <img src="/assets/images/cats/lagos.avif" alt="Lagos" loading="lazy" />
              </div>
              <div className="cat-body">
                <p className="cat-kicker">Remarkably</p>
                <h3 className="cat-title">Lagos</h3>
                <span className="cat-link">View apartments in Lagos &rarr;</span>
              </div>
            </Link>
            <Link href="/search?where=Lagos&amenities=pool" className="cat" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="cat-img">
                <img src="/assets/images/cats/pool.avif" alt="Pool" loading="lazy" />
              </div>
              <div className="cat-body">
                <p className="cat-kicker">Apartments with a</p>
                <h3 className="cat-title">Pool</h3>
                <span className="cat-link">View apartments with private pools &rarr;</span>
              </div>
            </Link>
            <Link href="/abuja" className="cat" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="cat-img">
                <img src="/assets/images/cats/abuja-calm.avif" alt="Abuja" loading="lazy" />
              </div>
              <div className="cat-body">
                <p className="cat-kicker">Calmly</p>
                <h3 className="cat-title">Abuja</h3>
                <span className="cat-link">View apartments in Abuja &rarr;</span>
              </div>
            </Link>
          </div>
        </div>
        <div className="wrap">
          <p className="drag-hint">Drag to explore &rarr;</p>
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
          <h2>We reject 9 out<em> of 10 homes.</em></h2>
          <p>Most platforms list anything. We don&rsquo;t. If quality slips, listings are removed. We list fewer homes so you get a better stay.</p>
        </div>
      </section>

      {/* ── Featured Stays ── */}
      <section className="stays">
        <div className="wrap">
          <div className="stays-track" id="staysTrack">
            {STAYS.map((s) => (
              <Link key={s.slug} href={s.href} className="scard">
                <div className="cat-img">
                  <img src={s.img} alt={s.title} loading="lazy" />
                </div>
                <div className="cat-body">
                  <p className="cat-kicker">{s.kicker}</p>
                  <h3 className="cat-title">{s.title}</h3>
                  <span className="cat-link">{s.link}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div className="wrap">
          <p className="drag-hint">Drag to explore &rarr;</p>
        </div>
      </section>

      {/* ── How CheckinBliss Works ── */}
      <section className="works">
        <div className="wrap">
          <div className="works-grid">
            <aside className="works-aside">
              <p className="eyebrow">The process</p>
              <h2>How CheckinBliss works</h2>
              <div className="works-track">
                <div className="works-counter">
                  <span className="wc-num">0{activeStep + 1}</span>
                  <span className="wc-sep">/</span>
                  <span className="wc-total">03</span>
                </div>
                <div className="works-progress">
                  <span style={{ width: `${((activeStep + 1) / 3) * 100}%` }}></span>
                </div>
              </div>
            </aside>
            <div className="works-steps" ref={stepsRef}>
              {WORKS_STEPS.map((step) => (
                <div key={step.n} className="wstep" data-step={step.n}>
                  <div className="wstep-inner">
                    <div className="wstep-img">
                      <img src={step.img} alt={step.title} loading="lazy" />
                    </div>
                    <div className="wstep-body">
                      <span className="wstep-n">{step.n}</span>
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
          <h2>The standard, upheld.</h2>
          <div className="promise-grid">
            <div className="promise-card">
              <div className="cat-img">
                <img src="/assets/images/promise/inspected.avif" alt="" loading="lazy" />
              </div>
              <div className="cat-body">
                <p className="cat-kicker">Always</p>
                <h3 className="cat-title">Inspected</h3>
                <p className="cat-text">Zero remote approvals. Zero owner submissions. Physically vetted before launch and re-checked monthly.</p>
              </div>
            </div>
            <div className="promise-card">
              <div className="cat-img">
                <img src="/assets/images/promise/ours-to-present.avif" alt="" loading="lazy" />
              </div>
              <div className="cat-body">
                <p className="cat-kicker">Truth</p>
                <h3 className="cat-title">in Presentation</h3>
                <p className="cat-text">No user-generated content. Every photograph and description is produced by our team. You see reality.</p>
              </div>
            </div>
            <div className="promise-card">
              <div className="cat-img">
                <img src="/assets/images/promise/mediated.avif" alt="" loading="lazy" />
              </div>
              <div className="cat-body">
                <p className="cat-kicker">Personally</p>
                <h3 className="cat-title">Mediated</h3>
                <p className="cat-text">No distant hosts. No arguments. Our local teams step in and resolve issues directly on the ground.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Our Standard (the creed) ── */}
      <section className="standard">
        <div className="standard-content">
          <p>
            We don&rsquo;t ask you to trust strangers&rsquo; reviews. We ask you to trust <em>the work we put in</em> before a single guest arrives.
          </p>
        </div>
      </section>

      {/* ── Trustpilot reviews ── */}
      <section className="testi">
        <div className="wrap">
          <div className="testi-head">
            <p className="section-label" style={{ marginBottom: 0 }}>Trusted by guests</p>
            <h2 className="testi-title">What our guests say</h2>
          </div>
          <div className="review-stage">
            <button className="rev-arrow" aria-label="Previous review" onClick={() => setRevIdx((i) => (i - 1 + TRUSTPILOT_REVIEWS.length) % TRUSTPILOT_REVIEWS.length)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div className="review-window">
              {TRUSTPILOT_REVIEWS.map((r, i) => (
                <div key={i} className={`review${i === revIdx ? " active" : ""}`}>
                  <p>{r.text}</p>
                  <div className="r-by">&mdash; {r.by}</div>
                  <div className="r-date" style={{ fontSize: "12px", color: "var(--mute)", marginTop: "4px" }}>{r.date} &middot; {r.location}</div>
                </div>
              ))}
            </div>
            <button className="rev-arrow" aria-label="Next review" onClick={() => setRevIdx((i) => (i + 1) % TRUSTPILOT_REVIEWS.length)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
          <div className="reviews-nav" id="revDots">
            {TRUSTPILOT_REVIEWS.map((_, i) => (
              <button
                key={i}
                className={`rev-dot${i === revIdx ? " active" : ""}`}
                aria-label={`Review ${i + 1}`}
                onClick={() => setRevIdx(i)}
              />
            ))}
          </div>
          <div style={{ marginTop: "var(--s8)" }}>
            <a href="#" className="r-link">See all reviews on Trustpilot &rarr;</a>
          </div>
        </div>
      </section>

      {/* ── Closing band ── */}
      <section className="closing">
        <div className="wrap">
          <div className="closing-logo">
            <img src="/assets/images/logo/Logo-DG.png" alt="CheckinBliss" className="closing-logo-img" />
          </div>
          <h2>
            Built on trust, shaped by detail, defined by <span className="fade">quality, intention, and care.</span>
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
            <p className="nl-legal">No spam. Unsubscribe anytime. <a href="/policy">Privacy Policy</a>.</p>
          </div>
          <form className="nl-form" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Enter your email address" aria-label="Email address" required />
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
              <a href="/list-property" className="fcol-link">List your property</a>
              <span className="fcol-link fcol-link--coming">Partnerships</span>
              <span className="fcol-link fcol-link--soon">
                Affiliate programme<span className="fcol-soon-badge">Soon</span>
              </span>
              <span className="fcol-link fcol-link--coming">Journal</span>
              <span className="fcol-link fcol-link--coming">CheckinBliss vs Airbnb</span>
            </div>
            <div>
              <p className="fcol-head">Support</p>
              <a href="#" className="fcol-link">Help centre</a>
              <a href="mailto:hello@checkinbliss.com" className="fcol-link">Contact us</a>
              <a href="/policy" className="fcol-link">Policy</a>
              <span className="fcol-link fcol-link--soon">
                Reviews<span className="fcol-soon-badge">Soon</span>
              </span>
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
                <span className="foot-sep">&middot;</span>
                <span className="foot-dest-soon">Coming soon:</span>
                <span className="foot-dest-muted">Port Harcourt, Accra, Nairobi</span>
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
