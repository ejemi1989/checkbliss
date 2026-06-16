# CheckinBliss — User Flow V1 (Launch)

For an AI coding agent. Every flow lists: **actor · surface · trigger · system steps · result · error paths**. Scope = Launch-Critical (PRD §12.1). Read alongside `CheckinBliss-Architecture.md`, `phase1/02-API.md`, and `code-standards.md`.

**Surfaces:** Guest → web · Owner → WhatsApp · Operator → WhatsApp (+ light web) · Admin → web.
**Money:** integer GBP minor units; display GBP/USD/EUR; charges settle GBP.
**Two safety owners:** the database owns non-overlap (GiST `EXCLUDE`); Airwallex owns money (manual-capture holds). The app orchestrates only.

---

## 0. Actor & surface map

| Actor | Surface | Auth |
|---|---|---|
| Guest | Web | none required to book; details captured on reservation |
| Owner | WhatsApp | identified by E.164 (`profiles.whatsapp_e164`) |
| Operator | WhatsApp + web review | E.164 + `operator_assignments` (city scope) |
| Admin | Web | founder-only at launch (`ADMIN_DASH_KEY`) |

---

## FLOW 1 — Guest browses (web)

**Trigger:** visitor lands on `/`.

1. `GET /` — Server Component calls `getProperties(city?)`, reads `approved` properties (or seed in mock mode). `force-dynamic`.
2. Render storefront: hero, city tabs (All/Lagos/Abuja — **navigation, not filters**), editorial grid, brand interlude.
3. City tab → `/?city=Lagos` (URL param, server-read). Grid re-renders.
4. Card click → `/stays/[slug]`.

**Result:** guest reaches a property detail page.
**Errors:** empty city → show "no residences yet" state, never a blank grid.

---

## FLOW 2 — Guest views a property (web)

**Trigger:** `/stays/[slug]`.

1. `getProperty(slug)` → `notFound()` (404) if missing/not approved.
2. Render: gallery, description, amenities, **Checkout options** (Standard 11:00 incl.; Extended to 18:00 at per-property price if `extended_checkout_offered`, with 48-hour confirmation note), route note, sticky booking panel (nightly rate, deposit-hold promise, "Reserve instantly", Trustpilot rating).
3. "Reserve instantly" → `/book/[slug]`.

**State shown:** `extendedCheckoutPriceMinor(property)` (default 40% nightly) when offered.

---

## FLOW 3 — Guest books (web) — THE CORE FLOW

**Trigger:** `/book/[slug]`, then submit.

### 3a. Client flow (`components/booking-flow.tsx`)
- **Step 1 — Dates & guest:** check-in/check-out (date input min = today + 14 days, surfaced as a trust feature), guest name/email/phone, guest count. Optional: add up to **5 stays** (multi-city).
- **Step 2 — Checkout option:** Standard 11:00 (included) / Extended 18:00 (+fee) if offered.
- **Step 3 — Payment:** Airwallex **hosted fields** in-page (no redirect) + Apple Pay + Google Pay. Summary shows accommodation, extended fee, **deposit hold (distinct from charged total)**, total. No BNPL.

### 3b. Server flow (`POST /api/bookings`)
1. **Zod validate** body (guest + 1–5 items: `property_id`, ISO dates, `extended_checkout`).
2. **14-day check** at edge → 422 `ADVANCE_14_DAYS` if violated.
3. **`book_stays()` RPC — one atomic transaction:** lock each property row, re-check 14-day + `availability_blocks`, compute extended fee, insert reservation(s) under one `booking_group_id`. Overlap raises `23P01` → whole tx rolls back, **no charge**.
4. **Airwallex charge** — PaymentIntent `capture_method: automatic`, `request_id: charge-<group>`.
5. **Airwallex deposit hold** — PaymentIntent `capture_method: manual`, `request_id: hold-<group>` (authorise only, no money moved).
6. **`confirm_booking_group()`** → reservations `confirmed`; persist `deposit_holds` rows with `expires_at = now + 7 days`.
7. **Owner WhatsApp notification** (Flow 5).
8. **Audit** `booking.confirmed`.

**Result:** `201` → redirect `/confirmation/[reference]`.

**Error contract (guest-safe messages, nothing charged):**
| Condition | HTTP | Message |
|---|---|---|
| 14-day | 422 | Bookings open 14+ days ahead. |
| invalid range | 422 | Check-out must be after check-in. |
| overlap | 409 | Those dates were just taken — nothing charged. |
| blocked | 409 | Those dates are unavailable — nothing charged. |
| not bookable | 404 | That residence isn't currently bookable. |
| payment fails after reserve | 502 | Dates released, nothing charged. (**compensating cancel runs**) |

**Idempotency:** retries reuse `charge-<group>` / `hold-<group>` → no duplicate charges.

