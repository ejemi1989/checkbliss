# CheckinBliss Build Plan

## Core Principle

Full page UI built with mock data first — verified visually before any logic is written. Then functionality is built and wired to the UI step by step. Every feature must be visible and testable before moving to the next. No invisible backend phases.

CheckinBliss is built for this: **mock mode runs the entire booking → payment → deposit-hold → confirmation flow with zero credentials** (no Supabase, Airwallex, or WhatsApp keys). Each feature is proven against mock data, then the live integration is swapped in behind the same interface.

Scope below is **Launch-Critical (Phase 1, PRD §12.1)** — the September 1 launch. Launch-Supporting and Phase 2 follow the same UI-first discipline afterwards.

---

## Phase 1 — Foundation

### 01 Design System + Shell

Build the editorial design system and app shell before any page.

**UI:**

- Tailwind v4 `@theme` tokens — ink/bone/lagoon/brass/hairline palette, Playfair Display + Inter (PRD §3)
- Root layout — sticky header (logo, Trustpilot rating, currency toggle), footer (Lyxio Curtis Ltd, cities, Trustpilot)
- Grain-textured editorial placeholder art component (per-property duotone)
- Focus-visible rings; `prefers-reduced-motion` honored

**Logic:**

- Currency context (GBP/USD/EUR) — display-only, ephemeral client state
- `<Price>` component renders any GBP-minor amount in the selected display currency

---

### 02 Database Schema

All Supabase tables created before any data is written.

**Logic:**

- `0001_schema.sql` — enums, `profiles`, `operator_assignments`, `properties`, `reservations`, `deposit_holds`, `inspections`, `damage_claims`, `availability_blocks`, `whatsapp_audit_log`
- **GiST `EXCLUDE` constraint** on reservations — double-booking impossible at storage layer (PRD 4.3)
- 14-day advance `CHECK`; `book_stays()`, `confirm_booking_group()`, `property_unavailable_ranges()` functions
- `0002_rls.sql` — Row Level Security on all tables; `auth_role()` helper
- Test SELECT/INSERT/UPDATE/DELETE permissions per table and per role

---

### 03 Supabase Clients + Mock Mode

Three clients and the mock fallback, before any data access.

**Logic:**

- `lib/supabase.ts` — `createBrowser()`, `createServer()`, `createAdmin()` (secret key, server-only)
- Support new (`sb_publishable_…`/`sb_secret_…`) and legacy (`anon`/`service_role`) key names
- `supabaseConfigured` / `supabaseAdminConfigured` runtime flags
- `lib/data.ts` falls back to `lib/seed-data.ts` (6 properties) when unconfigured

---

### 04 Storefront Homepage — Full UI

Build the complete storefront UI with mock data. No live data yet.

**UI:**

- Hero — editorial headline, Lagos/Abuja eyebrow, trust stats, rotating "Verified · Curated" seal
- City tabs — All / Lagos / Abuja (navigation, **not** filter checkboxes — PRD 6.4)
- Editorial property grid — featured residences span wider cells, asymmetric magazine layout
- Brand interlude — four trust pillars (verified, deposit-held, evening flights, full homecoming)

**Logic:**

- City selection via URL search param (`/?city=Lagos`), read server-side
- Property cards link to `/stays/[slug]`

---

## Phase 2 — Browse & Detail

### 05 Storefront — Real Inventory

Wire the storefront grid to real property data.

**Logic:**

- `getProperties(city)` reads `approved` properties from Supabase (or seed in mock mode)
- `force-dynamic` rendering for live availability
- Empty/edge states handled gracefully

---

### 06 Property Detail — Full UI

Build the complete property detail page. Wire real property data immediately.

**UI:**

- Back to stays link; name (serif), city · neighbourhood, bedrooms · sleeps
- Editorial gallery (duotone placeholders until photography)
- Residence description, amenities grid
- **Checkout options** section — Standard 11:00 (included); Extended to 18:00 at per-property price, with 48-hour confirmation fine print (PRD 6.6)
- Getting-there route note
- Sticky lagoon booking panel — nightly rate, deposit-hold-not-charge promise, "Reserve instantly", Trustpilot rating

**Logic:**

- `getProperty(slug)` → 404 via `notFound()` if missing
- `extendedCheckoutPriceMinor()` computes the extended fee (default 40% of nightly)

---

### 07 Availability Feed

Expose bookable/blocked dates without leaking guest data.

**Logic:**

