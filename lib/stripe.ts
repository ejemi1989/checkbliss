import "server-only";
import Stripe from "stripe";

const SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
export const stripeConfigured = Boolean(SECRET_KEY);

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeConfigured) throw new Error("Stripe not configured: set STRIPE_SECRET_KEY");
  if (!_stripe) _stripe = new Stripe(SECRET_KEY, { apiVersion: "2026-06-24.dahlia", typescript: true });
  return _stripe;
}

export { getStripe };

export interface BookingChargeOpts {
  amountMinor: number;
  currency: string;
  bookingGroupId: string;
  guestEmail: string;
  guestName: string;
  description: string;
  /** Stripe Connect: destination connected-account id (Nigerian subsidiary).
   *  When set, `application_fee_amount` is added so the platform retains
   *  the commission and the remainder is transferred to the connected
   *  account (which withdraws to its Raenest bank account). */
  connectAccountId?: string;
  /** Commission amount in minor units retained by the platform when
   *  `connectAccountId` is set. Must be <= amountMinor. */
  applicationFeeMinor?: number;
}

export interface DepositHoldOpts {
  amountMinor: number;
  currency: string;
  bookingGroupId: string;
  guestEmail: string;
  description: string;
}

export interface PaymentResult {
  intentId: string;
  clientSecret: string;
  status: string;
}

export async function createBookingCharge(opts: BookingChargeOpts): Promise<PaymentResult> {
  if (!stripeConfigured) {
    const id = `pi_mock_charge_${opts.bookingGroupId}`;
    if (opts.connectAccountId) {
      console.log(`[stripe:mock] connect charge ${id} £${opts.amountMinor / 100} — fee £${(opts.applicationFeeMinor ?? 0) / 100} → ${opts.connectAccountId}`);
    } else {
      console.log(`[stripe:mock] charge ${id} £${opts.amountMinor / 100}`);
    }
    return { intentId: id, clientSecret: `${id}_secret_mock`, status: "requires_payment_method" };
  }

  const stripe = getStripe();
  const params: Stripe.PaymentIntentCreateParams = {
    amount: opts.amountMinor,
    currency: opts.currency,
    capture_method: "automatic",
    receipt_email: opts.guestEmail,
    description: opts.description,
    metadata: { booking_group_id: opts.bookingGroupId, guest_name: opts.guestName, type: "booking_charge" },
  };

  if (opts.connectAccountId && opts.applicationFeeMinor) {
    params.application_fee_amount = Math.min(opts.applicationFeeMinor, opts.amountMinor);
    params.transfer_data = { destination: opts.connectAccountId };
  }

  const intent = await stripe.paymentIntents.create(
    params,
    { idempotencyKey: `charge-${opts.bookingGroupId}` },
  );
  return { intentId: intent.id, clientSecret: intent.client_secret!, status: intent.status };
}

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
    { idempotencyKey: `hold-${opts.bookingGroupId}` },
  );
  return { intentId: intent.id, clientSecret: intent.client_secret!, status: intent.status };
}

export async function releaseHold(intentId: string): Promise<void> {
  if (!stripeConfigured || intentId.startsWith("mock-") || intentId.startsWith("pi_mock_")) return;
  await getStripe().paymentIntents.cancel(intentId, { cancellation_reason: "abandoned" });
}

export async function captureFromHold(intentId: string, amountMinor: number): Promise<void> {
  if (!stripeConfigured || intentId.startsWith("mock-") || intentId.startsWith("pi_mock_")) return;
  await getStripe().paymentIntents.capture(intentId, { amount_to_capture: amountMinor });
}

// ---------------------------------------------------------------------------
// Refund a booking charge — reverses the split when refund_application_fee set
// ---------------------------------------------------------------------------

export interface RefundChargeOpts {
  chargeId: string;
  amountMinor?: number;
  refundApplicationFee?: boolean;
  reason?: "requested_by_customer" | "duplicate" | "fraudulent";
  bookingGroupId: string;
}

