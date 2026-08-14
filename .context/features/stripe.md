# CheckinBliss — Comprehensive Stripe Implementation

The single definitive guide for the entire Stripe payment layer. For a coding agent. Covers every file, every flow, every edge case, every test. Read alongside `User-Flow-V1.md` and `Inspection-Flow.md`.

---

## 0. Architecture in one diagram

```
Guest browser              CheckinBliss server              Stripe
──────────────             ───────────────────              ──────
                           POST /api/bookings
                             1. book_stays() ← atomic DB tx
                             2. createBookingCharge()  ──────────▶ PaymentIntent (auto-capture)
                             3. createDepositHold()    ──────────▶ PaymentIntent (manual-capture)
                             4. return { chargeClientSecret, holdClientSecret }
Stripe Elements  ◀─────────────────────────────────────────────── client secrets
confirmPayment() ────────────────────────────────────────────────▶ card confirmed
                                                                    webhook fires
                           POST /api/webhooks/stripe ◀────────────  payment_intent.succeeded
                             5. confirm booking group
                             6. notify owner (WhatsApp)

--- checkout ---
operator: CLEAN            lib/stripe.releaseHold()  ────────────▶ paymentIntents.cancel()
                                                      ◀────────────  payment_intent.canceled
                           deposit_holds.status = released

--- damage ---
admin: Approve             lib/stripe.captureFromHold() ──────────▶ paymentIntents.capture()
                                                         ◀──────────  payment_intent.succeeded
                           deposit_holds.status = captured
```

**Two invariants that never change:**
1. **Stripe owns money** — the DB reflects Stripe state, never the other way around.
2. **Reserve before charge** — `book_stays()` locks dates before any Stripe call; payment failure → compensating cancel frees the dates.

---

## 1. Environment variables

```bash
# .env.local
STRIPE_SECRET_KEY=sk_test_...          # Server only. sk_test_ for dev, sk_live_ for prod.
STRIPE_WEBHOOK_SECRET=whsec_...        # From `stripe listen` (dev) or Dashboard (prod).
NEXT_PUBLIC_STRIPE_PK=pk_test_...      # Client-safe. pk_test_ for dev, pk_live_ for prod.
```

**Never expose `STRIPE_SECRET_KEY` to the browser.** It only appears in server-only files (`lib/stripe.ts` has `import "server-only"`).

---

## 2. Installation

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

---

## 3. `lib/stripe.ts` — the payment library

Five exports. All call sites in the app go through this file — never call Stripe directly from a route or action.

