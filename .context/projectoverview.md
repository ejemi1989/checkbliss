# Project Overview

## About the Project

CheckinBliss is a full stack, premium instant-booking platform for verified short-stay apartments in **Lagos and Abuja**, built for the **African diaspora**. Travellers browse an editorial, curated collection of apartments, book instantly with no host approval, pay by card (with a security **deposit held, not charged**), and can extend checkout to 18:00 to suit evening flights. Every property is invited, photographed, and re-verified in person by city operators. Reviews live independently on Trustpilot. Operated by Lyxio Curtis Ltd. Launch: **September 1, 2026.** Brand character: luxury, curated, editorial (Plum Guide layouts + Mr Porter tone).

---

## The Problem It Solves

Members of the Nigerian diaspora returning home face real friction booking quality short stays: open marketplaces are full of unverified listings and strangers' photos, host-approval delays make instant booking impossible, payment and deposit handling is opaque, and checkout times never fit the reality that most international flights out of Lagos leave late at night. There is no trusted, premium, instantly-bookable option curated for someone booking from London, Houston, or Toronto.

CheckinBliss removes that friction. Every apartment is verified in person and monthly; booking is instant with a database-guaranteed no-double-booking promise; the security deposit is a card hold that auto-releases within 7 days of a clean checkout; and extended checkout to 18:00 means guests aren't forced out at 11:00 before a 23:00 flight. Multi-city "book your full homecoming" lets a guest reserve Lagos then Abuja in one atomic checkout.

The result: the diaspora books beautiful, verified homes back home with confidence, instantly, from anywhere.

---

## Pages

```
/                      → Storefront (editorial collection, browse by city)
/stays/[slug]          → Property detail + checkout options + booking panel
/book/[slug]           → 3-step booking flow (dates/guest → checkout option → payment)
/confirmation/[ref]    → Booking confirmation + deposit-hold explainer
/admin/claims          → Admin damage-claim review (founder, web)
```

**Owners and operators do not use web pages for daily work** — they operate through the **WhatsApp bot** (PRD §8.1). The web surface is for guests (browse/book) and admin (claim review).

---

## Navigation

Minimal editorial chrome — no mass-market app shell. Mobile-responsive throughout.

**Header (all pages):**
```
CHECKINBLISS          Stays     ★ 4.8 on Trustpilot     [ £ / $ / € ]
```

**Footer:**
```
© 2026 CheckinBliss · Lyxio Curtis Ltd     Lagos · Abuja — Port Harcourt next     ★ 4.8 on Trustpilot
```

City selection on the storefront is **navigation, not filter checkboxes** (PRD 6.4). The currency toggle switches **display** between GBP/USD/EUR (charges always settle in GBP).

**Surface separation (PRD 8.1):**

| Audience | Surface |
|---|---|
| Guest | Web app (browse, book, manage, dispute) |
| Owner | WhatsApp (notifications, block dates, queries) |
| Operator | WhatsApp (inspection prompts, report results) |
| Admin | Web dashboard (claim review, decisions, suspend) |

---

## Core User Flow

### Storefront

- Editorial hero — "Come home to somewhere worthy of the journey."
- Lagos / Abuja eyebrow, trust stats (100% verified, instant, 18:00 checkout)
- City tabs (All / Lagos / Abuja) — navigation, not filters
- Magazine-style property grid; featured residences span wider cells
- Brand interlude — four trust pillars (verified in person, deposit held not charged, built for evening flights, book your full homecoming)
- Logged-out guests can browse freely; booking captures guest details (no account required to book)

### Property Detail

- Name (editorial serif), city · neighbourhood, bedrooms · sleeps
- Editorial gallery (duotone placeholders until photography)
- Residence description, amenities
- **Checkout options** — Standard 11:00 (included); Extended to 18:00 at the per-property price, with 48-hour confirmation fine print
- Getting-there route note
- Sticky booking panel — nightly rate, deposit-hold-not-charge promise, "Reserve instantly", Trustpilot rating

### Booking (instant, multi-city, atomic)

