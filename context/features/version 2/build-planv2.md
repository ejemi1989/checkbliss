# CheckinBliss Build Plan — V2 (Phase 2)

## Core Principle

Same discipline as V1: **full page UI built with mock data first — verified visually before any logic is written.** Then functionality is built and wired step by step. Every feature visible and testable before the next. Mock mode must keep working end to end.

**V2 is strictly additive.** Every V1 invariant holds unchanged — the database owns non-overlap and capacity, Airwallex owns money (manual-capture holds), hosted fields keep card data off our servers, the WhatsApp bot stays fail-closed, reviews stay Trustpilot-only. V2 adds verticals, payers, a parser, and regions — never a new trust model.

**Prerequisite:** V1 (all 25 Launch-Critical features) shipped and stable, with real bookings. Do **not** start V2 before launch — it is P4 in `feature-backlog.md` ("do not pull forward"). Scope from PRD §2B, §12.3, §1. Read with `User-Flow-V2.md`, `phase2/` docs, `Payment-Flow-V2.md`.

---

## Phase 8 — Generalised Booking Core (the foundation for everything else)

### 26 Bookable-resource model

Generalise the V1 stays-only engine to typed bookable resources before any vertical is built.

**Logic:**
- `booking_groups` promoted to a first-class table (guest, payment_mode single/split, status).
- `book_cart()` atomic RPC accepting a discriminated set of items (stay | nightlife | experience); all confirm or all roll back.
- Stays keep date-range GiST exclusion (unchanged); add **capacity-counter** primitive (`CHECK (remaining >= 0)`) as the slot analogue.
- No UI yet — this is the spine the next phases build on.

### 27 Mixed-cart checkout — Full UI

Build the cart UI with mock items across verticals. No payment yet.

**UI:**
- Cart drawer/page showing stay + nightlife + experience line items, combined total, deposit (stays portion only).
- Add/remove items; per-item availability state.

**Logic:**
- `POST /api/cart/checkout` (mode: single) → `book_cart()` → one charge (auto) + deposit hold on stays portion → confirm group.
- DB-backed cart (`booking_groups` pending_payment), not a client store.

---

## Phase 9 — Nightlife

### 28 Nightlife browse + detail — Full UI

**UI:**
- `/nightlife` venue grid (editorial cards), `/nightlife/[slug]` detail with table tiers + ambience.
- Capacity shown as "tables remaining", never a pressure tactic.

### 29 Nightlife booking — Logic

**Logic:**
- `venues`, `venue_tables`, `nightlife_capacity` tables.
- `GET /api/nightlife/[slug]/availability` (table-tier slots for a night).
- `POST /api/nightlife/bookings` (or via cart) → decrement remaining capacity inside the tx.
- Charge; confirm; notify venue.

---

## Phase 10 — Experiences

### 30 Experiences browse + detail — Full UI

**UI:**
- `/experiences` grid (festivals, curated dining, beach houses), `/experiences/[slug]` with slots + seats.
- Seat capacity in the same understated metadata weight as V1's "late checkout" indicator.

### 31 Experiences booking — Logic

**Logic:**
- `experiences`, `experience_slots` (seats_total / seats_remaining) tables.
- `POST /api/experiences/bookings` → decrement seats inside the tx.
- Charge; confirm; notify host/operator.

---

## Phase 11 — Concierge

### 32 Concierge — Full UI + Logic

**UI:**
- Quiet editorial request composer; status tracker (open → in_progress → fulfilled).

**Logic:**
- `concierge_requests` table; `POST /api/concierge/requests` (Server Action); `GET /api/concierge/requests/[id]`.

---

## Phase 12 — Split Payment

### 33 "Book together, pay separately" — Full UI

Deferred from v2.1 for complexity. Build the multi-payer UI with mock state.

**UI:**
- Split toggle at checkout; per-payer share list; "3 of 4 paid" status; pay link per payer.

### 34 Split payment — Logic

**Logic:**
- `split_payers` table (share, intent id, status pending/authorised/lapsed).
- `POST /api/cart/[group]/split` → one Airwallex intent per payer (`request_id: share-<group>-<payer>`).
- `POST /api/cart/[group]/split/[payer]/pay` → mark authorised.
- **Confirmation gate (DB rule):** group → confirmed only when all payers authorised; any lapsed past expiry → sweep releases group.
- Deposit splits per payer or to a nominated lead guest. No optimistic UI.

---

## Phase 13 — AI Conversational WhatsApp

### 35 NLU layer over the strict parser