```ts
import "server-only";
import Stripe from "stripe";

const SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
export const stripeConfigured = Boolean(SECRET_KEY);

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeConfigured) throw new Error("Stripe not configured: set STRIPE_SECRET_KEY");
  if (!_stripe) _stripe = new Stripe(SECRET_KEY, { apiVersion: "2024-06-20", typescript: true });
  return _stripe;
}

// --- Types ---

export interface BookingChargeOpts {
  amountMinor: number;       // GBP pence (e.g. 48000 = £480)
  currency: string;          // "gbp"
  bookingGroupId: string;    // idempotency key + metadata
  guestEmail: string;
  guestName: string;
  description: string;       // "CheckinBliss: The Palm Nest, 15–19 Sep"
}

export interface DepositHoldOpts {
  amountMinor: number;       // e.g. 10000 = £100
  currency: string;          // "gbp"
  bookingGroupId: string;
  guestEmail: string;
  description: string;       // "Security deposit: The Palm Nest"
}

export interface PaymentResult {
  intentId: string;
  clientSecret: string;      // passed to Stripe Elements on the client
  status: string;
}

// --- 1. Booking charge (auto-capture — money moves) ---

export async function createBookingCharge(opts: BookingChargeOpts): Promise<PaymentResult> {
  if (!stripeConfigured) {
    const id = `pi_mock_charge_${opts.bookingGroupId}`;
    console.log(`[stripe:mock] charge ${id} £${opts.amountMinor / 100}`);
    return { intentId: id, clientSecret: `${id}_secret_mock`, status: "requires_payment_method" };
  }
  const intent = await getStripe().paymentIntents.create(
    {
      amount: opts.amountMinor,
      currency: opts.currency,
      capture_method: "automatic",
      receipt_email: opts.guestEmail,
      description: opts.description,
      metadata: { booking_group_id: opts.bookingGroupId, guest_name: opts.guestName, type: "booking_charge" },
    },
    { idempotencyKey: `charge-${opts.bookingGroupId}` }
  );
  return { intentId: intent.id, clientSecret: intent.client_secret!, status: intent.status };
}

// --- 2. Deposit hold (manual-capture — no money moves) ---

export async function createDepositHold(opts: DepositHoldOpts): Promise<PaymentResult> {
  if (!stripeConfigured) {
    const id = `pi_mock_hold_${opts.bookingGroupId}`;
    console.log(`[stripe:mock] hold ${id} £${opts.amountMinor / 100}`);
    return { intentId: id, clientSecret: `${id}_secret_mock`, status: "requires_payment_method" };
  }
  const intent = await getStripe().paymentIntents.create(
    {
      amount: opts.amountMinor,
      currency: opts.currency,
      capture_method: "manual",
      description: opts.description,
      metadata: { booking_group_id: opts.bookingGroupId, type: "deposit_hold" },
    },
    { idempotencyKey: `hold-${opts.bookingGroupId}` }
  );
  return { intentId: intent.id, clientSecret: intent.client_secret!, status: intent.status };
}

// --- 3. Release hold (CLEAN / 7-day backstop / admin reject) ---

export async function releaseHold(intentId: string): Promise<void> {
  if (!stripeConfigured) { console.log(`[stripe:mock] releaseHold ${intentId}`); return; }
  // cancel() on an uncaptured manual intent returns funds to the card immediately
  await getStripe().paymentIntents.cancel(intentId, { cancellation_reason: "abandoned" });
}

// --- 4. Capture from hold (admin damage decision) ---

export async function captureFromHold(intentId: string, amountMinor: number): Promise<void> {
  if (!stripeConfigured) { console.log(`[stripe:mock] capture ${intentId} £${amountMinor / 100}`); return; }
  // Partial capture — Stripe auto-cancels the remainder, returning it to the card
  await getStripe().paymentIntents.capture(intentId, { amount_to_capture: amountMinor });
}

// --- 5. Webhook event construction (server only) ---

export function constructStripeEvent(rawBody: string, sigHeader: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not set");
  return getStripe().webhooks.constructEvent(rawBody, sigHeader, secret);
}
```

---

## 4. Database — `deposit_holds` table

The existing `deposit_holds` table stores the Stripe intent id. Column `airwallex_authorisation_id` should be renamed:

```sql
-- 0005_stripe_migration.sql (apply once)
alter table deposit_holds
  rename column airwallex_authorisation_id to stripe_payment_intent_id;

-- Add a charge intent id column (previously not tracked separately)
alter table deposit_holds
  add column stripe_charge_intent_id text;

comment on column deposit_holds.stripe_payment_intent_id
  is 'Stripe PaymentIntent id for the deposit hold (manual-capture)';
comment on column deposit_holds.stripe_charge_intent_id
  is 'Stripe PaymentIntent id for the booking charge (auto-capture)';
```

---

## 5. Booking route — `app/api/bookings/route.ts`

The critical order: **reserve → charge → hold → confirm → notify**. Any step failure triggers compensation.