- Step 1 — dates + guest details. The **14-day advance rule** constrains dates and is surfaced as a trust feature.
- Step 2 — checkout option (Standard / Extended to 18:00 if offered)
- Step 3 — payment: embedded Airwallex hosted fields + Apple Pay / Google Pay; **deposit shown distinct from the charged total**
- Multi-city: 1–5 stays confirm in one atomic transaction — all or nothing, no partial charge (PRD 4.3)
- On success → instant confirmation, no host approval; owner notified on WhatsApp

### Payment & Deposit

- Booking total charged to card (settles in GBP)
- Security **deposit pre-authorised as a hold** — reserves credit, moves no money (PRD 5.1)
- Hold auto-releases within **7 days** of a clean checkout; partial/full capture only on an approved damage claim
- Card data never touches CheckinBliss servers (hosted fields, no redirect)

### Confirmation

- Booking reference, per-stay summary, confirmed checkout time
- Charged total + deposit-hold explainer ("held, not a charge, released within 7 days")

### Post-Checkout (operator + guest)

- Operator inspects via WhatsApp at the confirmed checkout time → `CLEAN` / `DAMAGE` / `NOSHOW` / `GUESTPRESENT`
- `CLEAN` → deposit hold auto-released; guest gets no friction
- `DAMAGE` → operator sends photos + estimate → admin reviews → Approve/Adjust/Reject → guest notified with a 7-day dispute window
- 24h after checkout → Trustpilot feedback email (GOOD → Trustpilot; BAD → private follow-up + verification history)

### Owner Flow (WhatsApp)

- Automated notifications: new booking, pre-checkout, post-checkout clean/damage, damage resolution, payout, verification
- Commands: `BLOCK` / `UNBLOCK` dates, `AVAILABILITY`, `BOOKINGS`, `HELP`
- One thread per owner; notifications name the specific unit; payouts consolidated per owner per period

### Operator Flow (WhatsApp + web)

- WhatsApp: pre-checkout `YES`/`REASSIGN`; inspection `CLEAN`/`DAMAGE`/`NOSHOW`/`GUESTPRESENT`
- Web: curation queue, verification logging, inspection schedule, city-scoped performance
- Scoped to assigned cities only (PRD 10.2)

### Admin Flow (web)

- Damage-claim review queue — photos, operator description + estimate, booking + guest details
- Three actions: **Approve · Adjust · Reject** → capture/release the deposit hold
- Suspend listings; create operators + assign cities; financial reconciliation; audit logs

---

## Data Architecture

### Property Data
Lives in `properties`. Invited/curated inventory, per-property deposit and extended-checkout config, `approved` status gates visibility.

### Reservation Data
Lives in `reservations`. Carries `booking_group_id` (multi-city), the stay date range, confirmed checkout time, fees, totals, payment intent, status. **Non-overlap is a database invariant** (GiST `EXCLUDE`) — double-booking is structurally impossible.

### Deposit Data
Lives in `deposit_holds`. Tracks the Airwallex authorisation, hold amount, status (`held`/`released`/`partially_captured`/`fully_captured`/`expired`), 7-day expiry, captured amount.

### Inspection & Claim Data
`inspections` (operator result + scheduler timestamps) and `damage_claims` (photos, estimate, admin decision, dispute window, resolved amount).

### People Data
`profiles` (owners/operators/admin, each with a unique WhatsApp E.164) and `operator_assignments` (city scope). Guests may book without an account.

### Availability Data
`availability_blocks` — owner-blocked ranges via WhatsApp `BLOCK`/`UNBLOCK`, the only inbound path that mutates availability. The internal calendar is the single source of truth (external calendars are outbound mirrors only).

### Audit Data
`audit_log` (append-only sensitive actions) and `whatsapp_audit_log` (12-month bot retention).

---

## Features In Scope (Launch-Critical, PRD §12.1)

