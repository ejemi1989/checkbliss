# State Architecture — Version 2 (Phase 2)

**CheckinBliss** · PRD v2.3 §2B, §12.3, §1 · Next.js 16 App Router. The Phase 2 evolution of state management: cross-vertical cart state, the distributed state of split payment, the AI conversation layer, loyalty, optional real-time, and multi-region. The V1 principles — DB as source of truth, minimal client state, URL-driven navigation, externals mirrored not owned, strong consistency for money — are **all preserved**. V2 adds new state, not a new philosophy.

---

## 1. What V2 Adds

| New state | Layer | PRD |
|---|---|---|
| Mixed-cart (Stays + Nightlife + Experiences) | new: short-lived cart state | 2B, 12.3 |
| Split-payment per-payer authorisation | distributed external + DB | 12.3 |
| Loyalty balance / tier | DB source of truth | 12.3 |
| AI conversation context | bounded, ephemeral | 12.3 |
| Reels playback / feed | client UI only | 12.3 |
| Multi-region selection | URL + DB | 1 |

## 2. Cart State — the one genuinely new client-ish layer

V1 had no cart: a booking was created in a single call. V2's mixed cart (a stay + a table + an experience) needs to hold **multiple selected items before checkout**. Two options, and the V2 stance follows the V1 anti-drift bias:

- **Preferred:** keep the cart as **short-lived server state** — a `booking_groups` row in `pending_payment` created as items are added, so availability is validated against the DB continuously and the cart is recoverable across devices (important for split payment, where other payers join later).
- **Avoided:** a purely client-side cart of business items — it would drift from real availability and cannot be shared with co-payers.

The cart is therefore **DB-backed**, not a client store; the client holds only the current view of it. This keeps the V1 rule intact: availability and price are never authoritative on the client.

## 3. Split-Payment — Distributed State Done Safely (PRD 12.3)

Split payment is the most complex new state because it spans **multiple people on multiple devices over time**:

```
 booking_groups.status: pending_payment ─────────────▶ confirmed
        ▲                                                 ▲
        │  split_payers[i].status: pending → authorised   │
        │  (each payer, own device, own Airwallex intent) │
        └──── any payer lapsed past expiry ──▶ cancelled (sweep cron)
```

- **Source of truth:** `split_payers` rows in the DB — never client memory. A payer returning hours later reads current state from the server.
- **Confirmation gate as a DB rule:** the group flips to `confirmed` only when *all* payers are `authorised` — enforced in the database/service layer, not by any client.
- **No optimistic UI** on payment, exactly as V1. `GET …/split/status` returns the authoritative "3 of 4 paid" view.

This is a textbook distributed-state problem solved the V1 way: push the truth to the DB, gate transitions with invariants, never trust a client.

## 4. AI Conversation State (PRD 12.3)

The Phase 2 AI bot needs *some* conversation context (e.g. "block those dates" referring to a prior message), but it stays **bounded and ephemeral**:

- Context window is **short-lived** and scoped to the WhatsApp 24h service window; it is **not** a durable store of business state.
- Any *action* the AI resolves still writes through the V1 command executors to the DB — so the **authoritative result is always DB state**, never the conversation buffer.
- The audit log records the free text **and** the resolved command, so conversation state is reconstructable for compliance without being the source of truth.

Principle preserved: the conversation is a transient parser context; the database remains authoritative.

## 5. Loyalty State (PRD 12.3)

- **Source of truth:** `loyalty_accounts` (balance, tier) + `loyalty_ledger` (append-only earn/burn).
- **Atomicity:** burn is written **inside** the checkout transaction (no points spent on an unconfirmed booking); earn on `completed` stays. Loyalty never enters client state except as a read-only display.

## 6. Real-Time (optional, Phase 2)

Supabase Realtime could push live updates for surfaces that benefit — operator inspection queues, admin claim queues, "X of N paid" on split payment. If adopted:
- Real-time is a **read accelerator**, not a new source of truth — it streams DB changes; the DB still owns state.
- Mutations still go through the server mutation layer; no client writes via the realtime channel.

This is additive and optional; V1's request-time RSC reads remain the baseline.

## 7. Multi-Region State (PRD 1)

- **Region selection** lives in the URL (`/ng-ph/...` or `?region=`) and on the relevant DB rows (`region_code`), consistent with V1's URL-as-navigational-state rule.
- **Currency display** state (the V1 client context) generalises to per-region display currencies; still display-only, still never authoritative over the charged amount.

## 8. Caching & Consistency (unchanged stance)

- Dynamic rendering for inventory/availability/cart/payment surfaces; correctness over cache.
- Reels introduce **media caching/CDN** state (video delivery) — but that is content delivery, not business state.
- Strong consistency for all money/availability paths (Stays, Nightlife capacity, Experience seats, split-payment gate); externals mirrored and reconciled.
- No optimistic client updates on money or capacity.

## 9. Continuity with V1

| Concern | V1 | V2 |
|---|---|---|
| Source of truth | PostgreSQL | unchanged; + loyalty, cart, split tables |
| Client state | currency + in-progress form | + cart *view* + Reels UI; cart truth is DB-backed |
| Navigational state | URL params | unchanged; + region |
| External state | Airwallex/WhatsApp/inspection, mirrored | + per-payer intents, AI context (ephemeral) |
| Consistency | strong for booking/money | unchanged across all verticals + split gate |
| Optimistic updates | none on money/availability | none on money/capacity/split |
| Real-time | request-time RSC | optional Realtime as read accelerator |

V2 introduces no global client store and no new source of truth. Cart, split payment, loyalty, and AI context all resolve to **DB-owned, server-authoritative state** — the V1 architecture applied to more verticals, more payers, and more regions.