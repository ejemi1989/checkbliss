# CheckinBliss — Feature & Architecture Specification

Extracted from the implemented build. Premium instant-booking platform for verified short-stay apartments in Lagos and Abuja, built for the African diaspora. Maps directly to PRD v2.3 (Launch-Critical scope).

**Stack:** Next.js 16 (App Router) · Supabase (PostgreSQL) · Tailwind CSS v4 · Stripe payments · WhatsApp Business (Meta Cloud API) · TypeScript · Zod. Deployed on Vercel.

---

## 1. Backend Architecture

The backend is built entirely on the Next.js App Router server runtime — there is no separate API server. Server Components read data directly; mutations go through Route Handlers under `app/api`. This keeps the platform out of PCI-DSS scope (card data never touches the server — Section 6) and means a single Vercel deployment carries the whole system.

### 1.1 Trust boundary and credential model

Three distinct Supabase access paths, defined in `lib/supabase.ts`:

- **Browser client** (`createBrowser`) — uses the publishable/anon key. Read-only storefront usage, governed by Row Level Security.
- **Server client** (`createServer`) — cookie-aware, for Server Components and Route Handlers running as the signed-in user, also governed by RLS.
- **Admin client** (`createAdmin`) — uses the secret/service-role key, **server-only**, and bypasses RLS by design. Every write in the system (booking creation, deposit-hold records, claim decisions, webhook-driven mutations) flows through this client inside a Route Handler. No anonymous or authenticated client ever writes to a privileged table directly.

The client supports both the new Supabase key names (`sb_publishable_…` / `sb_secret_…`) and the legacy `anon` / `service_role` names, which are being deprecated. Configuration is detected at runtime via `supabaseConfigured` / `supabaseAdminConfigured` flags.

### 1.2 Demo / mock mode

The application is designed to run end-to-end **before** any external service is connected. When Supabase, Stripe, or WhatsApp credentials are absent, each layer falls back to a deterministic stub:

- `lib/data.ts` serves inventory from an in-memory seed (`lib/seed-data.ts`) instead of Supabase.
- `lib/stripe.ts` returns deterministic mock PaymentIntents.
- `lib/whatsapp.ts` logs outbound sends to the console/audit trail rather than dispatching them.

This lets the full booking → payment → deposit-hold → confirmation flow be tested locally with zero infrastructure, which is also how the pre-launch testing plan (PRD §14) is exercised.

### 1.3 Source-of-truth principle (PRD 4.1)

The CheckinBliss internal calendar (the `reservations` table) is always authoritative. External calendars (Google, Outlook) are one-way outbound mirrors only and never write back. Owner availability changes arrive via WhatsApp `BLOCK`/`UNBLOCK` commands, which write to `calendar_blocks` — never the reverse.

### 1.4 Background jobs

Scheduled work is driven by Vercel Cron (`vercel.json`) hitting protected Route Handlers, authorised with a `CRON_SECRET` bearer token. The inspection scheduler (pre-checkout notice, inspection prompt, 4-hour reminder, 48-hour escalation, 7-day auto-release — PRD 7.9 / 5.3) runs on a 15-minute cadence.

---

## 2. Database (PostgreSQL / Supabase)

Schema lives in `supabase/migrations/0001_schema.sql`; RLS in `0002_rls.sql`; demo inventory in `supabase/seed.sql`. Two PostgreSQL extensions are required: `btree_gist` (for the exclusion constraints) and `pgcrypto` (for `gen_random_uuid()`).

### 2.1 Enumerated types

| Enum | Values | PRD |
|---|---|---|
| `reservation_status` | `pending_payment`, `confirmed`, `cancelled`, `completed` | — |
| `hold_status` | `held`, `partially_captured`, `fully_captured`, `released`, `expired` | 5.6 |
| `inspection_result` | `clean`, `damage`, `noshow`, `guestpresent` | 7.5 |
| `claim_decision` | `pending`, `approved`, `adjusted`, `rejected` | 7.6 |
| `dispute_status` | `none`, `open`, `accepted`, `resolved` | 7.7 |
| `property_status` | `draft`, `pending_review`, `approved`, `suspended` | 10.1 |

### 2.2 Core tables