```ts
import { createBookingCharge, createDepositHold, stripeConfigured } from "@/lib/stripe";
import { notifyOwner, fmtRange } from "@/lib/notifications";
import { createAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  // --- 1. Validate ---
  const body = await req.json();
  // (Zod validation, 14-day check — see User-Flow-V1.md §3b)

  // --- 2. Reserve (atomic DB tx — must succeed before any money) ---
  const db = createAdmin();
  const { data: group, error } = await db.rpc("book_stays", { ...params });
  if (error) return Response.json({ error: "unavailable" }, { status: 409 });

  const { bookingGroupId, stays, totalMinor, depositMinor, ownerPhone, guestEmail, guestName } = group;

  // --- 3. Create Stripe intents ---
  let charge: PaymentResult;
  let hold: PaymentResult;
  try {
    charge = await createBookingCharge({
      amountMinor: totalMinor,
      currency: "gbp",
      bookingGroupId,
      guestEmail,
      guestName,
      description: `CheckinBliss: ${stays.map(s => s.propertyName).join(", ")}`,
    });
    hold = await createDepositHold({
      amountMinor: depositMinor,
      currency: "gbp",
      bookingGroupId,
      guestEmail,
      description: `Security deposit: ${stays[0].propertyName}`,
    });
  } catch (err) {
    // Stripe failed after reserving — compensating cancel to free the dates
    await db.rpc("cancel_booking_group", { p_group_id: bookingGroupId });
    console.error("[bookings] Stripe intent creation failed — dates freed:", err);
    return Response.json({ error: "payment_unavailable" }, { status: 502 });
  }

  // --- 4. Persist intent ids (booking confirmed by webhook, not here) ---
  await db.from("deposit_holds").insert({
    reservation_id: stays[0].reservationId,
    stripe_payment_intent_id: hold.intentId,
    stripe_charge_intent_id: charge.intentId,
    hold_amount_minor: depositMinor,
    status: "pending",           // webhook sets to "held" on amount_capturable_updated
    expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  });

  // --- 5. Return client secrets for Stripe Elements to confirm ---
  // The booking group is confirmed by the webhook (payment_intent.succeeded)
  // not here — this is the Stripe-correct async pattern.
  return Response.json({
    ok: true,
    bookingGroupId,
    chargeClientSecret: charge.clientSecret,
    holdClientSecret: hold.clientSecret,
  });
}
```

---

## 6. Booking flow UI — Stripe Elements

### 6a. Page wrapper — `app/book/[slug]/page.tsx`

```tsx
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PK!);

export default function BookPage({ params }: { params: { slug: string } }) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        appearance: {
          theme: "none",
          variables: {
            // Match CheckinBliss design tokens (ui-tokens.md)
            colorPrimary: "#0D3D56",       // --lagoon
            colorBackground: "#FAFAF5",    // --bone
            colorText: "#1A1A1A",          // --ink
            colorDanger: "#C0392B",
            fontFamily: "var(--font-serif)",
            borderRadius: "2px",
          },
        },
      }}
    >
      <BookingFlow slug={params.slug} />
    </Elements>
  );
}
```

### 6b. Payment step — `components/booking-flow.tsx` (step 3)

