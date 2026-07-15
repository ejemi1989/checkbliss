import Stripe from "stripe";

export const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-06-24.dahlia",
    });
  }
  return _stripe;
}

export interface PaymentResult {
  intentId: string;
  clientSecret: string | null;
  status: string;
}

const TEST_PAYMENT_METHOD = "pm_card_visa";

export async function createBookingCharge(
  amountMinor: number,
  requestId: string,
): Promise<PaymentResult> {
  if (!stripeConfigured) {
    return { intentId: `mock-charge-${requestId}`, clientSecret: null, status: "succeeded" };
  }
  const intent = await getStripe().paymentIntents.create(
    {
      amount: amountMinor,
      currency: "gbp",
      payment_method: TEST_PAYMENT_METHOD,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      description: `CheckinBliss booking ${requestId}`,
      metadata: { purpose: "charge", booking_group_id: requestId.replace(/^charge-/, "") },
    },
    { idempotencyKey: requestId },
  );
  return { intentId: intent.id, clientSecret: intent.client_secret, status: intent.status };
}

export async function createDepositHold(
  amountMinor: number,
  requestId: string,
): Promise<PaymentResult> {
  if (!stripeConfigured) {
    return { intentId: `mock-hold-${requestId}`, clientSecret: null, status: "requires_capture" };
  }
  const intent = await getStripe().paymentIntents.create(
    {
      amount: amountMinor,
      currency: "gbp",
      payment_method: TEST_PAYMENT_METHOD,
      confirm: true,
      capture_method: "manual",
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      description: `CheckinBliss deposit hold ${requestId}`,
      metadata: { purpose: "hold", booking_group_id: requestId.replace(/^hold-/, "") },
    },
    { idempotencyKey: requestId },
  );
  return { intentId: intent.id, clientSecret: intent.client_secret, status: intent.status };
}

export async function releaseHold(intentId: string): Promise<void> {
  if (!stripeConfigured || intentId.startsWith("mock-")) return;
  await getStripe().paymentIntents.cancel(intentId);
}

export async function captureFromHold(intentId: string, amountMinor: number): Promise<void> {
  if (!stripeConfigured || intentId.startsWith("mock-")) return;
  await getStripe().paymentIntents.capture(intentId, { amount_to_capture: amountMinor });
}
