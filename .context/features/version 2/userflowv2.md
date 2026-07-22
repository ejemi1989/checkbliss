# CheckinBliss — User Flow V2 (Phase 2)

For an AI coding agent. Phase 2 (2027+) flows that build **on top of V1** — V1 flows are unchanged for single-payer Stays. Scope from PRD §2B, §12.3, §1. Read alongside `User-Flow-V1.md`, `phase2/02-API.md`, `Server-Action-Architecture-V2.md`, `State-Architecture-V2.md`.

**Invariants preserved from V1:** DB owns non-overlap/capacity; Airwallex owns money (manual-capture holds); hosted fields (no PCI scope); fail-closed bot parsing; no on-platform reviews; minor-units money; no optimistic updates on money/capacity. V2 adds verticals, payers, a parser, regions — no new trust model.

---

## 0. What V2 adds

| Capability | New flows |
|---|---|
| Mixed cart (Stays + Nightlife + Experiences) | 1, 2 |
| "Book together, pay separately" (split payment) | 3 |
| AI conversational WhatsApp | 4 |
| Lifestyle: Nightlife / Experiences / Concierge | 5, 6, 7 |
| Loyalty | 8 |
| Editorial Reels | 9 |
| Investment Services | 10 |
| Multi-region (Port Harcourt → GH/KE/ZA) | 11 |

Inventory model generalises: **Stays = date-range exclusion** (V1, unchanged); **Nightlife/Experiences = capacity counters** decremented inside the booking tx (`CHECK (remaining >= 0)` is the slot analogue of the GiST constraint).

---

## FLOW 1 — Mixed cart, single payer (web)

**Trigger:** guest adds items across verticals, then `POST /api/cart/checkout` with `payment.mode: "single"`.

1. Zod-validate a **discriminated union** of items (`stay` | `nightlife` | `experience`).
2. **`book_cart()` — one atomic tx:** validate each item against its type-specific availability (stay → daterange exclusion; nightlife → `(venue, night, tier)` capacity; experience → `(slot)` seat capacity), insert under one `booking_groups` row. Any failure → whole cart rolls back.
3. **One charge** (auto-capture) for the combined total.
4. **Deposit hold** applies to the **Stays portion only** (PRD §5); Nightlife/Experiences charge-only unless a venue requires its own hold.
5. Confirm group; notify each vertical's owner/venue; audit.

**Errors:** per-item availability failures map to 409 (capacity/overlap) with "nothing charged"; the whole group is atomic.

---

## FLOW 2 — Cart state (web/server)

- Cart is **DB-backed** (`booking_groups` in `pending_payment`), not a client store — recoverable across devices, validated against live availability, and shareable for split payment.
- Client holds only the current *view* of the cart.

---

## FLOW 3 — Split payment "book together, pay separately" (web, multi-device)

**Trigger:** `POST /api/cart/checkout` with `payment.mode: "split"`.

1. Reserve group `pending_payment`; compute per-payer shares; write `split_payers` rows (`status: pending`).
2. `POST /api/cart/:group/split` → create **one Airwallex intent per payer** (`request_id: share-<group>-<payer>`); distribute pay links.
3. Each payer (own device, own hosted-fields session): `POST /api/cart/:group/split/:payer/pay` → their `split_payers.status = authorised`.
4. **Confirmation gate (DB rule):** group → `confirmed` **only when every payer is `authorised`**.
5. Any payer lapses past `expires_at` → sweep cron releases the group (reservations + slots freed).
6. Deposit hold: split per payer **or** nominated lead guest (configurable).

**Read model:** `GET /api/cart/:group/split/status` → "{n} of {m} paid".
**Invariant:** no optimistic UI; group is the unit of confirmation; clients never authoritative.

---

## FLOW 4 — AI conversational WhatsApp (owner/operator)

**Trigger:** free-text WhatsApp message.

1. **Unchanged V1 gate:** signature verify → sender match → else reject/ignore.
2. **NLU layer** maps free text → a **V1-validated command** (`BLOCK`, `CLEAN`, …).
3. Confident & unambiguous → execute via the **same V1 command executor** (Zod → admin client → audit).
4. Ambiguous/low-confidence → **strict confirmation prompt** ("Block 15–20 Sep for Sunset Dove Unit 2 — yes?"), never guess.
5. Audit logs **both** free text and resolved command.