```tsx
"use client";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useState } from "react";

export function PaymentStep({
  chargeClientSecret,
  holdClientSecret,
  bookingGroupId,
  onSuccess,
}: {
  chargeClientSecret: string;
  holdClientSecret: string;
  bookingGroupId: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    // Step 1: confirm the booking charge
    const { error: chargeError } = await stripe.confirmPayment({
      elements,
      clientSecret: chargeClientSecret,
      confirmParams: { return_url: `${window.location.origin}/confirmation/${bookingGroupId}` },
      redirect: "if_required",  // stay on page for card; redirect for wallets/bank
    });
    if (chargeError) {
      setError(chargeError.message ?? "Payment failed — nothing was charged.");
      setLoading(false);
      return;
    }

    // Step 2: confirm the deposit hold on the same card
    // Use confirmPayment with the hold's clientSecret but the same Elements instance
    const { error: holdError } = await stripe.confirmPayment({
      elements,
      clientSecret: holdClientSecret,
      confirmParams: { return_url: `${window.location.origin}/confirmation/${bookingGroupId}` },
      redirect: "if_required",
    });
    if (holdError) {
      // Charge succeeded but hold failed — log for admin; don't block the booking
      console.error("[booking-flow] deposit hold failed (non-fatal):", holdError.message);
    }

    setLoading(false);
    onSuccess();
  }

  return (
    <div className="space-y-6">
      <PaymentElement
        options={{
          layout: "tabs",         // card / apple pay / google pay as tabs
          paymentMethodOrder: ["card", "apple_pay", "google_pay"],
          wallets: { applePay: "auto", googlePay: "auto" },
        }}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handlePay}
        disabled={!stripe || loading}
        className="w-full bg-lagoon text-bone py-3 text-sm tracking-wide uppercase"
      >
        {loading ? "Confirming…" : "Reserve instantly"}
      </button>
      <p className="text-xs text-muted text-center">
        Your £{depositMinor / 100} deposit is held, not charged.
        Released within 7 days of a clean checkout.
      </p>
    </div>
  );
}
```

---

## 7. Webhook — `app/api/webhooks/stripe/route.ts`

Stripe is the source of truth. This webhook reconciles the DB to Stripe's state.

```ts
import { constructStripeEvent } from "@/lib/stripe";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase";
import { notifyOwner } from "@/lib/notifications";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event;
  try {
    event = constructStripeEvent(raw, sig);
  } catch {
    return new Response("bad signature", { status: 400 });
  }

  const db = supabaseAdminConfigured ? createAdmin() : null;

  // Idempotency: skip already-processed events
  if (db) {
    const { data } = await db.from("audit_log").select("id")
      .eq("action", "stripe.event")
      .contains("subject", { stripe_event_id: event.id })
      .limit(1);
    if (data?.length) return Response.json({ ok: true, duplicate: true });
  }

  try {
    await handleStripeEvent(event, db);
  } catch (err) {
    console.error("[webhooks/stripe]", err);
    // Still 200 so Stripe doesn't retry indefinitely on our DB errors
  }

  return Response.json({ ok: true });
}

async function handleStripeEvent(event: any, db: any) {
  const obj = event.data.object;
  const groupId = obj.metadata?.booking_group_id;

  switch (event.type) {

    // ── Booking charge succeeded → confirm the group ──────────────────────
    case "payment_intent.succeeded": {
      if (obj.metadata?.type !== "booking_charge") break;
      if (groupId && db) {
        await db.from("reservations")
          .update({ status: "confirmed" })
          .eq("booking_group_id", groupId)
          .eq("status", "pending_payment");

        // Create inspection_schedule row (IMPL-notifications-cron.md Task 2)
        const { data: res } = await db.from("reservations")
          .select("id, stay, confirmed_checkout_time")
          .eq("booking_group_id", groupId)
          .eq("status", "confirmed");

        for (const r of res ?? []) {
          const checkoutDate = r.stay?.toUpperCase?.() ?? ""; // upper(stay) = checkout date
          const checkoutAt = `${checkoutDate}T${r.confirmed_checkout_time ?? "11:00:00"}+01:00`;
          await db.from("inspection_schedule").insert({
            reservation_id: r.id,
            checkout_at: new Date(checkoutAt).toISOString(),
          }).onConflict("reservation_id").ignore();
        }

        // Notify owner
        const { data: owner } = await db.from("reservations")
          .select("guest_name, stay, properties!inner(name, owners!inner(whatsapp_e164))")
          .eq("booking_group_id", groupId).limit(1).maybeSingle();
        if (owner?.properties?.owners?.whatsapp_e164) {
          await notifyOwner.newBooking(
            owner.properties.owners.whatsapp_e164,
            owner.properties.name,
            owner.stay,
            owner.guest_name,
          ).catch(console.error);
        }
      }
      break;
    }

    // ── Charge failed → cancel group + free dates ─────────────────────────
    case "payment_intent.payment_failed": {
      if (groupId && db) {
        await db.from("reservations")
          .update({ status: "cancelled" })
          .eq("booking_group_id", groupId)
          .eq("status", "pending_payment");
      }
      break;
    }

    // ── Hold authorised ───────────────────────────────────────────────────
    case "payment_intent.amount_capturable_updated": {
      if (obj.metadata?.type === "deposit_hold" && db) {
        await db.from("deposit_holds")
          .update({ status: "held" })
          .eq("stripe_payment_intent_id", obj.id);
      }
      break;
    }

    // ── Hold cancelled (CLEAN / 7d backstop / admin reject) ──────────────
    case "payment_intent.canceled": {
      if (db) {
        await db.from("deposit_holds")
          .update({ status: "released", released_at: new Date().toISOString() })
          .eq("stripe_payment_intent_id", obj.id)
          .eq("status", "held");
      }
      break;
    }

    // ── Dispute raised → flag for admin ──────────────────────────────────
    case "charge.dispute.created": {
      if (db) {
        await db.from("audit_log").insert({
          actor: "stripe:webhook",
          action: "dispute.raised",
          subject: { charge_id: obj.id, payment_intent_id: obj.payment_intent },
        });
      }
      break;
    }

    // ── Refund created (admin-initiated refund on a captured charge) ──────
    case "charge.refunded": {
      if (db) {
        await db.from("audit_log").insert({
          actor: "stripe:webhook",
          action: "charge.refunded",
          subject: { charge_id: obj.id, amount_refunded: obj.amount_refunded },
        });
      }
      break;
    }
  }

  // Audit every event
  if (db) {
    await db.from("audit_log").insert({
      actor: "stripe:webhook",
      action: "stripe.event",
      subject: { stripe_event_id: event.id, type: event.type, group_id: groupId ?? null },
    });
  }
}
```

