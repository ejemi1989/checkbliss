# CheckinBliss Architecture

## Stack

| Layer                | Tool                              | Purpose                                                        |
| -------------------- | --------------------------------- | ------------------------------------------------------------- |
| Framework            | Next.js 16 (App Router)           | Full stack framework                                          |
| Auth + DB            | Supabase                          | PostgreSQL, JWT Auth, Row Level Security                      |
| Payments             | Stripe                         | Hosted-fields card capture + manual-capture deposit holds     |
| Messaging            | WhatsApp Business (Meta Cloud API)| Owner/operator command bot + notifications                    |
| Scheduled jobs       | Vercel Cron                       | Inspection lifecycle, feedback, reconciliation                |
| Validation           | Zod                               | Request/input validation at every server boundary            |
| Styling              | Tailwind CSS v4                    | Token-driven editorial design system                         |
| Language             | TypeScript strict                 | Throughout                                                    |

---

## Folder Structure

```
/
├── app/
│   ├── layout.tsx                          → Root layout, header, currency provider, footer
│   ├── page.tsx                            → Storefront (editorial grid, city navigation)
│   ├── globals.css                         → Tailwind v4 @theme design tokens
│   ├── stays/
│   │   └── [slug]/
│   │       └── page.tsx                    → Property detail + checkout options
│   ├── book/
│   │   └── [slug]/
│   │       └── page.tsx                    → Server wrapper for BookingFlow
│   ├── confirmation/
│   │   └── [reference]/
│   │       └── page.tsx                    → Booking confirmation
│   ├── admin/
│   │   └── claims/
│   │       └── page.tsx                    → Simple damage-claim review (founder)
│   └── api/
│       ├── bookings/route.ts               → Atomic multi-city booking + charge + hold
│       ├── webhooks/
│       │   ├── whatsapp/route.ts           → Inbound owner/operator commands (HMAC verified)
│       │   └── stripe/route.ts          → PaymentIntent status events
│       └── cron/
│           ├── inspections/route.ts        → Inspection scheduler + 7-day auto-release
│           └── feedback/route.ts           → 24h post-checkout Trustpilot email
├── actions/
│   ├── claims.ts                           → Admin Approve/Adjust/Reject (capture/release)
│   ├── disputes.ts                         → Guest dispute within 7-day window
│   └── properties.ts                       → Owner edits (Launch-Supporting), operator verification
├── components/
│   ├── currency.tsx                        → Currency context + toggle + Price (client)
│   ├── property-card.tsx                   → EditorialArt + PropertyCard (PRD 6.5 hierarchy)
│   └── booking-flow.tsx                    → 3-step client booking flow
├── lib/
│   ├── supabase.ts                         → Browser / server / admin Supabase clients
│   ├── stripe.ts                        → Charge + deposit hold, capture/release, mock mode
│   ├── whatsapp.ts                         → Meta Cloud API send, HMAC verify, strict parsers
│   ├── currency.ts                         → GBP/USD/EUR display formatting (FX table)
│   ├── types.ts                            → Domain types + extendedCheckoutPriceMinor()
│   ├── data.ts                             → Inventory reads (DB or seed fallback)
│   └── seed-data.ts                        → 6 demo properties for mock mode
├── supabase/
│   ├── migrations/
│   │   ├── 0001_schema.sql                 → Enums, tables, GiST constraints, book_stays()
│   │   └── 0002_rls.sql                    → Row Level Security policies
│   └── seed.sql                            → Demo inventory
├── .env.example                            → All service credentials (mock mode if absent)
└── vercel.json                             → Cron schedule (inspections every 15 min)
```

---

## System Boundaries

| Folder           | Owns                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `app/`           | Pages and API routes only. No business logic — orchestration delegates to `lib/`.                |
| `actions/`       | Server Actions for internal, form-driven mutations only (claim decision, dispute, owner edits).  |
| `components/`    | UI only. No DB calls. Data passed via props from Server Components. Client state is minimal.      |
| `lib/`           | Domain logic + third-party clients (Supabase, Stripe, WhatsApp) + currency + types.            |
| `supabase/`      | Schema, RLS, atomic booking function, seed data. The source of truth.                            |