**Logic:**
- After the V1 signature + sender checks, an NLU layer maps free text → an existing V1-validated command.
- Confident + unambiguous → execute via the **same** V1 command executors. Ambiguous → strict confirmation prompt ("Block 15–20 Sep for Unit 2 — yes?"), never guess.
- Audit logs both the free text and the resolved command. Degrades to V1 syntax if the AI layer is down.
- **Guardrail:** parser, not a new control plane; cannot escalate privilege beyond the actor's V1 authorisation.

---

## Phase 14 — Editorial Reels

### 36 Reels — Full UI

**UI:**
- Curated home rail + in-detail Reels; full-bleed, muted-by-default, serif overlay titles, brass progress. Not infinite scroll.

### 37 Reels — Pipeline + Logic

**Logic:**
- `reels` table; `POST /api/admin/reels` → ingest → transcode → CDN; `draft → pending_review → approved` (editorial-controlled, no UGC).
- `GET /api/reels` curated feed. Media stored in object storage with signed delivery.

---

## Phase 15 — Loyalty

### 38 Loyalty — Full UI

**UI:**
- Restrained tier + benefits display (brass tier marker, points as a quiet figure — no gamified badges).

### 39 Loyalty — Logic

**Logic:**
- `loyalty_accounts`, `loyalty_ledger`.
- Burn applied **before** the charge intent (reduces total); ledger debit written **inside** the checkout tx (no points burned on an unconfirmed booking). Earn on `completed` stays/events.
- Never touches the deposit hold; never sentiment-gated (protects Trustpilot integrity).

---

## Phase 16 — Investment Services

### 40 Investment Services — Full UI + Logic

**UI:**
- `/investment` opportunity listings (editorial), enquiry form.

**Logic:**
- Separate bounded context with stricter access policy; `investment_opportunities`, `investment_enquiries`; not coupled to the booking core.

---

## Phase 17 — Advanced Analytics

### 41 Analytics & reporting

**Logic:**
- Materialised views / warehouse layer over operational tables: occupancy + revenue by city & vertical, claim + operator patterns, supply growth vs target.
- Admin analytics surfaces (`/api/admin/analytics/*`). Read models, not new write paths.

---

## Phase 18 — Multi-Region Expansion

### 42 Region framework

**Logic:**
- `regions` reference (region_code, display_currency, payout_rail); `region_code` on inventory/operators.
- Operator city/region scope generalises directly (RLS unchanged); display currency extends per region (still display-only; charge settles in the region's settlement currency); payouts route per-region rail, consolidated per owner.

### 43 Port Harcourt launch

**Logic:** new operator network + inventory under the existing model. First new region — proves the framework.

### 44 Ghana / Kenya / South Africa (2028)

**Logic:** per-country payout rails + display currencies; per-region operator networks. Editorial tone constant across regions.

---

## Feature Count

| Phase | Features |
|-------|----------|
| 8 — Generalised Booking Core | 2 |
| 9 — Nightlife | 2 |
| 10 — Experiences | 2 |
| 11 — Concierge | 1 |
| 12 — Split Payment | 2 |
| 13 — AI Conversational WhatsApp | 1 |
| 14 — Editorial Reels | 2 |
| 15 — Loyalty | 2 |
| 16 — Investment Services | 1 |
| 17 — Advanced Analytics | 1 |
| 18 — Multi-Region | 3 |
| **Total (continues from V1's 25)** | **19 (features 26–44)** |

---

## Recommended sequencing (validate, don't build blind)

1. **Phase 8 first, always** — the generalised core is the prerequisite for every vertical.
2. **Then the highest-leverage diaspora bets, validated by V1 traffic:** split payment (Phase 12) and nightlife (Phase 9) are the plausible early winners — but build the one your real booking data points to, not both on spec.
3. **AI bot (Phase 13)** is a high-leverage UX win on the existing base — low new surface area.
4. Experiences, Concierge, Reels, Loyalty as the platform broadens.
5. Investment Services + Analytics + Multi-region last — biggest bets, most external dependencies (per-country payout rails especially).

## Guardrails (unchanged from V1)
- DB owns non-overlap **and** capacity; Airwallex owns money; hosted fields keep PCI out.
- Atomic group confirmation across verticals **and** payers; no optimistic updates on money/capacity/split.
- AI bot is a parser over V1 executors — no privilege escalation.
- Reviews Trustpilot-only; content editorially controlled (no UGC) including Reels.
- Every V1 flow keeps working unchanged. Mock mode keeps working.

## What this is NOT
This is a roadmap, not the next sprint. Per `feature-backlog.md`, V2 is **P4 — do not pull forward** until V1 has shipped and real bookings indicate demand. Re-estimate each feature before committing (method in `CheckinBliss-Cost-Estimate.md`).