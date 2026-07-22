# CheckinBliss — Stripe Payment Implementation

Replaces Airwallex with Stripe. For a coding agent. Files written: `lib/stripe.ts` (same four exports, drop-in), `app/api/webhooks/stripe/route.ts` (reconciliation). Build these tasks in order.

---

## Why Stripe over Airwallex

- Larger developer ecosystem + better documented
- Stripe Elements is more mature than Airwallex hosted fields
- Better mock/test mode (Stripe CLI)
- Stronger webhook tooling (idempotency, replay, `stripe listen`)
- Same mental model: charge (auto) + hold (manual-capture) + release/capture

---

## What stays the same

- **Database schema** — `deposit_holds` still stores an intent id + status; the column currently named `airwallex_authorisation_id` stores a Stripe intent id going forward (rename in §3 optional but clean)
- **Business logic** — charge + hold at booking; release on CLEAN; capture on damage decision; 7-day auto-release backstop
- **Mock mode** — all four functions log when `STRIPE_SECRET_KEY` absent; full booking loop testable with no Stripe account

---

## 1. Install Stripe SDK

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

---

## 2. Environment variables

Add to `.env.local`:

```bash
STRIPE_SECRET_KEY=sk_test_...          # from Stripe Dashboard → API keys
STRIPE_WEBHOOK_SECRET=whsec_...        # from `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
NEXT_PUBLIC_STRIPE_PK=pk_test_...      # publishable key — safe for client
```

Production: swap `sk_test_` → `sk_live_`, `pk_test_` → `pk_live_`. Never expose `STRIPE_SECRET_KEY` to the client.

---

## 3. Replace `lib/airwallex.ts` → `lib/stripe.ts`

Copy `lib/stripe.ts` (provided). The four exports are **identical in name and signature:**

```ts
createBookingCharge(opts)    → PaymentResult { intentId, clientSecret, status }
createDepositHold(opts)      → PaymentResult { intentId, clientSecret, status }
releaseHold(intentId)        → void
captureFromHold(intentId, amountMinor) → void
```

All call sites — the booking route, the inspection cron, admin claim handlers — change **one import line only:**

```ts
// before
import { createBookingCharge, createDepositHold, releaseHold, captureFromHold } from "@/lib/airwallex";
// after
import { createBookingCharge, createDepositHold, releaseHold, captureFromHold } from "@/lib/stripe";
```

**No other changes needed in the booking route or cron** — the function signatures are preserved intentionally.

Optional cleanup: rename `deposit_holds.airwallex_authorisation_id` → `payment_intent_id`:
```sql
-- 0005_rename_hold_column.sql (optional, do after Stripe is live)
alter table deposit_holds rename column airwallex_authorisation_id to payment_intent_id;
```

---

## 4. Booking route changes

The booking flow changes in **one place only** — how the payment step works:

### Before (Airwallex)
Airwallex's hosted fields confirmed the payment server-side and returned a final status synchronously.

### After (Stripe)
Stripe uses **client-side confirmation** — the server creates a PaymentIntent and returns a `clientSecret`; the client (Stripe Elements) confirms it. This changes the booking route's response for the payment step:

```ts
// POST /api/bookings — after book_stays() succeeds, instead of capturing:
const charge = await createBookingCharge({ amountMinor, currency: "gbp", bookingGroupId, guestEmail, guestName, description });
const hold = await createDepositHold({ amountMinor: depositMinor, currency: "gbp", bookingGroupId, guestEmail, description: `Deposit: ${propertyName}` });

// Return the client secrets to the booking-flow UI
return Response.json({
  ok: true,
  bookingGroupId,
  chargeClientSecret: charge.clientSecret,
  holdClientSecret: hold.clientSecret,
});
// The booking-flow.tsx Stripe Elements component confirms both on the client
// The Stripe webhook then confirms the group once payment_intent.succeeded fires
```

The reservation is created (`pending_payment`) and the group is confirmed **by the webhook** (`payment_intent.succeeded`), not synchronously in the route. This is the Stripe-correct flow.

---

## 5. Booking flow UI — Stripe Elements (`components/booking-flow.tsx`)

Replace the Airwallex hosted fields with Stripe Elements. Install providers once in the booking page wrapper:

```tsx
// app/book/[slug]/page.tsx (server wrapper)
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PK!);

export default function BookPage() {
  return (
    <Elements stripe={stripePromise}>
      <BookingFlow />
    </Elements>
  );
}
```

In `BookingFlow` (step 3 — Payment):

```tsx
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// After the server returns chargeClientSecret and holdClientSecret:
const stripe = useStripe();
const elements = useElements();

async function confirmPayment(chargeClientSecret: string) {
  const { error, paymentIntent } = await stripe!.confirmPayment({
    elements,
    clientSecret: chargeClientSecret,
    confirmParams: { return_url: `${window.location.origin}/confirmation/${bookingRef}` },
    redirect: "if_required",   // stay on page for card payments; redirect for wallets
  });
  if (error) setPaymentError(error.message);
  // status check: webhook confirms the group async; show "confirming..." until webhook fires
}
```

**Stripe test cards for development:**
| Card | Behaviour |
|---|---|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0025 0000 3155` | Requires 3DS authentication |
| `4000 0000 0000 9995` | Charge declined |

Expiry/CVV: any future date, any 3 digits.

---

## 6. Webhook — `app/api/webhooks/stripe/route.ts`