---

## Data Flow

### Booking — atomic multi-city (API Route)

```
Guest completes BookingFlow (1–5 stays)
        ↓
POST /api/bookings  — Zod validate + 14-day rule at edge
        ↓
book_stays() RPC — ONE transaction:
  lock rows → re-check 14-day + blocks → compute extended fee → insert reservations
  (GiST EXCLUDE prevents overlap; any conflict → rollback, NO charge)
        ↓
Stripe charge (auto-capture) + deposit hold (manual-capture)
        ↓
confirm_booking_group() → persist deposit_holds (7-day expires_at)
        ↓
Owner WhatsApp notification + audit_log
        ↓
On payment failure after reserve → compensating cancel (dates freed, nothing charged)
```

### Deposit hold lifecycle (Stripe + cron)

```
booking → [ held ]
   ├── operator CLEAN ──────────────▶ releaseHold()        → [ released ]
   ├── 7-day backstop (no action) ──▶ releaseHold()        → [ expired ]
   ├── admin Approve/Adjust ────────▶ captureFromHold(amt) → [ partially_captured ]  (remainder returned)
   └── admin Approve (major) ───────▶ capture full + invoice → [ fully_captured ]
```

### WhatsApp command (Webhook, Realtime-free)

```
Owner/operator sends message to bot
        ↓
POST /api/webhooks/whatsapp — verify X-Hub-Signature-256 (HMAC)
        ↓
Match sender E.164 to registered owner/operator (unknown → ignored)
        ↓
Strict parse → command (BLOCK / CLEAN / DAMAGE / ...)  (malformed → rejected, not guessed)
        ↓
Authorise (owner owns property / operator assigned to city)
        ↓
Mutation via admin client → audit_log → templated reply
```

### Inspection scheduler (Cron, every 15 min)

```
Vercel Cron → GET /api/cron/inspections (CRON_SECRET bearer)
        ↓
For reservations near/after confirmed_checkout_time:
  24h pre-notice → checkout prompt → +4h reminder → +48h escalation → +7d auto-release
        ↓
State = timestamp columns on inspections; each tick advances only what's due (idempotent)
```

### Currency display (Client state)

```
User taps GBP / USD / EUR toggle
        ↓
CurrencyProvider context updates (ephemeral, per tab)
        ↓
<Price> re-renders amount in selected currency (display only — charges settle GBP)
```

---

## Supabase Database Schema

### `auth.users` (Supabase managed)

Pre-configured by Supabase. Backs owner/operator/admin accounts. Guests may book without an account; guest details are captured on the reservation.

### `profiles`

| Column            | Type        | Notes                                       |
| ----------------- | ----------- | ------------------------------------------- |
| id                | uuid        | References auth.users                       |
| role              | user_role   | 'guest' / 'owner' / 'operator' / 'admin'    |
| full_name         | text        |                                             |
| email             | text        |                                             |
| whatsapp_e164     | text        | Unique — bot sender identity (PRD 8.2)      |
| whatsapp_opt_in   | boolean     | Default false                               |
| created_at        | timestamptz |                                             |

### `operator_assignments`

| Column      | Type | Notes                                |
| ----------- | ---- | ------------------------------------ |
| operator_id | uuid | References profiles                  |
| city        | text | Row-level scope (PRD 10.2)           |
| **PK**      |      | (operator_id, city)                  |

### `properties`