---

## 8. Deposit lifecycle — all state transitions

```
booking created
     │
     ▼
[ pending ]  ──── payment_intent.amount_capturable_updated ────▶  [ held ]
                                                                      │
                          ┌───────────────────────────────────────────┤
                          │                                           │
              operator: CLEAN                              operator: DAMAGE
              +7d no action                                admin decides
                          │                                           │
                          ▼                                           ▼
[ released ]  ◀── releaseHold() ──── payment_intent.canceled      Approve/Adjust
                                                              captureFromHold()
                                                                      │
                                                    ┌─────────────────┴──────────────────┐
                                                    ▼                                    ▼
                                         [ partially_captured ]              [ fully_captured ]
                                         (remainder auto-returned             (no remainder)
                                          by Stripe partial capture)
```

---

## 9. Admin damage decision — wiring

In `app/admin/claims/actions.ts` (Server Action, `assertAdmin`):

```ts
import { captureFromHold, releaseHold } from "@/lib/stripe";
import { createAdmin } from "@/lib/supabase";

export async function decideClaim(claimId: string, decision: "approve" | "adjust" | "reject", amountMinor?: number) {
  const db = createAdmin();
  const { data: claim } = await db.from("damage_claims").select("*, deposit_holds!inner(*)")
    .eq("id", claimId).maybeSingle();
  if (!claim) throw new Error("claim not found");

  const intentId = claim.deposit_holds.stripe_payment_intent_id;
  const estimateMinor = claim.estimated_cost_minor;

  switch (decision) {
    case "approve":
      await captureFromHold(intentId, estimateMinor);
      await db.from("deposit_holds").update({ status: "fully_captured" }).eq("id", claim.deposit_holds.id);
      break;
    case "adjust":
      await captureFromHold(intentId, amountMinor!);
      await db.from("deposit_holds").update({ status: "partially_captured" }).eq("id", claim.deposit_holds.id);
      break;
    case "reject":
      await releaseHold(intentId);
      await db.from("deposit_holds").update({ status: "released", released_at: new Date().toISOString() }).eq("id", claim.deposit_holds.id);
      break;
  }

  await db.from("damage_claims").update({ admin_decision: decision }).eq("id", claimId);
  await db.from("audit_log").insert({ actor: "admin", action: `claim.${decision}`, subject: { claim_id: claimId, amount_minor: amountMinor ?? estimateMinor } });
}
```