---

## FLOW 4 — Guest sees confirmation (web)

**Trigger:** `/confirmation/[reference]`.

1. `GET /api/bookings/[reference]`.
2. Render: reference, per-stay summary (property, dates, confirmed checkout time, total), charged total, **deposit-hold explainer** ("held, not a charge, released within 7 days of a clean checkout"), "owner notified" note.

---

## FLOW 5 — Owner receives booking (WhatsApp)

**Trigger:** Flow 3b step 7.

1. Template send via `sendWhatsApp`: `"New booking: {unit}, {dates}, {nights} nights, {total}. Guest: {name}."`
2. One thread per owner; message names the specific unit.

**Owner inbound commands** (`POST /api/webhooks/whatsapp`):
1. Verify `X-Hub-Signature-256` HMAC → else reject.
2. Match sender E.164 to a registered owner → else ignore.
3. `parseOwnerCommand` (strict; malformed → reject, not guess):
   - `BLOCK <range> <unit>` / `UNBLOCK <range> <unit>` → write/delete `availability_blocks` (only inbound path that mutates availability; authorised to owned units only).
   - `AVAILABILITY <unit> <month>` / `BOOKINGS` / `HELP` → read + reply.
4. Audit `whatsapp.in` / `whatsapp.out`.

---

## FLOW 6 — Checkout & inspection (operator, WhatsApp; driven by cron)

**Trigger:** `GET /api/cron/inspections` every 15 min (CRON_SECRET bearer), keyed off `reservations.confirmed_checkout_time` (11:00 or 18:00). Idempotent — each tick acts only on rows whose timestamp columns show the next step is due.

State machine per reservation (`inspections.*_at`):
1. **−24h:** pre-checkout prompt → operator replies `YES` / `REASSIGN <rep>`.
2. **At checkout:** inspection prompt → operator replies `CLEAN` / `DAMAGE` / `NOSHOW` / `GUESTPRESENT`.
3. **+4h:** reminder if no reply.
4. **+48h:** escalate to admin.
5. **+7d:** auto-release hold (backstop — guest never penalised for a platform failure).

Operator inbound (`webhook` → `parseOperatorCommand`, authorised to assigned cities only):
- **CLEAN** → `releaseHold(intentId)` → hold `released`; notify owner; **no guest notification** (no friction).
- **DAMAGE** → bot requests up to 5 photos + estimate → create `damage_claims` row → route to admin (Flow 7).
- **NOSHOW / GUESTPRESENT** → route to admin.

---

## FLOW 7 — Damage claim decision (admin, web)

**Trigger:** a `damage_claims` row enters review.

1. `/admin/claims` queue (founder-only). Per claim: photos, operator description + estimate, booking + guest details.
2. Admin action (`actions/claims.ts` Server Action → `assertAdmin` → `createAdmin`):
   - **Approve** → `captureFromHold(intentId, estimateMinor)` → `fully/partially_captured`.
   - **Adjust** → `captureFromHold(intentId, amountMinor)`; remainder released.
   - **Reject** → `releaseHold(intentId)` → `released`.
3. Set `dispute_deadline = now + 7 days`; notify guest with photos.
4. Audit `claim.decision`.

---

## FLOW 8 — Guest disputes a claim (web)

**Trigger:** guest acts within 7 days of Flow 7.

1. `POST /api/claims/[id]/dispute` (or Server Action) → `guest_dispute_status = open`, note attached.
2. Returns to admin review (Flow 7) for re-decision.
3. No dispute within 7 days → capture finalised, remainder (if any) released.

---

## FLOW 9 — Post-checkout feedback (guest, email; cron)

**Trigger:** `GET /api/cron/feedback` hourly, 24h after checkout.

1. Send "How was your stay?" email → **GOOD** / **BAD**.
2. GOOD → redirect to Trustpilot review page.
3. BAD → capture free-text, notify admin + city operator, append to property verification history.
4. Reviews live on **Trustpilot only**; aggregate rating cached for storefront display.

---

## FLOW 10 — Deposit lifecycle (cross-cutting)

```
booking → [held]
  ├─ operator CLEAN ──────────▶ releaseHold       → [released]
  ├─ +7d no inspection ───────▶ releaseHold       → [expired]
  ├─ admin Approve/Adjust ────▶ captureFromHold   → [partially_captured]  (remainder returned)
  └─ admin Approve (major) ───▶ capture full+invoice → [fully_captured]
```

---

## V1 build status (see `progress-tracker.md`)
Built: storefront, detail, booking engine + atomic RPC, Airwallex charge/hold, schema/RLS, currency. Pending: `booking-flow.tsx`, confirmation page, WhatsApp webhook handlers, inspection cron, admin claim UI, feedback cron, NGN payout, calendar sync.