- **`owners`** / **`operators`** — people, each keyed by a unique WhatsApp E.164 number (one thread per owner, PRD 8.2).
- **`operator_assignments`** — `(operator_id, city)` pairs that scope what an operator can see and act on (PRD 10.2).
- **`properties`** — curated inventory. Money stored as integer minor units (GBP pence). Carries `deposit_minor` (per-property, tier guidance — PRD 5.2), `extended_checkout_offered` + `extended_checkout_price_minor` (null ⇒ default 40% of nightly rate — PRD 6.8/6.10), `status`, and `hero_hues` for the editorial placeholder art.
- **`reservations`** — the booking ledger. Holds `booking_group_id` (multi-city atomic checkout), `stay` as a `daterange`, `confirmed_checkout_time` (11:00 or 18:00 — PRD 6.9), `late_checkout_fee_minor`, `accommodation_minor`, `total_minor`, and `payment_intent_id`.
- **`calendar_blocks`** — owner-initiated date blocks via WhatsApp (PRD 4.4).
- **`deposit_holds`** — exact columns from PRD 5.6: `reservation_id`, `stripe_payment_intent_id`, `hold_amount_minor`, `currency`, `status`, `expires_at`, `captured_amount_minor`, `released_at`.
- **`inspections`** — `reservation_id`, `operator_id`, `result`, `inspected_at`, `notes` (PRD 7.10).
- **`damage_claims`** — `reporting_operator_id`, `photos[]`, `description`, `estimated_cost_minor`, `admin_decision`, `admin_reviewer_id`, `admin_decided_at`, `guest_dispute_status`, `resolved_amount_minor`, `resolved_at` (PRD 7.10).
- **`audit_log`** — append-only record of sensitive actions (PRD 8.5 / 11.1).

### 2.3 Double-booking prevention as a database invariant (PRD 4.3)

Non-overlap is **not** enforced in application logic — it is a hard database constraint:

```sql
alter table reservations add constraint reservations_no_overlap
  exclude using gist (property_id with =, stay with &&)
  where (status <> 'cancelled');
```

Two non-cancelled reservations for the same property physically cannot overlap. `calendar_blocks` has the equivalent exclusion constraint. This is the structural guarantee behind "instant booking, no host approval."

### 2.4 14-day advance restriction (PRD 4.2)

Enforced in depth — at the API edge, inside the booking function, **and** as a table-level `CHECK`:

```sql
constraint min_advance check (lower(stay) >= created_at::date + 14)
```

### 2.5 Atomic multi-city checkout — `book_stays()`

A `SECURITY DEFINER` PL/pgSQL function implements "book your full homecoming" (PRD 4.3) as a single transaction. It iterates the requested stays, locks each property row (`FOR UPDATE`), re-checks the 14-day rule and calendar blocks, computes the extended-checkout fee, and inserts each reservation. If **any** stay conflicts, the exclusion constraint raises `23P01`, the whole transaction rolls back, and no charge is ever created. It returns a JSON summary (`booking_group_id`, per-reservation totals, deposit total, currency).

Companion functions: `confirm_booking_group()` (flips a group to `confirmed` after payment authorises) and `property_unavailable_ranges()` (public availability feed exposing date ranges only, never guest PII).

### 2.6 Row Level Security

- Public/anon may read only `approved` properties and reservation **date ranges** (for calendar rendering) — never guest details.
- Operators are scoped to their assigned cities; an operator assigned to Lagos cannot see, modify, or verify Abuja properties (PRD 10.2).
- Guests see their own reservations and claims; owners see their own properties' reservations.
- The privileged functions (`book_stays`, `confirm_booking_group`) have `EXECUTE` revoked from `anon`/`authenticated` — they run only via the secret-key admin client.

---

## 3. API Layer

Route Handlers under `app/api`, Node.js runtime. Every request body is validated with Zod before any side effect.

### 3.1 `POST /api/bookings` — create a booking

The central transaction endpoint. Accepts a guest object and 1–5 stay items (the 5-item cap is the multi-city homecoming limit).

Validation and flow:

1. **Zod schema** validates shape: guest name/email, optional phone, guest count, and each item's `property_id` + ISO dates + `extended_checkout` flag.
2. **14-day check** at the edge, before touching the database, with a friendly message.
3. **`book_stays` RPC** creates all reservations atomically. Known Postgres errors are mapped to clean HTTP responses — `DATES_UNAVAILABLE` → 409, `ADVANCE_14_DAYS` → 422, `PROPERTY_NOT_BOOKABLE` → 404 — each reassuring the guest that nothing was charged.
4. **Booking charge** (automatic capture) + **deposit hold** (manual capture) created via Stripe.
5. **`confirm_booking_group`** marks reservations confirmed against the payment intent.
6. **Deposit-hold rows** written per reservation with the 7-day backstop `expires_at` (PRD 5.3).
7. **Owner WhatsApp notification** fires automatically (PRD 4.5 / 8.2).
8. **Audit entry** recorded.