---

## 10. Inspection cron — hold release

In `app/api/cron/inspections/route.ts`, the 7-day backstop (already built):

```ts
import { releaseHold } from "@/lib/stripe"; // ← was lib/airwallex

// +7d auto-release
const { data: hold } = await db.from("deposit_holds")
  .select("stripe_payment_intent_id")
  .eq("reservation_id", r.reservation_id)
  .eq("status", "held")
  .maybeSingle();
if (hold?.stripe_payment_intent_id) {
  await releaseHold(hold.stripe_payment_intent_id).catch(console.error);
}
```

---

## 11. Webhook registration

### Local development (Stripe CLI)
```bash
# Install: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# ← copy the whsec_... printed → STRIPE_WEBHOOK_SECRET in .env.local
```

### Production (Stripe Dashboard)
- Dashboard → Developers → Webhooks → Add endpoint
- URL: `https://checkinbliss.com/api/webhooks/stripe`
- Select events:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `payment_intent.canceled`
  - `payment_intent.amount_capturable_updated`
  - `charge.dispute.created`
  - `charge.refunded`
- Copy signing secret → `STRIPE_WEBHOOK_SECRET`

---

## 12. Test plan

### Test cards
| Card number | Behaviour |
|---|---|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0025 0000 3155` | Requires 3DS authentication |
| `4000 0000 0000 9995` | Declined |
| `4000 0000 0000 0069` | Charge succeeds, refund fails |
| `4000 0000 0000 0259` | Triggers dispute |

Expiry: any future date. CVV: any 3 digits. Postcode: any.

### Test sequence (with Stripe CLI running)

**Happy path:**
```bash
# 1. Book with 4242 4242 4242 4242
# 2. CLI shows: payment_intent.amount_capturable_updated (hold authorised)
#              payment_intent.succeeded (charge)
# 3. DB: reservations.status = confirmed; deposit_holds.status = held
# 4. Simulate operator CLEAN:
curl -X POST localhost:3000/api/webhooks/whatsapp \
  -H "x-hub-signature-256: $SIG" -d '{ ...CLEAN payload... }'