| Column                         | Type            | Notes                                          |
| ------------------------------ | --------------- | ---------------------------------------------- |
| id                             | uuid            |                                                |
| slug                           | text            | Unique                                         |
| owner_id                       | uuid            | References profiles                            |
| name                           | text            |                                                |
| city                           | text            | Lagos / Abuja                                  |
| neighbourhood                  | text            |                                                |
| description                    | text            |                                                |
| amenities                      | jsonb           | Array                                          |
| route_note                     | text            | Getting-there note                             |
| bedrooms                       | int             |                                                |
| sleeps                         | int             |                                                |
| currency                       | char(3)         | Default 'GBP'                                  |
| nightly_rate_minor             | int             | GBP pence                                      |
| deposit_minor                  | int             | Default 10000 (£100, PRD 5.2)                  |
| extended_checkout_offered      | boolean         | PRD 6.10                                       |
| extended_checkout_price_minor  | int             | NULL ⇒ default 40% of nightly                  |
| is_featured                    | boolean         |                                                |
| status                         | property_status | draft/pending_review/approved/suspended        |
| created_at                     | timestamptz     |                                                |

**Indexes:** GiST exclusion on `availability_blocks`; status filtered in RLS.

### `reservations`

| Column                  | Type               | Notes                                         |
| ----------------------- | ------------------ | --------------------------------------------- |
| id                      | uuid               |                                               |
| booking_group_id        | uuid               | Multi-city atomic checkout (PRD 4.3)          |
| reference               | text               | Unique                                        |
| property_id             | uuid               | References properties                         |
| guest_id                | uuid               | References profiles (nullable for guest)      |
| guest_name              | text               |                                               |
| guest_email             | text               |                                               |
| guest_phone             | text               |                                               |
| check_in                | date               |                                               |
| check_out               | date               |                                               |
| status                  | reservation_status | pending_payment/confirmed/cancelled/completed |
| confirmed_checkout_time | time               | 11:00 or 18:00 (PRD 6.10)                      |
| late_checkout_fee_minor | int                |                                               |
| accommodation_minor     | int                |                                               |
| total_minor             | int                |                                               |
| currency                | char(3)            | Default 'GBP'                                  |
| stripe_payment_intent_id | text           |                                               |
| created_at              | timestamptz        |                                               |

**Constraints:**
- `reservations_no_overlap` — **GiST EXCLUDE** on `(property_id, daterange(check_in, check_out))` where status ≠ cancelled. **Double-booking is impossible at the storage layer (PRD 4.3).**
- `check (check_out > check_in)`; 14-day advance enforced in `book_stays()` + edge.

**Indexes:** `reservations (check_out, status)` for the inspection scheduler.

### `deposit_holds`

| Column                  | Type        | Notes                                       |
| ----------------------- | ----------- | ------------------------------------------- |
| id                      | uuid        |                                             |
| reservation_id          | uuid        | References reservations                     |
| stripe_payment_intent_id | text     |                                             |
| hold_amount_minor       | int         |                                             |
| currency                | char(3)     | Default 'GBP'                               |
| status                  | hold_status | held/partially_captured/fully_captured/released/expired |
| expires_at              | timestamptz | 7-day backstop (PRD 5.3)                     |
| captured_amount_minor   | int         | Default 0                                   |
| released_at             | timestamptz |                                             |
| created_at              | timestamptz |                                             |

### `inspections`

| Column          | Type              | Notes                                  |
| --------------- | ----------------- | -------------------------------------- |
| id              | uuid              |                                        |
| reservation_id  | uuid              | References reservations                |
| operator_id     | uuid              | References profiles                    |
| result          | inspection_result | clean/damage/noshow/guestpresent       |
| inspected_at    | timestamptz       |                                        |
| notes           | text              |                                        |
| pre_notice_sent_at / prompt_sent_at / reminder_sent_at / escalated_at | timestamptz | Scheduler state machine (PRD 7.9) |
| created_at      | timestamptz       |                                        |

### `damage_claims`