export async function refundBookingCharge(opts: RefundChargeOpts): Promise<{ refundId: string }> {
  if (!stripeConfigured || opts.chargeId.startsWith("ch_mock_")) {
    const id = `re_mock_${opts.bookingGroupId}`;
    console.log(`[stripe:mock] refund ${id} £${(opts.amountMinor ?? 0) / 100} on charge ${opts.chargeId}`);
    return { refundId: id };
  }

  const params: Stripe.RefundCreateParams = {
    charge: opts.chargeId,
    ...(opts.amountMinor ? { amount: opts.amountMinor } : {}),
    reason: opts.reason ?? "requested_by_customer",
    metadata: { booking_group_id: opts.bookingGroupId },
  };

  if (opts.refundApplicationFee) {
    params.refund_application_fee = true;
    params.reverse_transfer = true;
  }

  const refund = await getStripe().refunds.create(
    params,
    { idempotencyKey: `refund-${opts.bookingGroupId}` },
  );
  return { refundId: refund.id };
}

// ---------------------------------------------------------------------------
// One-time payment via hosted Checkout (product + price + checkout session)
// ---------------------------------------------------------------------------

export const ONE_TIME_PAYMENT_PRODUCT_NAME = "Example Product";
export const ONE_TIME_PAYMENT_AMOUNT_MINOR = 2000;
export const ONE_TIME_PAYMENT_CURRENCY = "usd";
const ONE_TIME_PAYMENT_METADATA_KEY = "checkinbliss_purpose";
const ONE_TIME_PAYMENT_METADATA_VALUE = "one_time_payment";

export interface OneTimePaymentProduct {
  productId: string;
  defaultPriceId: string;
}

/**
 * Creates the product (with an attached price) used for one-time Checkout
 * payments. Idempotent at the orchestration layer via `ensureOneTimePaymentProduct`
 * in lib/checkout.ts — this call is the raw Stripe API call.
 */
export async function createOneTimePaymentProduct(): Promise<OneTimePaymentProduct> {
  if (!stripeConfigured) {
    const productId = "prod_mock_onetime";
    const priceId = "price_mock_onetime";
    console.log(`[stripe:mock] created product ${productId} with price ${priceId}`);
    return { productId, defaultPriceId: priceId };
  }
  const product = await getStripe().products.create({
    name: ONE_TIME_PAYMENT_PRODUCT_NAME,
    default_price_data: {
      currency: ONE_TIME_PAYMENT_CURRENCY,
      unit_amount: ONE_TIME_PAYMENT_AMOUNT_MINOR,
    },
    metadata: { [ONE_TIME_PAYMENT_METADATA_KEY]: ONE_TIME_PAYMENT_METADATA_VALUE },
  });
  const defaultPriceId =
    typeof product.default_price === "string" ? product.default_price : product.default_price?.id;
  if (!defaultPriceId) throw new Error("Stripe product created without a default price");
  return { productId: product.id, defaultPriceId };
}

export interface CheckoutSessionOpts {
  priceId: string;
  quantity?: number;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
  paymentStatus: string;
}

/** Creates a hosted Checkout Session (mode: payment) for a one-time charge. */
export async function createCheckoutSession(opts: CheckoutSessionOpts): Promise<CheckoutSessionResult> {
  if (!stripeConfigured) {
    const sessionId = `cs_mock_${opts.priceId}`;
    console.log(`[stripe:mock] checkout session ${sessionId} for price ${opts.priceId}`);
    return { sessionId, url: `https://checkout.stripe.com/mock/${sessionId}`, paymentStatus: "unpaid" };
  }
  const session = await getStripe().checkout.sessions.create({
    line_items: [{ price: opts.priceId, quantity: opts.quantity ?? 1 }],
    mode: "payment",
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    ...(opts.customerEmail ? { customer_email: opts.customerEmail } : {}),
    ...(opts.metadata ? { metadata: opts.metadata } : {}),
  });
  if (!session.url) throw new Error("Stripe Checkout Session returned no URL");
  return { sessionId: session.id, url: session.url, paymentStatus: session.payment_status };
}

export function constructStripeEvent(rawBody: string, sigHeader: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not set");
  return getStripe().webhooks.constructEvent(rawBody, sigHeader, secret);
}
