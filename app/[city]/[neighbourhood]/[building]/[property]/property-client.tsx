"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { MapBox } from "@/components/map-box";
import { NEIGHBOURHOOD_COORDS } from "@/lib/map-coords";

export interface PropertyClientProps {
  property: {
    id: string;
    name: string;
    branded_name: string;
    building_name: string;
    neighbourhood: string;
    city: string;
    country: string;
    description: string;
    images: string[];
    cover_photo_url: string;
    amenities: string[];
    route_note: string;
    bedrooms: number;
    bathrooms: number;
    sleeps: number;
    nightly_rate_minor: number;
    deposit_minor: number;
    extended_checkout_offered: boolean;
    extended_checkout_price_minor: number;
    currency: string;
    slug: string;
  };
  formattedNightly: string;
  formattedDeposit: string;
  formattedExtended: string | null;
  cityHref: string;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

const HOME_TRUTHS = [
  "The building runs on generator during grid outages, which is most evenings. It is housed two floors below and audible as a low hum in the second bedroom, though not in the living room or main bedroom.",
  "Ozumba Mbadiwe traffic builds heavily between 4pm and 8pm on weekdays. Journeys that take fifteen minutes at midday can take fifty in that window — worth planning around rather than being surprised by.",
  "The third bedroom is genuinely smaller than the other two and takes a double rather than a king. It works well for a child or a single traveller.",
  "Housekeeping visits on Mondays and Thursdays between 10am and midday. You can decline either visit by messaging us in advance.",
  "There is no lift attendant after 10pm. The service lift requires a key fob, which is left in the apartment.",
];

const ROUTE_LEGS = [
  { title: "Murtala Muhammed International to Ikeja", detail: "Leave the international terminal and join the airport road towards Oshodi. Dual carriageway the whole way, resurfaced and well lit.", meta: ["15 min", "Good road", "Lit at night"] },
  { title: "Ikeja to Third Mainland Bridge", detail: "Through Oshodi and onto the bridge approach. This is the stretch that determines your journey time — free-flowing at midday, slow from mid-afternoon. Surface is sound but uneven in places.", meta: ["20–40 min", "Moderate road", "Lit at night"] },
  { title: "Third Mainland Bridge to Ikoyi", detail: "The long crossing over the lagoon. Well maintained and fast once you are on it. Lighting is good across the span, with a short unlit section near the Adekunle exit.", meta: ["15 min", "Good road", "Mostly lit"] },
  { title: "Ikoyi to Ozumba Mbadiwe", detail: "Across Falomo Bridge onto Victoria Island, then right along the lagoon front. Smooth surface, heavy signage, busy but orderly.", meta: ["10 min", "Good road", "Lit at night"] },
  { title: "Ozumba Mbadiwe to the apartment", detail: "Turn off onto a short residential side street. The last hundred metres are paved but narrow, with speed bumps. The gate is manned around the clock and the security team holds your name on arrival.", meta: ["3 min", "Paved, narrow", "Gate lit"] },
];

export function PropertyClient({ property: prop, formattedNightly, formattedDeposit, formattedExtended, cityHref }: PropertyClientProps) {
  const [amenModal, setAmenModal] = useState(false);
  const [configModal, setConfigModal] = useState(false);
  const [lateCheckout, setLateCheckout] = useState(false);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(3);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const nights = checkIn && checkOut
    ? Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0;
  const accommodationTotal = nights * prop.nightly_rate_minor;
  const extendedFee = lateCheckout && prop.extended_checkout_offered ? prop.extended_checkout_price_minor : 0;
  const total = accommodationTotal + extendedFee;

  const galleryImgs = prop.images.length >= 2
    ? [prop.images[0], prop.images[1] || prop.cover_photo_url]
    : [prop.cover_photo_url, prop.cover_photo_url];

  const propCoords = useMemo(() => {
    return [{
      lat: NEIGHBOURHOOD_COORDS[prop.neighbourhood]?.lat ?? (prop.city === "Abuja" ? 9.0695 : 6.4295),
      lng: NEIGHBOURHOOD_COORDS[prop.neighbourhood]?.lng ?? (prop.city === "Abuja" ? 7.4837 : 3.4219),
      label: prop.branded_name,
    }];
  }, [prop.neighbourhood, prop.city, prop.branded_name]);

  if (!mounted) {
    return <div className="min-h-screen bg-bone" />;
  }

  return (
    <>
      <header className="prop-header">
        <nav>
          <div className="nav-inner">
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

      {/* Gallery */}
      <section className="gallery" aria-label={`Photographs of ${prop.branded_name}`}>
        <figure className="gal-frame">
          <div className="gal-img" style={{ backgroundImage: `url('${galleryImgs[0]}')` }}></div>
        </figure>
        <figure className="gal-frame">
          <div className="gal-img" style={{ backgroundImage: `url('${galleryImgs[1]}')` }}></div>
          <button className="gal-all" id="galleryBtn">View all {prop.images.length || 28} photographs</button>
        </figure>
      </section>

      <main className="prop-main"
        data-property-id={prop.slug}
        data-nightly-rate={Math.round(prop.nightly_rate_minor / 100)}
        data-late-checkout-price={prop.extended_checkout_offered ? Math.round(prop.extended_checkout_price_minor / 100) : 0}
        data-security-deposit={Math.round(prop.deposit_minor / 100)}
        data-currency="USD"
        data-max-guests={prop.sleeps}
        data-bedrooms={prop.bedrooms}
        data-bathrooms={prop.bathrooms}
      >
        <div className="prop-grid">
          {/* LEFT COLUMN */}
          <div className="prop-col">
            {/* Identity */}
            <header className="prop-intro">
              <nav className="crumb" aria-label="Breadcrumb">
                <Link href="/">Home</Link><span className="sep">/</span><Link href={cityHref}>{prop.city}</Link><span className="sep">/</span><span>{prop.neighbourhood.split(",")[0]}</span>
              </nav>
              <h1 className="prop-name">{prop.branded_name}</h1>
              <div className="prop-place">{prop.neighbourhood.split(",")[0]}, {prop.city}</div>

              <ul className="statrow">
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="8" r="3" />
                    <path d="M3 19c.6-3.4 3-5.2 6-5.2s5.4 1.8 6 5.2" />
                    <circle cx="17" cy="8.6" r="2.4" />
                    <path d="M16.4 13.9c2.3.3 3.9 2 4.4 5.1" />
                  </svg>
                  <span>Up to {prop.sleeps} guests</span>
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18v-7.5h18V18" />
                    <path d="M3 18v2M21 18v2" />
                    <path d="M6 10.5V7.5h12v3" />
                    <path d="M6.5 13.5h4" />
                  </svg>
                  <span>{prop.bedrooms} bedrooms, {prop.bedrooms} beds</span>
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 13h16v2.5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" />
                    <path d="M7 13V6.2A2.2 2.2 0 0 1 9.2 4c1.1 0 1.9.7 2.1 1.7" />
                    <path d="M6 19.5 5 21.5M18 19.5l1 2" />
                  </svg>
                  <span>{prop.bathrooms} bathrooms</span>
                </li>
              </ul>

              <p className="prop-lede">{prop.description}</p>
            </header>

            {/* Home truths */}
            <section className="block" aria-labelledby="truths-h">
              <h2 className="block-h block-h-sm" id="truths-h">Home truths</h2>
              <ul className="truths">
                {HOME_TRUTHS.map((truth, i) => (
                  <li key={i}>
                    <span className="truth-mark" aria-hidden="true">i</span>
                    <p>{truth}</p>
                  </li>
                ))}
              </ul>
            </section>

            {/* About this stay */}
            <section className="block" aria-labelledby="stay-h">
              <h2 className="block-h" id="stay-h">About this stay</h2>

              <h3 className="sub-h">Amenities</h3>
              <ul className="amen-grid" id="amenPreview">
                {prop.amenities.slice(0, 6).map((a) => (
                  <li key={a}><span className="tick" aria-hidden="true"></span>{a}</li>
                ))}
              </ul>
              {prop.amenities.length > 6 && (
                <button className="ghost-btn" id="amenBtn" onClick={() => setAmenModal(true)} aria-haspopup="dialog">
                  Show all {prop.amenities.length} amenities
                </button>
              )}

              <h3 className="sub-h sub-h-gap">Bedrooms &amp; bathrooms</h3>
              <ul className="config-summary">
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18v-7.5h18V18" />
                    <path d="M3 18v2M21 18v2" />
                    <path d="M6 10.5V7.5h12v3" />
                  </svg>
                  <span>{prop.bedrooms} bedrooms, {prop.bedrooms} beds</span>
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 13h16v2.5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" />
                    <path d="M7 13V6.2A2.2 2.2 0 0 1 9.2 4c1.1 0 1.9.7 2.1 1.7" />
                  </svg>
                  <span>{prop.bathrooms} bathrooms</span>
                </li>
              </ul>
              <button className="ghost-btn" id="configBtn" onClick={() => setConfigModal(true)} aria-haspopup="dialog">
                Show configuration
              </button>
            </section>

            {/* Extras */}
            <section className="block" aria-labelledby="extras-h">
              <h2 className="block-h" id="extras-h">Extras</h2>
              <p className="block-note">Arranged by us · Subject to availability</p>

              {prop.extended_checkout_offered && formattedExtended && (
                <div className="extra-row">
                  <div className="extra-copy">
                    <h3 className="extra-title">Late checkout</h3>
                    <p>
                      Stay until 6:00pm on your departure day rather than 11:00am. Useful when your flight leaves late and you would rather not spend the afternoon at the airport. We confirm availability against the following booking, so request it as early as you can.
                    </p>
                  </div>
                  <div className="extra-action">
                    <button
                      className="extra-price-set"
                      id="lateCheckoutBtn"
                      aria-pressed={lateCheckout}
                      aria-label={`Add late checkout for ${formattedExtended}`}
                      onClick={() => setLateCheckout((v) => !v)}
                    >
                      {formattedExtended}
                    </button>
                    <span className="extra-price-note" id="lateCheckoutNote">per stay · tap to {lateCheckout ? "remove" : "add"}</span>
                  </div>
                </div>
              )}

              <div className="extra-row">
                <div className="extra-copy">
                  <h3 className="extra-title">Something else</h3>
                  <p>
                    Airport pickup, a stocked fridge on arrival, a cot, a driver for the week. Tell us what you need and we will tell you honestly whether we can arrange it.
                  </p>
                </div>
                <div className="extra-action">
                  <a href="mailto:hello@checkinbliss.com" className="solid-btn no-underline" style={{ display: "inline-block", cursor: "pointer" }}>Send us a message</a>
                </div>
              </div>
            </section>
          </div>

          {/* STICKY BOOKING CARD */}
          <aside className="book-col" id="bookCol">
            <div className="bookcard" id="bookCard">
              <div className="bookcard-price">
                <span className="bc-amount">{formattedNightly}</span>
                <span className="bc-per">per night</span>
              </div>

              <div className="bc-badges">
                <span className="bc-badge">Free cancellation</span>
                {prop.extended_checkout_offered && <span className="bc-badge">Late checkout available</span>}
              </div>

              <div className="bc-fields">
                <div className="bc-dates">
                  <label className="bc-field">
                    <span className="bc-label">Check in</span>
                    <input type="date" id="checkIn" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} aria-label="Check-in date" />
                  </label>
                  <label className="bc-field">
                    <span className="bc-label">Check out</span>
                    <input type="date" id="checkOut" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} aria-label="Check-out date" />
                  </label>
                </div>
                <label className="bc-field bc-field-wide">
                  <span className="bc-label">Guests</span>
                  <select id="guests" value={guests} onChange={(e) => setGuests(parseInt(e.target.value))} aria-label="Number of guests">
                    {Array.from({ length: prop.sleeps }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} guest{n > 1 ? "s" : ""}</option>
                    ))}
                  </select>
                </label>
              </div>

              <dl className="bc-breakdown" aria-live="polite" aria-atomic="true">
                {nights > 0 && (
                  <div className="bc-line">
                    <dt id="bcNightsLabel">{formattedNightly} × {nights} night{nights > 1 ? "s" : ""}</dt>
                    <dd id="bcNightsValue">{`$${(accommodationTotal / 100).toLocaleString()}`}</dd>
                  </div>
                )}
                {lateCheckout && prop.extended_checkout_offered && (
                  <div className="bc-line" id="bcLateCheckoutLine">
                    <dt>Late checkout</dt>
                    <dd id="bcLateCheckoutValue">{formattedExtended}</dd>
                  </div>
                )}
                {nights > 0 && (
                  <div className="bc-line bc-total">
                    <dt>Total</dt>
                    <dd id="bcTotal">{`$${(total / 100).toLocaleString()}`}</dd>
                  </div>
                )}
              </dl>

              <div className="bc-deposit">
                <div className="bc-deposit-row">
                  <span className="bc-deposit-label">
                    Security deposit
                    <span className="bc-deposit-badge">card hold</span>
                  </span>
                  <span className="bc-deposit-amt" id="bcDepositAmt">{formattedDeposit}</span>
                </div>
                <p className="bc-deposit-sub">Refunded on checkout · not included in total above</p>
                <Link href="/policy" className="text-link">View terms</Link>
              </div>

              <Link href={`/book/${prop.slug}`} className="bc-cta">Reserve</Link>
              <p className="bc-foot">
                Your card is charged in full at booking. The security deposit hold is separate and returned after checkout. Free cancellation applies — see cancellation terms below.
              </p>
            </div>
          </aside>
        </div>

        {/* FULL WIDTH FROM HERE */}
        <div className="prop-wide">
          {/* Local area */}
          <section className="block" aria-labelledby="area-h">
            <h2 className="block-h" id="area-h">About {prop.neighbourhood.split(",")[0]}</h2>
            <div className="area-grid">
              <div className="area-copy">
                <p>
                  {prop.neighbourhood.split(",")[0]} is where {prop.city} does its business and, increasingly, where it eats. Once a residential district of low-rise houses and wide streets, it now carries most of the city&rsquo;s corporate towers, the better restaurants, and a growing number of galleries. The result is a neighbourhood that runs on a weekday rhythm — busy and formal until seven, then loosening considerably.
                </p>
                <p>
                  For a returnee it has one obvious practical virtue: almost everything you will want is within a short drive, and the roads that matter are among the best maintained in the city. Ozumba Mbadiwe and Ahmadu Bello run the length of the island and are lit through the night. Restaurants cluster around Akin Adesola and Adeola Odeku, both a few minutes from the apartment.
                </p>
                <p>
                  It is not a quiet neighbourhood in the way Ikoyi is quiet. There is construction, there is traffic, and there is noise on Friday nights. What it offers instead is proximity — to the airport road, to the island&rsquo;s restaurants, and to the lagoon itself.
                </p>
              </div>
              <aside className="area-facts">
                <h3 className="facts-h">Worth knowing</h3>
                <dl>
                  <div><dt>Best for</dt><dd>Business, restaurants, short stays</dd></div>
                  <div><dt>Character</dt><dd>Corporate by day, social by night</dd></div>
                  <div><dt>Road quality</dt><dd>Good on main routes, mixed on side streets</dd></div>
                  <div><dt>Night lighting</dt><dd>Consistent on arterial roads</dd></div>
                  <div><dt>Nearest island</dt><dd>Ikoyi, 10 minutes by car</dd></div>
                </dl>
              </aside>
            </div>
          </section>

          {/* Map */}
          <section className="block" aria-labelledby="map-h">
            <h2 className="block-h" id="map-h">Where you will be</h2>
            <p className="block-note">
              The apartment and Murtala Muhammed International, so you can see the journey before you land.
            </p>
            <div className="mapwrap">
              <MapBox
                markers={propCoords}
                center={propCoords[0]}
                zoom={14}
                className="propmap"
                height="100%"
              />
            </div>
            <ul className="map-key">
              <li><span className="key-dot key-home" aria-hidden="true"></span>{prop.branded_name}, {prop.neighbourhood.split(",")[0]}</li>
              <li><span className="key-dot key-air" aria-hidden="true"></span>Murtala Muhammed International (LOS)</li>
            </ul>
          </section>

          {/* Getting here from the airport */}
          <section className="block" aria-labelledby="route-h">
            <h2 className="block-h block-h-sm" id="route-h">Getting here from the airport</h2>
            <p className="block-note">Roughly 55–75 minutes outside peak. Allow two hours if you land between 4pm and 8pm on a weekday.</p>

            <ol className="legs">
              {ROUTE_LEGS.map((leg, i) => (
                <li key={i} className={`leg ${i === ROUTE_LEGS.length - 1 ? "leg-last" : ""}`}>
                  <div className="leg-line" aria-hidden="true">
                    <span className={`leg-node ${i === ROUTE_LEGS.length - 1 ? "leg-node-end" : ""}`}></span>
                  </div>
                  <div className="leg-body">
                    <h3 className="leg-title">{leg.title}</h3>
                    <p className="leg-detail">{leg.detail}</p>
                    <ul className="leg-meta">
                      {leg.meta.map((m, j) => <li key={j}>{m}</li>)}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>

            <p className="route-stamp">Route last driven and verified by our {prop.city} city manager — June 2026</p>
          </section>

          {/* Local shops & lifestyle */}
          <div className="block services-lifestyle-grid" role="group" aria-label="Local services and lifestyle">
            <section aria-labelledby="services-h">
              <h2 className="block-h block-h-sm" id="services-h">Local shops &amp; services</h2>
              <ul className="svc-list">
                <li><span className="svc-name">Supermarket</span><span className="svc-time">6 min drive</span></li>
                <li><span className="svc-name">Pharmacy</span><span className="svc-time">8 min walk</span></li>
                <li><span className="svc-name">Private hospital</span><span className="svc-time">12 min drive</span></li>
                <li><span className="svc-name">ATM / bank</span><span className="svc-time">5 min walk</span></li>
              </ul>
            </section>

            <section aria-labelledby="lifestyle-h">
              <h2 className="block-h block-h-sm" id="lifestyle-h">Lifestyle</h2>
              <ul className="lifestyle-list">
                <li><span className="svc-name">Restaurant clusters</span><span className="svc-time">20 min walk</span></li>
                <li><span className="svc-name">Boat cruise options</span><span className="svc-time">13 min</span></li>
                <li><span className="svc-name">Nightlife clusters</span><span className="svc-time">25 min</span></li>
              </ul>
            </section>
          </div>

          {/* Booking policies */}
          <section className="block" aria-labelledby="pol-h">
            <h2 className="block-h" id="pol-h">Booking policies</h2>
            <div className="pol-grid">
              <div className="pol-col">
                <h3 className="sub-h">House rules</h3>
                <ul className="rules">
                  <li className="rule-yes">Children welcome</li>
                  <li className="rule-yes">Infants welcome</li>
                  <li className="rule-no">No parties or events</li>
                  <li className="rule-no">No smoking indoors</li>
                  <li className="rule-no">No pets</li>
                </ul>
              </div>
              <div className="pol-col">
                <h3 className="sub-h">Good to know</h3>
                <ul className="know">
                  <li><span>Arrival</span><strong>From 3:00pm</strong></li>
                  <li><span>Departure</span><strong>Before 11:00am</strong></li>
                  {prop.extended_checkout_offered && formattedExtended && (
                    <li><span>Late checkout</span><strong>To 6:00pm, {formattedExtended}</strong></li>
                  )}
                  <li><span>Minimum stay</span><strong>2 nights</strong></li>
                  <li><span>Payment</span><strong>Card, in USD, charged in full</strong></li>
                  <li><span>Security deposit</span><strong>{formattedDeposit} card hold</strong></li>
                </ul>
                <a className="text-link" href="policy.html#deposit">View terms</a>
              </div>
              <div className="pol-col">
                <h3 className="sub-h">Cancellation</h3>
                <ul className="cancel">
                  <li>
                    <span className="cx-when">30+ days</span>
                    <p>Cancel at least 30 days before check-in for a full refund.</p>
                  </li>
                  <li>
                    <span className="cx-when">7–30 days</span>
                    <p>Cancel at least 7 days before check-in for a 50% refund.</p>
                  </li>
                  <li>
                    <span className="cx-when">Under 7 days</span>
                    <p>No refund once check-in is less than 7 days away.</p>
                  </li>
                </ul>
                <a className="text-link" href="policy.html#cancellation">View full terms</a>
              </div>
            </div>
          </section>

          {/* Promise */}
          <section className="promise" aria-labelledby="promise-h">
            <div className="promise-inner">
              <h2 className="promise-h" id="promise-h">Our Promise</h2>
              <div className="promise-grid">
                <div className="promise-item">
                  <h3>Every apartment is seen</h3>
                  <p>No listing reaches this site from a photograph and a phone call. We stand in the room first.</p>
                </div>
                <div className="promise-item">
                  <h3>The price is the price</h3>
                  <p>Quoted in dollars, charged in dollars. No exchange-rate surprise between booking and arrival.</p>
                </div>
                <div className="promise-item">
                  <h3>Someone is here</h3>
                  <p>A city manager in {prop.city}, reachable before, during, and after your stay. Not a support queue in another time zone.</p>
                </div>
                <div className="promise-item">
                  <h3>We mediate</h3>
                  <p>If something is wrong with the apartment, you raise it with us, not with the owner. We settle it.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Newsletter */}
      <section className="nl">
        <div className="ph ph-filled nl-img" style={{ backgroundImage: "url('/assets/images/newsletter-bg.jpg')" }}></div>
        <div className="nl-shade"></div>
        <div className="wrap nl-content">
          <div className="nl-text">
            <div className="eyebrow nl-eyebrow">The Insider List</div>
            <h2>New homes, exclusive offers,<br />and early access.</h2>
            <p className="nl-legal">No spam. Unsubscribe anytime. <a href="policy.html">Privacy Policy</a>.</p>
          </div>
          <form className="nl-form" onSubmit={(e) => e.preventDefault()} aria-label="Newsletter sign-up">
            <input type="email" placeholder="Enter your email address" aria-label="Email address" />
            <button type="submit" className="nl-btn">Subscribe</button>
          </form>
        </div>
      </section>

      {/* Mobile reserve bar */}
      <div className="mobile-book" id="mobileBook">
        <div className="mb-price"><strong>{formattedNightly}</strong> per night</div>
        <Link href={`/book/${prop.slug}`} className="mb-cta">Reserve</Link>
      </div>

      {/* Amenities Modal */}
      {amenModal && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="amenModalH" onClick={(e) => { if (e.target === e.currentTarget) setAmenModal(false); }}>
          <div className="modal-panel">
            <button className="modal-x" onClick={() => setAmenModal(false)} aria-label="Close">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
            <h2 className="modal-h" id="amenModalH">In this apartment you will find</h2>
            <div className="modal-scroll">
              <section className="amen-cat">
                <h3>Cooling &amp; power</h3>
                <ul>
                  <li>Air conditioning in every room</li>
                  <li>Ceiling fans</li>
                  <li>Standby generator, building-wide</li>
                  <li>Inverter backup for lighting and sockets</li>
                  <li>Voltage stabiliser</li>
                </ul>
              </section>
              <section className="amen-cat">
                <h3>Water</h3>
                <ul>
                  <li>Borehole supply</li>
                  <li>Water treatment and filtration</li>
                  <li>Hot water throughout</li>
                  <li>Storage tank, 48-hour reserve</li>
                </ul>
              </section>
              <section className="amen-cat">
                <h3>Kitchen</h3>
                <ul>
                  <li>Full-size fridge freezer</li>
                  <li>Gas hob and electric oven</li>
                  <li>Microwave</li>
                  <li>Dishwasher</li>
                  <li>Kettle and toaster</li>
                  <li>Coffee maker</li>
                  <li>Blender</li>
                  <li>Cookware, crockery and glassware for six</li>
                  <li>Dining table seating six</li>
                </ul>
              </section>
              <section className="amen-cat">
                <h3>Laundry</h3>
                <ul>
                  <li>Washing machine</li>
                  <li>Tumble dryer</li>
                  <li>Iron and board</li>
                  <li>Drying rack</li>
                  <li>Housekeeping twice weekly</li>
                </ul>
              </section>
              <section className="amen-cat">
                <h3>Living &amp; entertainment</h3>
                <ul>
                  <li>Fibre wi-fi</li>
                  <li>Smart television with streaming</li>
                  <li>Satellite channels</li>
                  <li>Bluetooth speaker</li>
                  <li>Books and board games</li>
                </ul>
              </section>
              <section className="amen-cat">
                <h3>Workspace</h3>
                <ul>
                  <li>Desk and task chair</li>
                  <li>Power sockets at desk height</li>
                  <li>UK and universal adaptors</li>
                </ul>
              </section>
              <section className="amen-cat">
                <h3>Outdoor &amp; building</h3>
                <ul>
                  <li>Private balcony with lagoon view</li>
                  <li>Outdoor seating for four</li>
                  <li>Shared swimming pool</li>
                  <li>Residents' gym</li>
                  <li>Lift access</li>
                  <li>Allocated parking, one vehicle</li>
                </ul>
              </section>
              <section className="amen-cat">
                <h3>Safety &amp; security</h3>
                <ul>
                  <li>Manned gate, 24 hours</li>
                  <li>CCTV in common areas</li>
                  <li>Intercom entry</li>
                  <li>Smoke alarms</li>
                  <li>Fire extinguisher</li>
                  <li>First aid kit</li>
                  <li>Safe</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {configModal && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="configModalH" onClick={(e) => { if (e.target === e.currentTarget) setConfigModal(false); }}>
          <div className="modal-panel">
            <button className="modal-x" onClick={() => setConfigModal(false)} aria-label="Close">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
            <h2 className="modal-h" id="configModalH">Bedrooms and bathrooms</h2>
            <div className="modal-scroll">
              <h3 className="cfg-group">Bedrooms</h3>
              <div className="cfg-grid">
                {Array.from({ length: prop.bedrooms }, (_, i) => (
                  <div key={i} className="cfg-card">
                    <h4>Bedroom {i + 1}</h4>
                    <p className="cfg-bed">1 king</p>
                    <p className="cfg-note">En suite · wardrobe{i === 0 ? " · walk-in" : ""}</p>
                  </div>
                ))}
              </div>
              <h3 className="cfg-group">Bathrooms</h3>
              <div className="cfg-grid">
                {Array.from({ length: prop.bathrooms }, (_, i) => (
                  <div key={i} className="cfg-card">
                    <h4>Bathroom {i + 1}</h4>
                    <p className="cfg-bed">En suite{i === prop.bathrooms - 1 && prop.bathrooms < prop.bedrooms ? " / shared" : ""}</p>
                    <p className="cfg-note">{i === 0 ? "Bath and separate walk-in shower" : "Walk-in shower"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

declare global {
  interface Window {
    mapboxgl?: any;
  }
}