| Column                  | Type           | Notes                                  |
| ----------------------- | -------------- | -------------------------------------- |
| id                      | uuid           |                                        |
| reservation_id          | uuid           | References reservations                |
| reporting_operator_id   | uuid           | References profiles                    |
| photos                  | jsonb          | Up to 5                                |
| description             | text           |                                        |
| estimated_cost_minor    | int            |                                        |
| admin_decision          | claim_decision | pending/approved/adjusted/rejected     |
| admin_reviewer_id       | uuid           |                                        |
| admin_decided_at        | timestamptz    |                                        |
| guest_dispute_status    | dispute_status | none/open/resolved_upheld/resolved_reversed |
| dispute_deadline        | timestamptz    | 7-day window (PRD 7.7)                  |
| resolved_amount_minor   | int            |                                        |
| resolved_at             | timestamptz    |                                        |
| created_at              | timestamptz    |                                        |

### `availability_blocks`

| Column      | Type | Notes                                            |
| ----------- | ---- | ------------------------------------------------ |
| id          | uuid |                                                  |
| property_id | uuid | References properties                            |
| starts      | date |                                                  |
| ends        | date |                                                  |
| source      | text | Default 'whatsapp' (owner BLOCK/UNBLOCK)         |

**Constraint:** GiST exclusion on `(property_id, daterange(starts, ends))` — owner blocks cannot overlap.

### `whatsapp_audit_log`

| Column          | Type    | Notes                          |
| --------------- | ------- | ------------------------------ |
| id              | bigint  | Identity                       |
| direction       | text    | 'in' / 'out'                   |
| wa_phone        | text    |                                |
| profile_id      | uuid    | References profiles            |
| body            | text    |                                |
| parsed_command  | text    |                                |
| accepted        | boolean |                                |
| created_at      | timestamptz | Retained 12 months (PRD 8.5)|

---

## Authentication

- Provider: Supabase Auth (owner / operator / admin accounts).
- Guests: may book **without** an account; guest details captured on the reservation. Optional account links bookings to a profile.
- Owners / operators: identified to the bot by **WhatsApp E.164** (`profiles.whatsapp_e164`), not a web login.
- Admin: web dashboard; founder-only at launch (`ADMIN_DASH_KEY`), upgradeable to role-based.
- RLS on every table; `auth_role()` helper derives role from `profiles`.
- **All writes funnel through the server-side admin client** — anon/authenticated clients never write to privileged tables.

---

## Supabase Client Pattern

Three clients — never mix them (`lib/supabase.ts`):

```typescript
// Browser — read-only storefront, governed by RLS
createBrowser();        // publishable / anon key

// Server (cookie-aware) — Server Components & signed-in handlers, governed by RLS
createServer();         // publishable / anon key + cookies

// Admin — server-ONLY, bypasses RLS by design. Every mutation goes through this.
createAdmin();          // secret / service-role key
```

Supports both new key names (`sb_publishable_…` / `sb_secret_…`) and legacy (`anon` / `service_role`). Runtime flags (`supabaseConfigured`, `supabaseAdminConfigured`) enable **mock mode** when keys are absent.

---

## Booking Pattern (atomic, server-owned safety)

```typescript
// app/api/bookings/route.ts  (Route Handler — idempotent, retry-safe)
const parsed = BookingSchema.parse(body);          // Zod + 14-day rule
const db = createAdmin();
const group = await db.rpc("book_stays", { ... }); // ATOMIC: overlap → 23P01 rollback, no charge
const charge = await stripe.charge(group, { capture: "automatic",
  request_id: `charge-${group.id}` });             // idempotency key
const hold = await stripe.hold(group, { capture: "manual",
  request_id: `hold-${group.id}` });
await db.rpc("confirm_booking_group", { group_id: group.id, intent: charge.id });
await persistDepositHolds(db, group, hold);        // 7-day expires_at
await whatsapp.notifyOwner(group);
await audit(db, "booking.confirmed", group);
// payment failure after reserve → cancel group (dates freed, nothing charged)
```

**The server orchestrates; it owns none of the safety:** the database owns non-overlap (GiST), Stripe owns money movement (manual-capture holds).

---

## Availability Pattern

```typescript
// Public availability exposes DATE RANGES ONLY — never guest PII
const { data } = await supabase.rpc("property_unavailable_ranges", { slug });
// returns [{ from, to }] from reservations (non-cancelled) + availability_blocks
```

