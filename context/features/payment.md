# Payment Flow — Version 1 (Launch)

**CheckinBliss** · PRD v2.3 §4.6, §5, §12.1 · Airwallex. The Launch-Critical payment architecture for the **Stays** vertical: one booking charge plus one security-deposit pre-authorisation hold per booking, both run through Airwallex without ever taking card data onto CheckinBliss servers.

---

## 1. Principles (PRD-mandated)

- **No redirect, no PCI scope (4.6).** Card entry uses Airwallex **hosted fields embedded in the CheckinBliss checkout page**, styled to match the brand. The guest never leaves CheckinBliss and card data never touches our servers.
- **Deposit is a hold, not a charge (5).** Security deposits are **pre-authorisation holds** (manual-capture PaymentIntents) — they reserve credit, move no money, and avoid EMI regulatory complexity.
- **Two operations per booking (5.1).** A booking charge (auto-capture, settles) and a deposit hold (manual-capture, authorises only).
- **Idempotent (12.1).** `request_id` keyed on the booking group prevents duplicate charges on retry.
- **Premium positioning (4.6).** Card, Apple Pay, Google Pay. **No BNPL** (Klarna/Clearpay explicitly excluded).
- **Multi-currency display only (12.1).** GBP/USD/EUR shown; charges settle in **GBP**; local (NGN) equivalent excluded from display.

## 2. Actors & Components

```
 Guest browser            CheckinBliss server           Airwallex
 ─────────────            ───────────────────           ─────────
 hosted fields  ──intent──▶  POST /api/bookings  ──────▶ create PaymentIntent (charge, auto)
 (in-page, no                book_stays() first          create PaymentIntent (hold, manual)
  redirect)     ◀─secret──   confirm group        ◀────── authorised / succeeded
                              persist deposit_holds
                              owner WhatsApp notice
```

## 3. Booking Payment Sequence

1. **Reserve first, charge second.** `POST /api/bookings` runs `book_stays()` — the atomic, multi-city reservation transaction (PRD 4.3). Only if reservations succeed does any money operation begin. *No reservation, no charge.*
2. **Booking charge** — Airwallex PaymentIntent, `capture_method: automatic`, amount = stay total (+ any extended-checkout fee), settles to the platform Airwallex account. `request_id: charge-<booking_group_id>`.
3. **Deposit hold** — a **separate** PaymentIntent, `capture_method: manual`, amount = property deposit (typically £50–100, PRD 5.2). Authorises against available credit; **no money moves**. `request_id: hold-<booking_group_id>`.
4. **Confirm** the reservation group against the charge intent (`confirm_booking_group`).
5. **Persist** a `deposit_holds` row per reservation with `status: held` and the **7-day backstop** `expires_at` (PRD 5.3).
6. **Notify** the owner via WhatsApp (PRD 4.5).

What the guest sees on their statement: the booking charge as a real transaction, the deposit as a **pending authorisation** (PRD 5.1).

## 4. Failure Handling

If a money operation fails **after** reservations exist, the booking group is cancelled immediately so the dates free up, and the guest is told their dates were released and **nothing was charged** (HTTP 502). The DB exclusion constraint prevents the double-book race; this compensating cancel handles the payment-failure path.

## 5. Deposit Hold Lifecycle (PRD 5.3–5.4)

```
                 booking
                    │
                    ▼
                 [ held ] ───────── clean checkout (operator: CLEAN) ──▶ release  → [ released ]
                    │                7-day backstop (no admin action) ──▶ release  → [ expired ]
                    │
                    ├── minor damage, admin Approve/Adjust ── capture part ──▶ [ partially_captured ]  (remainder auto-returned)
                    └── major damage, admin Approve ───────── capture full ──▶ [ fully_captured ]      (+ separate invoice/charge)
```

The three post-checkout outcomes (PRD 5.4):

| Outcome | Frequency | Action | Hold result |
|---|---|---|---|
| **A. Clean** | ~95% | operator replies `CLEAN` → auto-release | `released` — no money ever moved |
| **B. Minor damage** | <5% | admin Approve/Adjust → capture damage amount only | `partially_captured`; remainder released |
| **C. Major damage** | <0.5% | admin Approve → capture full hold + separate invoice/charge | `fully_captured` (+ additional charge) |

**Backstop (5.3):** if inspection never completes within 7 days of scheduled checkout, the hold auto-releases — a guest is never penalised for an operational failure.

## 6. Airwallex Operations Used

| Purpose | Endpoint | Capture mode |
|---|---|---|
| Auth | `POST /api/v1/authentication/login` | — |
| Booking charge | `POST /api/v1/pa/payment_intents/create` | `automatic` |
| Deposit hold | `POST /api/v1/pa/payment_intents/create` | `manual` |
| Release hold | `POST /api/v1/pa/payment_intents/:id/cancel` | — |
| Capture (partial/full) | `POST /api/v1/pa/payment_intents/:id/capture` | partial supported |

Environment switches between `api-demo.airwallex.com` and `api.airwallex.com`. A cached bearer token fronts all calls.

## 7. Capture from Hold (damage path)

On an approved/adjusted claim the admin decision endpoint calls `captureFromHold(intentId, amountMinor)` — Airwallex partial capture returns the remainder to the guest automatically. The guest is notified with photos and given a **7-day dispute window** (PRD 7.7); no dispute finalises the capture, a dispute returns it to admin review.

## 8. Guest Communication (PRD 5.5)

Booking confirmation states the deposit plainly, e.g.: a deposit of £100 will be **held** on the card for the stay — **not a charge**, reserving available credit only — and **automatically released within 7 days** of checkout if no damage occurs.

## 9. Payout (PRD 12.1)

Owner payouts settle to NGN through the confirmed partner (Africhange or Yolat), **consolidated per owner per period** (PRD 9.3) — one transfer covering all of an owner's units, never one per unit per booking. Booking funds collect in GBP to the platform Airwallex account; the payout layer handles the GBP→NGN leg.

## 10. Reconciliation (Launch-Supporting)

A daily job compares Airwallex records against CheckinBliss records and flags discrepancies (PRD 12.2) — a Tier-2 enhancement, not a launch blocker.