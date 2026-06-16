# Server Action Architecture — Version 2 (Phase 2)

**CheckinBliss** · PRD v2.3 §2B, §12.3 · Next.js 16 App Router. The Phase 2 evolution of the server-side mutation architecture: mixed-cart checkout across verticals, split-payment orchestration, the AI conversational layer, and loyalty/multi-region writes. The V1 trust model — Zod-validate → admin client → authorise → audit → fail-closed — is unchanged; V2 only adds new actions and generalises existing ones.

---

## 1. What V2 Adds

| New mutation | Mechanism | PRD |
|---|---|---|
| Mixed-cart checkout (Stays + Nightlife + Experiences) | Route Handler (`/api/cart/checkout`) | 2B, 12.3 |
| Split-payment open + per-payer authorise | Route Handler (`/api/cart/:group/split/*`) | 12.3 |
| Concierge request submit | Server Action | 2B |
| Loyalty redeem (at checkout) | within the checkout transaction | 12.3 |
| Reels publish (editorial) | Server Action (admin) | 12.3 |
| AI-resolved bot commands | Route Handler (webhook) → same command executors | 12.3 |

The Server-Action vs Route-Handler **decision rule is unchanged**: internal form-driven → Server Action; external / idempotent / webhook / cron → Route Handler.

## 2. Generalised Booking Mutation

V1's booking action is specialised to Stays. V2 generalises it to a **mixed cart** while keeping it a Route Handler (idempotency + retry + payment orchestration still apply):

```ts
// app/api/cart/checkout/route.ts  (Route Handler)
const Item = z.discriminatedUnion("type", [
  z.object({ type: z.literal("stay"),       propertyId: z.string(), checkIn: z.string(), checkOut: z.string(), extendedCheckout: z.boolean() }),
  z.object({ type: z.literal("nightlife"),  venueId: z.string(), night: z.string(), tier: z.string(), party: z.number().int().positive() }),
  z.object({ type: z.literal("experience"), experienceId: z.string(), slotId: z.string(), seats: z.number().int().positive() }),
]);
```

Resolution runs in **one transaction** (`book_cart()`), validating each item against its **type-specific availability** — Stays via the `daterange` GiST exclusion (V1 invariant), Nightlife/Experiences via **capacity decrements** guarded by `CHECK (remaining >= 0)`. Any failure rolls the whole cart back — the V1 atomicity guarantee, generalised across verticals.

## 3. Split-Payment Orchestration (PRD 12.3)

"Book together, pay separately" is multi-step and external-facing (each payer pays from their own device), so it is a set of **Route Handlers**, not Server Actions:

1. `POST /api/cart/checkout {mode: "split"}` — reserve group `pending_payment`, compute per-payer shares, write `split_payers` rows.
2. `POST /api/cart/:group/split` — create one Airwallex intent per payer (`request_id: share-<group>-<payer>`).
3. `POST /api/cart/:group/split/:payer/pay` — a payer authorises their share; status `pending → authorised`.
4. **Confirmation gate:** a DB trigger / service check confirms the group **only when every payer is `authorised`**; any lapsed payer past expiry releases the group (sweep cron).

The group remains the single unit of confirmation; the action layer coordinates N intents but still owns none of the safety — the **all-authorised gate** and **capacity/overlap constraints** live in the database.

## 4. AI Conversational Layer → Same Executors (PRD 12.3)

The Phase 2 AI bot does **not** introduce a new mutation path. Inbound WhatsApp still hits the **Route Handler webhook**; the NLU layer maps free text to the **same validated command set** as V1, and each resolved command calls the **same executor function** an operator/owner command would:

```
webhook (Route Handler) → signature+sender check (V1) → NLU map → V1 command executor
                                                          │
                                          ambiguous ──────┘──▶ strict confirmation (no guess)
```

Every executor is the identical Zod-validated, admin-client, audited function used in V1. The AI can only invoke commands the actor is authorised for (owner→owned properties, operator→assigned cities). This is the key safety property: **the conversational layer is a parser, not a new control plane.**

## 5. New Server Actions (internal, form-driven)

- **Concierge request** — guest submits a request from the web surface (Server Action; simple insert + audit).
- **Reels publish** — admin/operator approves and publishes editorial video (Server Action; `draft → approved`, editorial-controlled, no UGC).
- **Loyalty adjustments** — manual admin grants (Server Action); automatic earn/burn happens **inside** the checkout transaction so points are never burned for an unconfirmed booking.

## 6. Loyalty Inside the Transaction (PRD 12.3)

Redemption is not a separate action — it is folded into the checkout mutation: the redeemed value reduces the charge **before** the intent is created, and a `loyalty_ledger` debit is written **in the same transaction** as group confirmation. This guarantees atomicity (no burned points without a confirmed booking) and keeps loyalty out of the deposit-hold path entirely.

## 7. Multi-Region (PRD 1)

Region selection adds a `region_code` to the relevant mutations and routes payouts through the region's rail (`regions.payout_rail`) and display currency (`regions.display_currency`). No new mutation *mechanism* — existing actions gain a region parameter; operator authorisation still scopes by assigned city/region.

## 8. Continuity with V1

| Concern | V1 | V2 |
|---|---|---|
| Decision rule (action vs handler) | internal→action, external→handler | unchanged |
| Validation | Zod before side effects | unchanged |
| Write client | secret-key admin, server-only | unchanged |
| Authorisation | re-checked per action | unchanged; + region scope |
| Atomicity | `book_stays()` group | `book_cart()` group across verticals + payers |
| Safety ownership | DB owns non-overlap; Airwallex owns money | unchanged; DB owns capacity + all-authorised gate |
| Bot mutations | command executors | same executors, AI-fronted |
| Audit | sensitive actions logged | unchanged; AI logs free text + resolved command |

V2 introduces no new trust mechanism and relaxes no V1 invariant. It adds verticals, payers, a parser, and regions — all on top of the same server-side mutation foundation.