Inventory reads fall back to `lib/seed-data.ts` when Supabase is unconfigured (mock mode), so the full flow runs with zero infrastructure.

---

## Cron Pattern (no Realtime at launch)

```typescript
// app/api/cron/inspections/route.ts
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return new Response("forbidden", { status: 403 });
  const db = createAdmin();
  // advance each reservation's inspection state machine by its timestamp columns
  await runInspectionLifecycle(db);   // pre-notice / prompt / reminder / escalation / 7d release
  return Response.json({ ok: true });
}
```

CheckinBliss is **request-time RSC + cron**, not realtime — availability correctness comes from DB invariants, not live subscriptions. (Supabase Realtime is an optional Phase-2 read accelerator for operator/admin queues.)

---

## Data Access Pattern

**Server Actions (internal, form-driven mutations):**

```typescript
// actions/claims.ts
"use server";
export async function decideClaim(input: ClaimDecision) {
  const { claimId, decision, amountMinor } = ClaimDecision.parse(input);
  await assertAdmin();
  const db = createAdmin();
  const claim = await loadClaim(db, claimId);
  if (decision === "reject") await releaseHold(claim.hold.intentId);
  else await captureFromHold(claim.hold.intentId,
        decision === "approve" ? claim.estimateMinor : amountMinor!);
  await recordDecision(db, claimId, decision, amountMinor);  // sets 7-day dispute window
  await audit(db, "claim.decision", { claimId, decision });
}
```

**API Routes (external callers / idempotent / webhooks / cron):**

```typescript
// app/api/webhooks/whatsapp/route.ts
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256")))
    return new Response("bad sig", { status: 401 });
  const sender = await matchRegistered(parseFrom(raw));   // unknown → ignore
  const cmd = parseOwnerOrOperatorCommand(raw);           // malformed → reject, never guess
  if (!cmd) return Response.json({ ignored: true });
  await dispatch(cmd, sender);                              // admin client + audit
  return Response.json({ ok: true });
}
```

---

## Invariants

Rules the codebase must never violate:

- **Double-booking is impossible** — enforced by a GiST `EXCLUDE` constraint, not application code (PRD 4.3).
- **14-day advance rule** enforced in depth: API edge → `book_stays()` → DB CHECK (PRD 4.2).
- **Multi-city checkout is atomic** — all stays confirm or all roll back; no partial bookings, no partial charges (PRD 4.3).
- **Card data never touches the server** — Stripe Elements, no redirect; out of PCI-DSS scope (PRD 4.6).
- **Deposits are manual-capture holds, never charges** — money moves only on an approved claim; 7-day auto-release backstop (PRD 5).
- **All writes use `createAdmin()`** in Server Actions / API routes. Never write from the browser or anon client.
- **Every mutation re-authorises** — owner owns the property; operator assigned to the city (PRD 10.2); admin is admin. The invocation surface grants nothing.
- **Webhooks are signature-verified; cron is secret-protected.** Unsigned/unknown senders are ignored.
- **WhatsApp parsing is strict** — malformed commands rejected, not guessed (PRD 8.5).
- **Money is integer minor units (GBP pence).** Charges settle in GBP; display only in GBP/USD/EUR; NGN excluded from display (PRD 12.1).
- **Idempotency on payments** — Stripe idempotency key keyed on `booking_group_id` prevents duplicate charges.
- **Reviews are Trustpilot-only** — no on-platform reviews; aggregate rating displayed (PRD 13.2).
- **Sensitive actions are audited** — bookings, suspensions, refunds, damage decisions (PRD 8.5 / 11.1).
- **Client state is ephemeral and minimal** — currency display + in-progress booking form only. No global client store; no browser storage of business data.
- **The database is the single source of truth** — caches and clients are never authoritative (PRD 4.1).
- **Mock mode must always work** — the full booking→payment→hold→confirmation flow runs with no Supabase/Stripe/WhatsApp credentials.