If the payment phase fails *after* reservations are created, the group is immediately cancelled so the dates free up — and the guest is told their dates were released and nothing was charged. This compensating action is the application-level complement to the DB invariant.

### 3.2 Planned handlers (same patterns)

These follow the identical Zod-validate → admin-client → audit shape and are scoped Launch-Critical:

- `POST /api/webhooks/whatsapp` — inbound bot webhook. Verifies the Meta `X-Hub-Signature-256` HMAC (`lib/whatsapp.ts → verifyMetaSignature`), matches the sender against a registered owner/operator, strictly parses the command, and dispatches: owner `BLOCK`/`UNBLOCK`/`AVAILABILITY`/`BOOKINGS`; operator `CLEAN`/`DAMAGE`/`NOSHOW`/`GUESTPRESENT`/`YES`/`REASSIGN`. Malformed input is rejected, never guessed (PRD 8.5). `GET` handles the webhook verification challenge.
- `GET /api/cron/inspections` — `CRON_SECRET`-protected scheduler for the inspection lifecycle and 7-day auto-release.
- `POST /api/claims/:id/decision` — admin Approve / Adjust / Reject, which calls `captureFromHold` or `releaseHold` accordingly.

### 3.3 Idempotency

Stripe idempotency key doubles as the idempotency key, derived from the `booking_group_id` (`charge-<group>`, `hold-<group>`), giving duplicate-charge prevention as required by PRD 12.1.

---

## 4. Integrations

### 4.1 Stripe payments (`lib/stripe.ts`) — PRD 4.6 / 5

Two operations per booking, both PaymentIntents:

- **Booking charge** — `capture_method: "automatic"`, settles the full stay total to the platform account.
- **Security deposit hold** — `capture_method: "manual"`. Authorises the deposit against the guest's available credit but moves no money (PRD 5.1).

Lifecycle helpers map straight to the deposit outcomes:

- `releaseHold()` → cancels the intent — clean checkout (PRD 5.4 A) or 7-day backstop (5.3).
- `captureFromHold(amount)` → partial capture for an approved damage claim (PRD 5.4 B/C); the remainder is returned to the guest automatically.

Authentication uses the Stripe SDK with `STRIPE_SECRET_KEY` initialised once via the official `stripe` Node client (no token caching — the SDK manages auth internally). The base URL is the Stripe API default; test mode is selected by the key prefix (`sk_test_` vs `sk_live_`). The booking route currently uses **server-side confirm with the `pm_card_visa` test PaymentMethod** — the route creates the intent with `confirm: true`, Stripe settles synchronously, and the booking group is confirmed in the same request. This keeps the mock-mode contract intact and avoids depending on a live webhook for any real booking. **Stripe Elements on the frontend is deferred** — when wired up, it will be client-side `confirmPayment` against a returned `clientSecret`, with the `payment_intent.succeeded` webhook as the source of truth. Until then, no raw card data is collected by CheckinBliss, so PCI-DSS scope is preserved by architecture: the server never sees a card.

Payment methods: Card (Visa/Mastercard/Amex), Apple Pay, Google Pay. No BNPL (PRD 4.6).

### 4.2 WhatsApp Business — Meta Cloud API (`lib/whatsapp.ts`) — PRD 8

- **Outbound** sends use template messages (required by WhatsApp policy for business-initiated messages), against Graph API `v21.0`.
- **Inbound** webhook security verifies the `X-Hub-Signature-256` HMAC with the app secret using a timing-safe comparison; unsigned traffic is never accepted in any mode.
- **Strict command parsers** for owner and operator roles. The owner parser handles natural date ranges like `BLOCK 15-20 Sept Sunset Dove Unit 2`, resolving bare months to the correct year and converting to half-open `daterange` semantics. Anything that doesn't match exactly returns `null` and is rejected.

### 4.3 Currency display (`lib/currency.ts`) — PRD 12.1

GBP / USD / EUR display only; local (NGN) equivalent deliberately excluded. Charges settle in GBP; other currencies are indicative display, refreshed server-side in production. All amounts are GBP minor units internally and formatted at the edge.

---

## 5. Frontend