- Property listing, detail, and city browse (curated, no filters)
- Editorial, premium, mobile-responsive design (PRD §3)
- Instant booking engine with 14-day advance rule
- Multi-city atomic checkout ("book your full homecoming")
- Database-guaranteed no double-booking (GiST exclusion)
- Multi-currency display (GBP/USD/EUR); charges settle GBP; NGN excluded
- Card + Apple Pay + Google Pay via Airwallex hosted fields (no BNPL)
- Security deposit pre-authorisation holds + lifecycle (release/capture)
- Single extended-checkout tier (18:00 @ 40%)
- NGN owner payouts (Africhange or Yolat), consolidated per owner
- Operator WhatsApp bot — inspection workflow
- Owner WhatsApp bot — notifications + block/unblock + queries
- Inspection & damage workflow with admin Approve/Adjust/Reject
- Escalation backstops (4h reminder, 48h escalation, 7-day auto-release)
- Simple admin claim review
- Operator row-level city scoping
- Outbound calendar sync (Google/Outlook)
- Trustpilot post-checkout feedback (GOOD/BAD email)
- Email confirmations & statements
- Mock mode — full flow runs with no external credentials

---

## Features Out of Scope (Launch — PRD §12.4 / deferred to Phase 2 §12.3)

- On-platform reviews/ratings (Trustpilot only)
- Direct guest–owner messaging
- Smart-lock integration
- Automated dynamic pricing
- Native mobile apps (web-responsive only)
- Loyalty / referral programmes
- Full four-tier late checkout (Launch-Supporting)
- Full owner & admin dashboards with analytics (Launch-Supporting)
- AI conversational WhatsApp interface (Phase 2 — launch is command-based)
- "Book together, pay separately" split payment (Phase 2)
- Lifestyle module — Nightlife, Experiences, Concierge (Phase 2)
- Editorial Reels / video (Phase 2)
- Property investment advisory — CheckinBliss Investment Services (Phase 2)
- Multi-region beyond Lagos/Abuja — Port Harcourt, then Ghana/Kenya/South Africa (Phase 2)

---

## Notifications & Audit Events

CheckinBliss has no third-party product analytics at launch. Its operational "events" are **WhatsApp notifications** (owner/operator) and the **audit log** — these power operations, support, and reconciliation.

**WhatsApp owner templates:** new booking · pre-checkout reminder · post-checkout clean · post-checkout damage · damage resolution · payout processed · verification scheduled · verification failed.

**WhatsApp operator messages:** pre-checkout confirmation · inspection prompt · damage submission · clean acknowledgement · weekly performance summary *(Launch-Supporting)*.

**Audit-log actions:** `booking.confirmed` · `booking.cancelled` · `deposit.released` · `deposit.captured` · `claim.decision` · `property.suspended` · `whatsapp.in` / `whatsapp.out`.

Outbound WhatsApp uses the approved template library only (business-initiated policy).

---

## Target Users

**Primary — the diaspora traveller** (booking from abroad):
- A member of the Nigerian diaspora (UK/US/Canada/EU) travelling home to Lagos or Abuja
- Wants a verified, premium, instantly-bookable apartment without marketplace risk
- Often travels on late-night return flights (needs evening checkout)
- May book multiple cities in one trip
- Values curation, trust, and a clean payment/deposit experience over the cheapest listing

**Secondary — property owners:** want bookings, clear payouts in Naira, and low-friction management over WhatsApp.

**Secondary — city operators:** verify and inspect properties, conduct checkouts, all via WhatsApp + a lightweight web review surface.

---

## Success Criteria

- A guest can browse, select, and **book instantly** (no host approval) in a few minutes
- **Double-booking is impossible** — concurrent attempts on the same dates are rejected, nothing charged
- The **deposit is visibly a hold, not a charge**, and auto-releases within 7 days of a clean checkout
- **Multi-city booking is atomic** — Lagos + Abuja confirm together or not at all
- **Extended checkout to 18:00** is available and respected by the inspection schedule
- Owners and operators can run their entire day **over WhatsApp**, with city-scoped access
- The damage flow is fair and traceable — photos, admin decision, 7-day guest dispute window
- Reviews flow to **Trustpilot**; the aggregate rating is shown; no on-platform reviews exist
- Card data **never** touches CheckinBliss servers; payments are idempotent
- Money is correct to the penny (integer minor units; GBP settlement; GBP/USD/EUR display only)
- The full booking → payment → hold → confirmation flow runs in **mock mode** with no credentials
- The UI reads **premium and editorial** (Plum Guide / Mr Porter), not mass-market; mobile-responsive
- Launch-Critical is deliverable by mid-August 2026 for a September 1 launch