Copy `app/api/webhooks/stripe/route.ts` (provided). Handles:

| Event | Action |
|---|---|
| `payment_intent.succeeded` | confirm the booking group (dates → confirmed) |
| `payment_intent.payment_failed` | cancel the group (dates freed, nothing charged) |
| `payment_intent.canceled` | hold released; `deposit_holds.status = released` |
| `payment_intent.amount_capturable_updated` | deposit authorised; `deposit_holds.status = held` |
| `charge.dispute.created` | flag for admin review |

**Register in Stripe Dashboard:** Webhooks → Add endpoint → `https://<your-domain>/api/webhooks/stripe` → select the five events above.

**Local testing with the Stripe CLI:**
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the whsec_... it prints → set as STRIPE_WEBHOOK_SECRET in .env.local
```

---

## 7. Remove Airwallex

Once Stripe is confirmed working:
- Delete `lib/airwallex.ts`
- Remove the Airwallex env vars (`AIRWALLEX_CLIENT_ID`, `AIRWALLEX_API_KEY`, etc.)
- Remove the Airwallex hosted-fields script from `app/layout.tsx` if present
- `npm uninstall` any Airwallex SDK package if installed

Do this **after** verifying a full booking (charge + hold + clean release) in Stripe test mode.

---

## 8. Test plan

### Mock mode (no Stripe, no DB)
```bash
# booking route returns mock client secrets — no Stripe calls
curl -X POST localhost:3000/api/bookings -d '{ ...valid booking body... }'
# expect: { ok: true, chargeClientSecret: "pi_mock_charge_..._secret_mock", ... }
```

### Stripe test mode (test keys + Stripe CLI)
1. `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
2. Book with test card `4242 4242 4242 4242`
3. Confirm both intents in Elements
4. CLI shows `payment_intent.succeeded` → webhook logs `stripe.event` to audit_log
5. Check `reservations.status = confirmed`
6. In the cron/bot: operator replies `CLEAN` → `releaseHold(intentId)` → Stripe CLI shows `payment_intent.canceled` → webhook marks `deposit_holds.status = released`

### Failure path
1. Book with `4000 0000 0000 9995` (decline)
2. `payment_intent.payment_failed` fires
3. Webhook cancels the reservation group; dates free

### Admin capture (damage)
1. Operator sends `DAMAGE` → admin approves £50 of a £100 hold
2. `captureFromHold(intentId, 5000)` → Stripe auto-cancels the remaining £50
3. `payment_intent.amount_capturable_updated` then `payment_intent.succeeded` fire

---

## 9. Hard rules (unchanged from Airwallex)

- **Stripe is the source of truth for payment state** — the webhook reconciles; the booking route is optimistic only
- **Never expose `STRIPE_SECRET_KEY` to the client** — all server-side calls via `lib/stripe.ts` only
- **All four functions mock-safe** — booking loop testable without credentials
- **Idempotency keys** — `charge-<groupId>` and `hold-<groupId>`; retries never double-charge
- **Webhook is idempotent** — deduped on Stripe event id via `audit_log`
- **Always return 400 on bad signature** (not 200) so Stripe knows to retry from a real failure
- **`release_hold` = `stripe.paymentIntents.cancel`** (not refund — the hold was never captured)

---

## 10. Definition of done

- [ ] `lib/stripe.ts` in place; `STRIPE_SECRET_KEY` set in `.env.local`
- [ ] All import sites changed from `@/lib/airwallex` → `@/lib/stripe`
- [ ] Booking route returns `chargeClientSecret` + `holdClientSecret`
- [ ] `BookingFlow` step 3 uses `PaymentElement` + `confirmPayment`
- [ ] `app/api/webhooks/stripe/route.ts` deployed; registered in Stripe Dashboard
- [ ] Stripe CLI confirms `payment_intent.succeeded` fires on test booking
- [ ] `CLEAN` → `releaseHold` → `payment_intent.canceled` → `deposit_holds.status = released`
- [ ] Declined card → `payment_intent.payment_failed` → reservation cancelled, dates freed
- [ ] `lib/airwallex.ts` deleted; Airwallex env vars removed
- [ ] Mock mode still works end to end

---

## 11. One paragraph for your coding agent

> Replace Airwallex with Stripe. Install `stripe @stripe/stripe-js @stripe/react-stripe-js`. Copy `lib/stripe.ts` — it exports the same four functions (`createBookingCharge`, `createDepositHold`, `releaseHold`, `captureFromHold`) with identical signatures, so every call site needs a one-line import change only. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_STRIPE_PK` in `.env.local`. Change the booking route: after `book_stays()` succeeds, create both intents and return `chargeClientSecret` + `holdClientSecret` to the client; booking group is confirmed by the `payment_intent.succeeded` webhook, not synchronously. In `BookingFlow` step 3, wrap the page in `<Elements stripe={stripePromise}>` and use `PaymentElement` + `useStripe().confirmPayment` to confirm the charge intent client-side. Copy `app/api/webhooks/stripe/route.ts` — it handles succeeded/failed/canceled/capturable-updated/dispute events, dedupes on Stripe event id via `audit_log`, and always returns 200 once the signature passes. Register the webhook in the Stripe Dashboard. Test with Stripe CLI (`stripe listen`): card `4242 4242 4242 4242` succeeds, `4000 0000 0000 9995` declines. Delete `lib/airwallex.ts` only after a full test-mode booking + release confirms end to end.