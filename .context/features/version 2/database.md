# Phase 2 — Database Design

**CheckinBliss** · PRD v2.3 §2B, §12.3 · PostgreSQL (Supabase). Additive evolution of the Phase 1 model — no Phase 1 table is dropped or restructured. DDL sketches are in `04-Schema.md`.

---

## 1. Generalisation Strategy

Phase 1 models one vertical (Stays). Phase 2 introduces sibling verticals (Nightlife, Experiences, Concierge) and a unifying booking group. Two viable patterns; the PRD favours minimal disruption, so:

- **Keep `reservations`** as the Stays table (untouched — preserves the GiST exclusion invariant).
- **Add per-vertical booking tables** (`nightlife_bookings`, `experience_bookings`, `concierge_requests`) that share a common `booking_group_id` so a mixed cart is one atomic group.
- **Promote `booking_group`** to a first-class table that ties verticals together for payment and confirmation.

## 2. New Entities

| Table | Holds | PRD |
|---|---|---|
| `booking_groups` | group id, guest, payment mode (`single`/`split`), status | 12.3 |
| `venues` | nightlife venues (clubs, lounges), city, editorial content | 2B |
| `venue_tables` | `(venue, tier)` capacity inventory | 2B |
| `nightlife_bookings` | `(venue, night, tier)`, party size, group id | 2B, 12.3 |
| `experiences` | festivals, curated dining, beach houses; city | 2B |
| `experience_slots` | `(experience, slot)` with seat capacity | 2B |
| `experience_bookings` | slot, seats, group id | 2B, 12.3 |
| `concierge_requests` | request, status, fulfilment notes | 2B |
| `split_payers` | per-payer share + Airwallex intent + auth state | 12.3 |
| `reels` | editorial video metadata, transcode status, CDN ref | 12.3 |
| `loyalty_accounts` / `loyalty_ledger` | points balance, tier, earn/burn entries | 12.3 |
| `investment_opportunities` / `investment_enquiries` | advisory listings & leads | 12.3 |

## 3. Slot vs Range Inventory

The key modelling difference from Phase 1:

- **Stays** — overlap prevention via `daterange` + GiST `EXCLUDE` (Phase 1, unchanged).
- **Nightlife / Experiences** — **capacity counters**, not ranges. A booking decrements remaining capacity inside the transaction; a `CHECK (remaining >= 0)` (or a guarded `UPDATE … WHERE remaining >= n`) prevents overbooking. This is the slot-based analogue of the stays invariant.

## 4. Atomic Mixed Cart

`booking_groups` is the unit of confirmation. A mixed cart inserts rows across `reservations`, `nightlife_bookings`, `experience_bookings` under one group in a single transaction; any capacity/overlap failure rolls the whole group back — the Phase 1 guarantee, generalised across verticals.

## 5. Split Payment Model (PRD 12.3)

`split_payers` rows hang off a `booking_group`: each carries a share amount, an Airwallex intent id, and an auth state (`pending → authorised → lapsed`). The group transitions to `confirmed` only when **every** payer is `authorised`; a lapsed payer past expiry triggers group release (sweep job). Deposit holds either split per payer or attach to a nominated lead guest.

## 6. Editorial Control Preserved (PRD 1 Key Principles)

Reels and all Lifestyle content remain **editorially controlled** — no user-generated content, no on-platform reviews. `reels` and venue/experience content tables carry the same `status` lifecycle (`draft → pending_review → approved → suspended`) as `properties`, gated by operators/admin.

## 7. Multi-Region (PRD 1)

The `city` column already scopes properties and operator assignments; Phase 2 adds Port Harcourt, then Ghana/Kenya/South Africa. Expansion implies a `regions` / `countries` reference for **per-country payout rails** and **display currencies**, but the existing city-scoped RLS generalises directly — an operator still sees only assigned cities.

## 8. RLS & Auditability (continuity)

All Phase 2 tables enable RLS on the same model: public reads of `approved` Lifestyle inventory; guests see their own bookings/loyalty; operators scoped by city; admin platform-wide; writes only via the server-side secret-key client. Every mutation continues to append to `audit_log`. Investment Services is a separate bounded context with its own stricter access policy.

## 9. Analytics (PRD 12.3)

Advanced reporting is delivered as **materialised views / a warehouse layer** over the operational tables (occupancy, revenue by city & vertical, claim and operator patterns) rather than new transactional tables — keeping the write path clean.