- `GET /api/properties/[slug]/availability` → `property_unavailable_ranges()` returns date ranges only (no PII)
- Reservations (non-cancelled) + `availability_blocks` combined

---

## Phase 3 — Booking & Payments

### 08 Booking Flow — Full UI

Build the complete 3-step booking flow with mock data. No charge yet.

**UI:**

- Step 1 — dates (14-day rule constrains inputs, surfaced as a trust feature) + guest details
- Step 2 — checkout option (Standard / Extended if offered)
- Step 3 — payment: embedded Airwallex hosted-fields surface + Apple Pay / Google Pay (mock), deposit shown distinct from charged total (PRD 5.5 language)
- Running summary — accommodation, extended fee, deposit hold, total

**Logic:**

- Client state holds in-progress selections; nothing authoritative until submit

---

### 09 Booking Engine

Wire the booking flow to the atomic booking transaction.

**Logic:**

- `POST /api/bookings` — Zod validate guest + 1–5 items; 14-day rule at edge
- `book_stays()` RPC — atomic multi-city: lock rows, re-check rule + blocks, compute fee, insert; any overlap → rollback, **no charge** (PRD 4.3)
- Error contract: 409 dates unavailable, 422 14-day/validation, 404 not bookable — each reassures "nothing charged"

---

### 10 Airwallex — Charge + Deposit Hold

Wire payments behind the booking engine.

**Logic:**

- Booking charge — PaymentIntent `capture_method: automatic`, `request_id: charge-<group>`
- Deposit hold — PaymentIntent `capture_method: manual` (authorise only), `request_id: hold-<group>` (PRD 5.1)
- `confirm_booking_group()` against the charge intent; persist `deposit_holds` with 7-day `expires_at`
- Payment failure after reserve → compensating group cancel (dates freed, nothing charged)
- Mock mode returns deterministic intents so the flow completes without credentials

---

### 11 Confirmation Page

Close the loop visibly.

**UI:**

- `/confirmation/[reference]` — booking reference, per-stay summary, checkout time, charged total, deposit-hold explainer, owner-notified note

**Logic:**

- `GET /api/bookings/[reference]` lookup; owner WhatsApp notification fired at booking; audit entry written

---

## Phase 4 — Deposit & Inspection

### 12 Deposit Lifecycle

Wire the post-checkout deposit outcomes.

**Logic:**

- `releaseHold()` — clean checkout or 7-day backstop → `released` / `expired`
- `captureFromHold(amount)` — minor damage → `partially_captured` (remainder auto-returned)
- Full capture + invoice — major damage → `fully_captured` (PRD 5.4)

---

### 13 Inspection Scheduler

Build the inspection state machine on cron.

**Logic:**

- `GET /api/cron/inspections` (CRON_SECRET bearer), every 15 min via `vercel.json`
- Off `confirmed_checkout_time` (11:00/18:00): 24h pre-notice → checkout prompt → +4h reminder → +48h escalation → +7d auto-release
- State = timestamp columns on `inspections`; each tick advances only what's due (idempotent)

---

### 14 Damage Claim Flow

Wire operator damage reports into a reviewable claim.

**UI:**

- (Operator side is WhatsApp — see 17) Claim record carries photos, description, estimate

**Logic:**

- `damage_claims` row created from operator `DAMAGE` report (photos up to 5 + estimate)
- Enters admin review; sets 7-day guest dispute window on decision (PRD 7.7)

---

## Phase 5 — WhatsApp Bot

### 15 WhatsApp Webhook + Security

Stand up the inbound bot channel securely.

**Logic:**

- `GET /api/webhooks/whatsapp` — Meta verification challenge
- `POST /api/webhooks/whatsapp` — verify `X-Hub-Signature-256` HMAC (timing-safe); unsigned rejected
- Match sender E.164 to registered owner/operator; unknown senders ignored
- Strict parse — malformed rejected, not guessed; 12-month audit retention (PRD 8.5)

---

### 16 Owner Commands + Notifications

Wire owner self-service and automated notices.

**Logic:**

- Commands: `BLOCK` / `UNBLOCK` (write `availability_blocks`), `AVAILABILITY`, `BOOKINGS`, `HELP`
- Authorise against properties the sender owns
- Outbound templates: new booking, pre-checkout, post-checkout clean/damage, damage resolution, payout, verification (PRD 8.2)
- One thread per owner; notifications name the specific unit

---

### 17 Operator Inspection Workflow