**Invariant:** AI is a parser, not a new control plane. It can only invoke commands the actor is authorised for (owner→owned units, operator→assigned cities). If the AI layer is down, V1 command syntax still works.

---

## FLOW 5 — Nightlife booking (web)

**Trigger:** `/nightlife` → `/nightlife/[slug]` → reserve a table.

1. `GET /api/nightlife/[slug]/availability` → table-tier slots for a night (capacity counters).
2. `POST /api/nightlife/bookings` (or via mixed cart) → decrement `nightlife_capacity.remaining` inside the tx (`CHECK (remaining >= 0)` prevents overbooking).
3. Charge; confirm; notify venue.

**State:** capacity, not date ranges. Availability shown as "tables remaining", never a pressure tactic.

---

## FLOW 6 — Experiences booking (web)

**Trigger:** `/experiences` → `/experiences/[slug]` → book a slot.

1. `GET` slot/seat capacity for `experience_slots`.
2. `POST /api/experiences/bookings` → decrement `seats_remaining` inside the tx.
3. Charge; confirm; notify operator/host.

---

## FLOW 7 — Concierge request (web)

**Trigger:** `POST /api/concierge/requests` (Server Action).

1. Insert `concierge_requests` (`status: open`); audit.
2. `GET /api/concierge/requests/:id` tracks `open → in_progress → fulfilled`.
3. Quiet, editorial UI — no aggressive CTAs.

---

## FLOW 8 — Loyalty (web; inside checkout)

**Trigger:** guest redeems points at checkout.

1. Burn applied **before** the charge intent (reduces charged total).
2. `loyalty_ledger` debit written **in the same tx as group confirmation** → no points burned for an unconfirmed booking.
3. Earn credited on `completed` stays/events.
4. Loyalty never touches the deposit hold. Engagement-based; **never** gated on leaving a positive review (protects Trustpilot integrity).

---

## FLOW 9 — Editorial Reels (web; admin-published)

**Trigger:** admin/operator publishes; guest views.

1. `POST /api/admin/reels` → ingest → transcode → CDN; `reels.status: draft → pending_review → approved` (editorial-controlled, **no UGC**).
2. Guest feed `GET /api/reels` — curated rail, not infinite scroll; muted-by-default, serif overlay titles.

---

## FLOW 10 — Investment Services (web; separate context)

**Trigger:** `/investment` browse → enquiry.

1. `GET /api/investment/opportunities` (separate bounded context, stricter access policy).
2. `POST /api/investment/enquiries` → lead captured; audit.
3. Not coupled to the booking core.

---

## FLOW 11 — Multi-region (cross-cutting)

**Trigger:** region rollout (Port Harcourt; then Ghana/Kenya/South Africa 2028).

1. `regions` reference: `region_code`, `display_currency`, `payout_rail`.
2. Inventory/operators gain `region_code`; operator city/region scope generalises directly (RLS unchanged).
3. Display currency extends per region (still display-only; charge settles in the region's settlement currency).
4. Payouts route through the region's rail, **consolidated per owner per period**.
5. Editorial tone constant across regions; only inventory + currency change.

---

## Continuity summary

| Concern | V1 | V2 |
|---|---|---|
| Booking unit | `booking_group` (stays) | `booking_group` across verticals + payers |
| Atomicity | `book_stays()` | `book_cart()` (all-or-nothing across verticals) |
| Payment | 1 intent | 1 (single) or N (split) intents |
| Availability guard | GiST daterange exclusion | + capacity `CHECK (remaining >= 0)` |
| Bot | command-based | NLU → same V1 executors |
| Reviews | Trustpilot only | unchanged |
| Optimistic updates | none on money/availability | none on money/capacity/split |
| Source of truth | PostgreSQL | unchanged; + cart/split/loyalty/region tables |

V2 is strictly additive. Every V1 flow keeps working unchanged; new flows reuse V1's validation, payment, deposit, audit, and authorisation machinery.