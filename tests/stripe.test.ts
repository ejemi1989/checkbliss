import { describe, it, expect } from "vitest";
import {
  createBookingCharge,
  createDepositHold,
  releaseHold,
  captureFromHold,
  createOneTimePaymentProduct,
  createCheckoutSession,
} from "@/lib/stripe";

describe("Stripe mock mode", () => {
  it("createBookingCharge returns mock intent", async () => {
    const result = await createBookingCharge({
      amountMinor: 50000,
      currency: "gbp",
      bookingGroupId: "test-charge",
      guestEmail: "test@example.com",
      guestName: "Test User",
      description: "Test charge",
    });
    expect(result.intentId).toMatch(/^pi_mock_charge_/);
    expect(result.status).toBe("requires_payment_method");
    expect(result.clientSecret).toBeDefined();
  });

  it("createDepositHold returns mock intent", async () => {
    const result = await createDepositHold({
      amountMinor: 10000,
      currency: "gbp",
      bookingGroupId: "test-hold",
      guestEmail: "test@example.com",
      description: "Test hold",
    });
    expect(result.intentId).toMatch(/^pi_mock_hold_/);
    expect(result.status).toBe("requires_payment_method");
  });

  it("releaseHold is a no-op for mock intents", async () => {
    await expect(releaseHold("mock-hold-test")).resolves.toBeUndefined();
  });

  it("captureFromHold is a no-op for mock intents", async () => {
    await expect(captureFromHold("mock-hold-test", 5000)).resolves.toBeUndefined();
  });
});

describe("Stripe mock mode — one-time Checkout payment", () => {
  it("createOneTimePaymentProduct returns mock product with a default price", async () => {
    const result = await createOneTimePaymentProduct();
    expect(result.productId).toMatch(/^prod_mock_/);
    expect(result.defaultPriceId).toMatch(/^price_mock_/);
  });

  it("createCheckoutSession returns a mock session with a URL", async () => {
    const result = await createCheckoutSession({
      priceId: "price_mock_onetime",
      quantity: 1,
      successUrl: "https://checkinbliss.test/payment/complete",
      cancelUrl: "https://checkinbliss.test/",
    });
    expect(result.sessionId).toMatch(/^cs_mock_/);
    expect(result.url).toContain("checkout.stripe.com/mock/");
    expect(result.paymentStatus).toBe("unpaid");
  });
});
