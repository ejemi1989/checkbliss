# Payment Flow — Version 2 (Phase 2)

**CheckinBliss** · PRD v2.3 §12.3, §2B, §1 · Airwallex. The Phase 2 (2027+) evolution of payments: **"book together, pay separately"** split payment, **mixed-cart** checkout across Stays + Lifestyle verticals, loyalty redemption, and multi-region payout rails. Everything in V1 still applies to single-payer Stays bookings — V2 is additive.

---

## 1. What V2 Adds (PRD 12.3 + 2B + 1)

| Capability | PRD |
|---|---|
| Split payment — "book together, pay separately" (deferred from v2.1 due to complexity) | 12.3 |
| Mixed-cart payment — Stays + Nightlife table + Experience in one checkout | 2B, 12.3 |
| Loyalty redemption applied at payment | 12.3 |
| Multi-region payout rails & display currencies (Port Harcourt; Ghana/Kenya/SA 2028) | 1 |

V1 invariants are unchanged: hosted fields (no PCI scope), deposits as manual-capture holds, idempotency, no BNPL, charges settle in the region's settlement currency.

## 2. The Group is the Unit of Payment

In V1 a booking group maps to **one** charge intent. V2 promotes `booking_groups` so a group can carry **N payment intents** — one per payer — while remaining the single unit of confirmation. The group confirms only when **every** intent authorises; otherwise it releases wholly. This preserves the V1 atomicity guarantee across both verticals and payers.

## 3. Mixed-Cart Checkout (single payer)

`POST /api/cart/checkout` with `payment.mode: "single"`:

1. Validate each item against its **type-specific availability** — Stays (date-range exclusion), Nightlife (table-tier capacity for the night), Experiences (seat capacity for the slot).
2. Reserve all items under one `booking_group` atomically — any capacity/overlap failure rolls back the whole cart (V1 guarantee, generalised).
3. **One booking charge** for the combined total (auto-capture), as V1.
4. **Deposit hold** still applies to the **Stays** portion only (PRD 5); Nightlife/Experiences are charge-only unless a venue requires its own hold.
5. Confirm the group; notify each vertical's owner/venue.

## 4. Split Payment — "Book together, pay separately" (PRD 12.3)

```
 POST /api/cart/checkout {mode: split}
        │  reserve group (pending_payment), compute per-payer shares
        ▼
 POST /api/cart/:group/split  ── creates one Airwallex intent per payer ──▶ Airwallex
        │                          (each payer: own hosted-fields session)
        ▼
 each payer ▶ POST /api/cart/:group/split/:payer/pay  (authorises their share)
        │
        ▼
 all payers authorised? ── yes ──▶ confirm group  → [ confirmed ]
                         └─ any lapsed past expiry ─▶ release group  → [ cancelled ]  (sweep job)
```

Rules:

- **Per-payer intent.** Each payer pays their share via their **own** embedded hosted-fields session — no payer sees another's card details.
- **All-or-nothing confirmation.** The group's reservations stay `pending_payment` until **every** payer is `authorised`. A payer who never authorises (intent expires) triggers group release via the sweep job, freeing the dates/slots.
- **Deposit on split.** The Stays deposit hold either **splits per payer** or attaches to a **nominated lead guest** — configurable per booking. Capture/release at checkout follows the V1 lifecycle against whichever payer(s) hold the deposit.
- **Idempotency.** `request_id: share-<group>-<payer>` per payer intent.

### Split state model

| `split_payers.status` | Meaning |
|---|---|
| `pending` | intent created, awaiting authorisation |
| `authorised` | payer's share authorised |
| `lapsed` | intent expired before authorisation → contributes to group release |

`GET /api/cart/:group/split/status` exposes per-payer state for the UI ("3 of 4 paid").

## 5. Loyalty Redemption (PRD 12.3)

Points burn is applied **before** the charge intent is created: the redeemed value reduces the charged total, and a `loyalty_ledger` debit is written in the same transaction as group confirmation (so points are never burned for an unconfirmed booking). Earning is credited on `completed` stays. Loyalty never touches the deposit hold.

## 6. Multi-Region Payments (PRD 1)

As CheckinBliss expands (Port Harcourt, then Ghana/Kenya/South Africa in 2028):

- **Display currencies** extend per region; the V1 GBP/USD/EUR display rule generalises via the `regions.display_currency` reference.
- **Settlement & payout rails** become per-country (`regions.payout_rail`) — the NGN layer (Africhange/Yolat) is one rail among several; each region routes owner payouts through its own partner, still **consolidated per owner per period** (PRD 9.3).
- Collection still flows through Airwallex; the payout leg is region-specific.

## 7. Continuity with V1

| Concern | V1 | V2 |
|---|---|---|
| Card entry | hosted fields, no redirect | unchanged |
| PCI scope | out of scope | unchanged |
| Booking charge | 1 intent, auto-capture | 1 (single) or N (split) intents |
| Deposit | manual-capture hold, Stays | unchanged; split/lead-guest options added |
| Confirmation unit | booking group | booking group (now multi-intent) |
| Atomicity | all-or-nothing | all-or-nothing across verticals **and** payers |
| Idempotency | `charge-<group>` / `hold-<group>` | `+ share-<group>-<payer>` |
| BNPL | excluded | excluded |

V2 introduces no relaxation of any V1 payment guarantee; it generalises the group to multiple verticals and multiple payers and layers loyalty and multi-region rails on top.