# 5. CLI shows: payment_intent.canceled
# 6. DB: deposit_holds.status = released
```

**Declined card:**
```bash
# 1. Book with 4000 0000 0000 9995
# 2. CLI shows: payment_intent.payment_failed
# 3. DB: reservations.status = cancelled (dates freed)
```

**Damage + admin approve:**
```bash
# 1. Operator sends DAMAGE → photos → estimate
# 2. Admin approves £50 of £100 hold
# 3. captureFromHold(intentId, 5000) fires
# 4. CLI shows: payment_intent.succeeded (partial capture)
# 5. Stripe auto-cancels the remaining £50
# 6. DB: deposit_holds.status = partially_captured
```

**7-day backstop:**
```bash
# 1. Backdate inspection_schedule.checkout_at to 8 days ago
# 2. Trigger cron: curl -H "authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/inspections
# 3. releaseHold fires
# 4. CLI shows: payment_intent.canceled
# 5. DB: deposit_holds.status = expired
```

---

## 13. Edge cases + hard rules

| Case | Rule |
|---|---|
| Stripe call fails after `book_stays()` | Compensating cancel frees dates immediately. Guest sees "nothing charged." |
| Webhook fires before DB write completes | Idempotency key on the intent; DB is eventually consistent via webhook. |
| Hold capture fails (card expired) | Admin is alerted via `charge.dispute.created` / error log; manual resolution. |
| Partial capture leaves remainder | Stripe auto-returns remainder to card within 7 days. No action needed. |
| Duplicate webhook delivery | `audit_log` dedup on `stripe_event_id` — second delivery is a no-op. |
| Guest disputes after 7 days | Standard chargeback flow via Stripe Dashboard; flagged in `audit_log`. |
| Hold expired before decision | `captureFromHold` on a cancelled intent throws — catch + alert admin. |
| Two payers same booking (V2) | One intent per payer (`share-<group>-<payer>` idempotency key). Covered in `Payment-Flow-V2.md`. |
| Apple Pay / Google Pay | Handled transparently by `PaymentElement` — no extra code. |
| 3DS authentication | Stripe Elements handles the modal automatically when card requires it. |
| Refund (not a release) | Only for already-captured charges. Use Stripe Dashboard or `stripe.refunds.create()`. |

---

## 14. Definition of done

- [ ] `npm install stripe @stripe/stripe-js @stripe/react-stripe-js`
- [ ] `lib/stripe.ts` in place; env vars set
- [ ] Migration `0005_stripe_migration.sql` applied (rename column)
- [ ] All import sites use `@/lib/stripe` (not airwallex)
- [ ] `POST /api/bookings` returns `chargeClientSecret` + `holdClientSecret`
- [ ] `app/book/[slug]/page.tsx` wraps with `<Elements>`
- [ ] `BookingFlow` step 3 uses `PaymentElement` + `confirmPayment`
- [ ] `app/api/webhooks/stripe/route.ts` deployed + registered in Dashboard
- [ ] Webhook creates `inspection_schedule` row on `payment_intent.succeeded`
- [ ] Webhook notifies owner on `payment_intent.succeeded`
- [ ] CLEAN → `releaseHold` → `payment_intent.canceled` → `status = released`
- [ ] Admin Approve/Adjust → `captureFromHold` → correct `status`
- [ ] Admin Reject → `releaseHold` → `status = released`
- [ ] 7-day cron → `releaseHold` → `status = expired`
- [ ] Declined card → `payment_intent.payment_failed` → reservation cancelled
- [ ] 3DS card (`4000 0025 0000 3155`) completes successfully
- [ ] Mock mode works end to end (no Stripe creds needed)
- [ ] `lib/airwallex.ts` deleted; Airwallex env vars removed

---

## 15. One paragraph for your coding agent

> Implement the full Stripe payment layer for CheckinBliss. `lib/stripe.ts` exports five functions — `createBookingCharge` (auto-capture), `createDepositHold` (manual-capture, no money moves), `releaseHold` (cancel uncaptured intent), `captureFromHold` (partial/full capture), and `constructStripeEvent` (webhook verification) — all mock-aware when `STRIPE_SECRET_KEY` is absent. The booking route calls the first two after `book_stays()` succeeds and returns both `clientSecret` values to the client; the `<Elements>` provider in `app/book/[slug]/page.tsx` and `PaymentElement` in `BookingFlow` step 3 confirm them client-side via `confirmPayment`. The Stripe webhook at `app/api/webhooks/stripe/route.ts` owns all state transitions: `payment_intent.succeeded` confirms the reservation group + creates the `inspection_schedule` row + notifies the owner; `payment_intent.payment_failed` cancels the group and frees the dates; `payment_intent.canceled` marks the hold released; `payment_intent.amount_capturable_updated` marks the hold held; `charge.dispute.created` flags for admin. All events are deduped on `stripe_event_id` via `audit_log`. The cron's 7-day backstop and the admin claim-decision handler both call `releaseHold`/`captureFromHold` from `lib/stripe.ts`. Apply `0005_stripe_migration.sql` to rename `airwallex_authorisation_id` → `stripe_payment_intent_id`. Delete `lib/airwallex.ts` only after a full end-to-end test-mode booking confirms with the Stripe CLI running.
