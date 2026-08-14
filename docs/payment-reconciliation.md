# Payment Reconciliation

**Status:** Live · **Owner:** Platform payments
**App code:** `lib/reconciliation.ts` (orchestrator) + `app/api/cron/reconcile/route.ts` (Vercel cron entry) · **DB guard:** `booking_groups.charge_intent_id` / `reconciliation_log` (`supabase/migrations/0016_reconciliation.sql`)

## The question this answers

> *"Payment succeeds but booking creation fails — how do we know the customer paid and recover/reconcile?"*

The webhook (`app/api/webhooks/stripe/route.ts`) is the normal confirmation path: `payment_intent.succeeded` → reservations + group confirmed, inspection scheduled, owner notified. Webhooks can be **dropped or delayed**. A charge can succeed while the app-side confirm never runs. The reconcile cron is the backstop.

## The policy

Every hour (Vercel cron → `CRON_SECRET` bearer check), the reconcile job lists booking-charge PaymentIntents and classifies each:

| Intent state | Group found? | Group charge_status | Disposition | Action |
|--------------|--------------|---------------------|-------------|--------|
| `succeeded` | yes | `succeeded` | `ok` | Nothing — already confirmed |
| `succeeded` | yes | `pending` / null | `recover` | **Mirror the webhook:** confirm reservations + group, schedule inspection, notify owner, write `reconciliation_log` |
| `succeeded` | no | — | `refund` | **Orphaned payment** — customer paid for dates that were never held. Refund the charge, write `reconciliation_log` |
| anything else (incl. deposit-hold intents) | — | — | `skip` | Ignored — holds are never auto-captured; non-booking intents are out of scope |

### Classification (pure, unit-tested)

`classifyPaymentIntent(intent, group)` in `lib/reconciliation.ts`:

- only `succeeded` booking-charge intents are in scope
- a missing group always means refund (nothing was reserved for this money)
- a pending group always means recover (dates were held by `book_stays()`, the customer paid — complete the booking, never keep the money and the dates in limbo)

## Failure stories covered

1. **Payment succeeded, webhook dropped.** Charge `succeeded` in Stripe, group stuck `pending_payment`. Reconcile recovers: reservations → `confirmed`, group → `confirmed` + `charge_status` `succeeded`, `inspection_schedule` created, owner WhatsApp sent. No double-charge, no double-notify (upsert is idempotent on `reservation_id`).
2. **Payment succeeded but `booking_groups` insert failed.** Nothing persisted, dates were released by compensation. Reconcile finds an intent with **no group → refunds** the customer. Money never sits in a ghost state.
3. **Customer pays twice (duplicate PAY-PAY).** The second click is rejected at the DB by the GiST `EXCLUDE` constraint / mock range lock before any second charge is created — so a duplicate payment never happens at source. If one ever does appear at Stripe (e.g. retry storms), the orphaned-intent branch refunds it.
4. **Deposit-hold intent succeeded.** Never touched — deposits are manual-capture holds, and money only moves on an approved damage claim (AGENTS.md rule).

## Recovery is a faithful mirror of the webhook

`confirmGroupFromReconciliation()` reproduces `app/api/webhooks/stripe/route.ts`'s `payment_intent.succeeded` branch exactly: same updates, same inspection upsert, same owner message. Recovery is idempotent — running reconcile twice yields `ok` on the second run (charge_status is already `succeeded`).

## Audit trail

Every evaluated intent writes a `reconciliation_log` row:

```sql
-- intent_id, group_id, disposition ('ok' | 'recovered' | 'refunded'), detail
select * from reconciliation_log order by created_at desc limit 50;
```

## Running it

- **Mock mode** (no credentials): `npm run dev` → `GET /api/cron/reconcile`. Uses the in-memory intent ledger + mock booking-group registry so the full "paid but webhook missed it" story is demonstrable. Covered by `tests/reconciliation.test.ts`.
- **Real mode:** set `STRIPE_SECRET_KEY` + `SUPABASE_SECRET_KEY` (+ `SUPABASE_DATA_LOADED=true`). Lists PaymentIntents created in the last `RECONCILE_LOOKBACK_DAYS` (7), joins to `booking_groups` by `charge_intent_id`, and applies the policy.

### Demonstrate the recover flow (mock)

```
POST /api/bookings   → 201 (group pending_payment, charge intent in ledger)
# simulate webhook miss — do nothing
GET /api/cron/reconcile → outcomes: [{ disposition: "recover" }]
# booking now confirmed, inspection scheduled, owner notified
```

### Demonstrate the refund flow (mock)

```
# create a charge whose group never persisted (simulated)
# confirm it paid
GET /api/cron/reconcile → outcomes: [{ disposition: "refund" }]
# intent refunded in ledger, customer not charged
```
