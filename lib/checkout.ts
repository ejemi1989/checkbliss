import "server-only";
import {
  createOneTimePaymentProduct,
  createCheckoutSession,
  ONE_TIME_PAYMENT_AMOUNT_MINOR,
  ONE_TIME_PAYMENT_CURRENCY,
} from "@/lib/stripe";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * One-time payment orchestration for hosted Checkout.
 *
 * Flow (matches the Stripe one-time-payment blueprint):
 *   1. ensureOneTimePaymentProduct — create/reuse the product + price, persisting
 *      the Stripe resource ids so we never duplicate products across requests.
 *   2. createOneTimePayment — create a Checkout Session (mode: payment) for that
 *      price and persist a `one_time_payments` record (status: pending).
 *   3. markOneTimePaymentCompleted — called from the `checkout.session.completed`
 *      webhook to reconcile the record when the payment succeeds.
 *
 * Persistence: Supabase `one_time_payments` / `stripe_resources` tables in
 * production; an in-memory ledger in mock mode (no credentials configured).
 */

const RESOURCE_KEY_PRODUCT_ID = "onetime_payment_product_id";
const RESOURCE_KEY_PRICE_ID = "onetime_payment_price_id";

interface OneTimePaymentRecord {
  id: string;
  checkoutSessionId: string;
  amountMinor: number;
  currency: string;
  status: "pending" | "completed" | "expired";
  createdAt: string;
  completedAt: string | null;
}

const resourceCache = new Map<string, string>();
const paymentLedger = new Map<string, OneTimePaymentRecord>();

async function persistResource(key: string, value: string): Promise<void> {
  resourceCache.set(key, value);
  if (!supabaseAdminConfigured) return;
  await createAdmin().from("stripe_resources").upsert({ key, value }, { onConflict: "key" });
}

async function loadResource(key: string): Promise<string | null> {
  const cached = resourceCache.get(key);
  if (cached) return cached;
  if (!supabaseAdminConfigured) return null;
  const { data } = await createAdmin()
    .from("stripe_resources")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  const value = data?.value ?? null;
  if (value) resourceCache.set(key, value);
  return value;
}

export interface OneTimePaymentResource {
  productId: string;
  defaultPriceId: string;
}

/**
 * Returns the one-time-payment product + price, creating them via Stripe the
 * first time and reusing the persisted ids on every subsequent call.
 */
export async function ensureOneTimePaymentProduct(): Promise<OneTimePaymentResource> {
  const productId = await loadResource(RESOURCE_KEY_PRODUCT_ID);
  const defaultPriceId = await loadResource(RESOURCE_KEY_PRICE_ID);
  if (productId && defaultPriceId) {
    return { productId, defaultPriceId };
  }
  const created = await createOneTimePaymentProduct();
  await persistResource(RESOURCE_KEY_PRODUCT_ID, created.productId);
  await persistResource(RESOURCE_KEY_PRICE_ID, created.defaultPriceId);
  return created;
}

export interface CreateOneTimePaymentOpts {
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface CreateOneTimePaymentResult {
  sessionId: string;
  url: string;
  amountMinor: number;
  currency: string;
  paymentStatus: string;
}

/** Creates a Checkout Session for the one-time payment and records it as pending. */
export async function createOneTimePayment(opts: CreateOneTimePaymentOpts): Promise<CreateOneTimePaymentResult> {
  const { defaultPriceId } = await ensureOneTimePaymentProduct();

  const session = await createCheckoutSession({
    priceId: defaultPriceId,
    quantity: 1,
    successUrl: opts.successUrl,
    cancelUrl: opts.cancelUrl,
    customerEmail: opts.customerEmail,
    metadata: opts.metadata,
  });

  const record: OneTimePaymentRecord = {
    id: crypto.randomUUID(),
    checkoutSessionId: session.sessionId,
    amountMinor: ONE_TIME_PAYMENT_AMOUNT_MINOR,
    currency: ONE_TIME_PAYMENT_CURRENCY,
    status: "pending",
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  await persistOneTimePayment(record);

  return {
    sessionId: session.sessionId,
    url: session.url,
    amountMinor: record.amountMinor,
    currency: record.currency,
    paymentStatus: session.paymentStatus,
  };
}

async function persistOneTimePayment(record: OneTimePaymentRecord): Promise<void> {
  paymentLedger.set(record.checkoutSessionId, record);
  if (!supabaseAdminConfigured) return;
  await createAdmin().from("one_time_payments").insert({
    checkout_session_id: record.checkoutSessionId,
    amount_minor: record.amountMinor,
    currency: record.currency,
    status: record.status,
    created_at: record.createdAt,
  });
}

/** Marks a one-time payment completed once the hosted checkout succeeds. */
export async function markOneTimePaymentCompleted(checkoutSessionId: string): Promise<boolean> {
  const ledgerRecord = paymentLedger.get(checkoutSessionId);
  if (ledgerRecord) {
    ledgerRecord.status = "completed";
    ledgerRecord.completedAt = new Date().toISOString();
  }
  if (!supabaseAdminConfigured) return Boolean(ledgerRecord);
  const { error } = await createAdmin()
    .from("one_time_payments")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("checkout_session_id", checkoutSessionId);
  return !error;
}