Wire the operator field flow.

**Logic:**

- Pre-checkout (24h): `YES` / `REASSIGN`
- Inspection prompt: `CLEAN` (auto-release hold, notify owner, no guest notice) / `DAMAGE` (photos + estimate → claim) / `NOSHOW` / `GUESTPRESENT` (→ admin)
- Authorise against properties in the operator's assigned cities (PRD 10.2)

---

## Phase 6 — Admin

### 18 Admin Claim Review — Full UI

Build the simple founder-scale claim review.

**UI:**

- `/admin/claims` — pending queue; per claim: photos (basic viewer), operator description + estimate, booking details, guest contact
- Three buttons: **Approve · Adjust · Reject** (PRD 7.6)

**Logic:**

- Founder-only at launch (`ADMIN_DASH_KEY`)

---

### 19 Admin Decision + Operators

Wire admin actions to money movement.

**Logic:**

- Server Action `decideClaim` — approve (capture full) / adjust (capture amount, release rest) / reject (release) → `captureFromHold` / `releaseHold`
- Guest notified with photos + 7-day dispute window
- Property suspend; create operator + assign cities; everything audited

---

## Phase 7 — Feedback, Payout & Polish

### 20 Post-Checkout Feedback

Wire the Trustpilot feedback loop.

**UI:**

- 24h post-checkout email — "How was your stay?" GOOD / BAD

**Logic:**

- `GET /api/cron/feedback` (hourly) — GOOD → Trustpilot redirect; BAD → capture text, notify admin + city operator, append to verification history
- Reviews live on Trustpilot only; aggregate rating cached for display (PRD 13)

---

### 21 NGN Payout Integration

Wire owner payouts in Naira.

**Logic:**

- Confirm partner (Africhange **or** Yolat) before integration (PRD 2D)
- Funds collect GBP to platform Airwallex account; payout layer handles GBP→NGN, **consolidated per owner per period** (PRD 9.3)

---

### 22 Outbound Calendar Sync

One-way mirror to owner calendars.

**Logic:**

- Push confirmed reservations to Google/Outlook (outbound only — internal calendar stays source of truth, PRD 4.1)

---

### 23 Database Seeding + Test Data

Populate Supabase with realistic data for testing.

**Data to seed:**

- Properties: ~30 across Lagos & Abuja with neighbourhoods, rates, deposits, extended-checkout config
- Owners + operators with WhatsApp E.164 and city assignments
- A spread of reservations (past/upcoming), a few inspections and one resolved claim

---

### 24 Pre-Launch Testing Plan

QA the five critical workflows end-to-end (PRD §14).

**Test checklist:**

- Booking — single + multi-city atomic; 14-day rule; concurrent double-booking rejection
- Payment — charge auto-capture; Apple/Google Pay; idempotency on retry; failure → group cancel + dates released
- Deposit hold — manual authorise; clean release; 7-day backstop release
- Inspection — pre-notice, prompt, CLEAN/DAMAGE/NOSHOW/GUESTPRESENT, reminder, escalation
- Damage claim — operator report + photos → admin Approve/Adjust/Reject → partial/full capture → guest dispute
- Mock mode — full flow runs with no live credentials

---

### 25 Polish + Demo Flow

Refine, make responsive, prepare a walkthrough.

**Tasks:**

- Test mobile / tablet / desktop; optimise images + lazy loading; accessibility; typography + spacing
- Performance audit — target Lighthouse > 80

**Walkthrough script (5–7 min):**

1. Storefront — editorial browse, Lagos/Abuja
2. Property detail — checkout options, deposit promise
3. Multi-city booking — atomic, 14-day rule, instant confirmation
4. Payment — hosted fields, deposit hold distinct from charge
5. Owner WhatsApp — new booking notification, BLOCK dates
6. Operator WhatsApp — inspection prompt → CLEAN → hold released
7. Damage path — DAMAGE + photos → admin Approve → partial capture → guest dispute window
8. Post-checkout — Trustpilot feedback email

---

## Feature Count

| Phase | Features |
|-------|----------|
| Phase 1 — Foundation | 4 |
| Phase 2 — Browse & Detail | 3 |
| Phase 3 — Booking & Payments | 4 |
| Phase 4 — Deposit & Inspection | 3 |
| Phase 5 — WhatsApp Bot | 3 |
| Phase 6 — Admin | 2 |
| Phase 7 — Feedback, Payout & Polish | 6 |
| **Total** | **25** |