App Router with Server Components for all data reads; a small number of Client Components carry interactivity.

### 5.1 Design system (PRD §3)

Tailwind v4 with a custom `@theme` token set in `app/globals.css`: a lagoon-green and brass palette on bone/paper, **Playfair Display** (editorial serif) for property names, headlines, and featured content, **Inter** (sans) for UI, navigation, and metadata. Generous whitespace, hairline borders, understated buttons, magazine-style asymmetric grid — Plum Guide layout discipline with Mr Porter editorial tone. Fonts are loaded via `<link>` so builds run offline. Honors `prefers-reduced-motion`.

### 5.2 Storefront (`app/page.tsx`)

Server-rendered editorial grid. Featured residences span wider cells; placeholder art is a per-property duotone gradient with a grain overlay (`hero_hues`) standing in until photography lands. City selection is **navigation, not filter checkboxes** (PRD 6.4) — filtering would hide inventory and read mass-market. A rotating "Verified · Curated" seal and a brand interlude reinforce the four trust pillars.

### 5.3 Property card (`components/property-card.tsx`) — PRD 6.5

Strict hierarchy: price (top), name (large serif), city · neighbourhood, then a metadata row where **"Late checkout" is a subtle service indicator at the same visual weight as bedroom count** — a small brass dot, never a sort control.

### 5.4 Property detail (`app/stays/[slug]`)

Editorial gallery, residence description, amenities, a dedicated **Checkout options** section (Standard 11:00 included; Extended to 18:00 at the per-property price, with the 48-hour confirmation fine print — PRD 6.6), a getting-there route note, and a sticky lagoon booking panel that states the deposit-hold-not-charge promise up front.

### 5.5 Booking flow (`app/book/[slug]`)

A three-step client flow (dates & guest → checkout option → payment) backed by the server detail fetch. The 14-day rule constrains the date inputs and is surfaced to the guest as a trust feature. The deposit hold is always shown as distinct from the charged total, using the PRD 5.5 language ("held… not a charge… released within 7 days"). Step 3 (Payment) currently renders a **mock card form** when `STRIPE_SECRET_KEY` is unset (mock mode), and is the integration point for Stripe Elements + Apple Pay / Google Pay when the real client-side payment flow is wired up. Until then the server creates and confirms the intent with the `pm_card_visa` test PaymentMethod, returning the booking reference synchronously.

### 5.6 Currency toggle (`components/currency.tsx`)

A small client context drives a GBP/USD/EUR toggle in the header; the `Price` component re-renders any amount in the selected display currency without a server round-trip.

---

## 6. Security & Compliance Summary

| Concern | Mechanism |
|---|---|
| PCI-DSS scope | Server-side intent creation with `pm_card_visa` test PaymentMethod; no raw card data is collected by CheckinBliss. When Stripe Elements is wired up, card data will be tokenised client-side and never reach the server (PRD 4.6) |
| Double-booking | PostgreSQL GiST `EXCLUDE` constraint — a database invariant, not app logic (PRD 4.3) |
| Privilege separation | RLS on every table; writes only via server-side secret-key admin client |
| Operator scope | Row-level city scoping via `operator_assignments` (PRD 10.2) |
| Deposit safety | Manual-capture holds; no money moved unless a claim is approved; 7-day auto-release backstop (PRD 5.3) |
| Webhook integrity | `X-Hub-Signature-256` HMAC, timing-safe verification; unsigned traffic rejected (PRD 8.5) |
| Duplicate charges | Stripe idempotency key idempotency keyed on booking group (PRD 12.1) |
| Auditability | Append-only `audit_log` for sensitive actions, retained per PRD 8.5 |
| EMI regulatory avoidance | Deposits are card holds, not stored balances or transfers (PRD 5) |

---

## 7. Environment Configuration

All keys documented in `.env.example`. The platform runs in mock mode with none of them set.

- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `ANON_KEY`), `SUPABASE_SECRET_KEY` (or legacy `SERVICE_ROLE_KEY`, server-only).
- **Stripe:** `STRIPE_SECRET_KEY` (server-only), `STRIPE_WEBHOOK_SECRET` (server-only), `NEXT_PUBLIC_STRIPE_PK` (publishable, set when client-side Elements is wired up).
- **WhatsApp:** `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`.
- **Ops:** `CRON_SECRET` (Vercel Cron bearer), `ADMIN_DASH_KEY` (founder-only claim review at launch scale).