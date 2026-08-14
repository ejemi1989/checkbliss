import { describe, it, expect } from "vitest";
import {
  ensureOneTimePaymentProduct,
  createOneTimePayment,
  markOneTimePaymentCompleted,
} from "@/lib/checkout";

describe("one-time Checkout payment orchestration (mock mode)", () => {
  it("ensureOneTimePaymentProduct is idempotent — reuses the same resource ids", async () => {
    const first = await ensureOneTimePaymentProduct();
    const second = await ensureOneTimePaymentProduct();
    expect(first.productId).toMatch(/^prod_mock_/);
    expect(first.defaultPriceId).toMatch(/^price_mock_/);
    expect(second).toEqual(first);
  });

  it("createOneTimePayment returns a payable session with a mock URL", async () => {
    const result = await createOneTimePayment({
      successUrl: "https://checkinbliss.test/payment/complete",
      cancelUrl: "https://checkinbliss.test/",
    });
    expect(result.sessionId).toMatch(/^cs_mock_/);
    expect(result.url).toContain("checkout.stripe.com/mock/");
    expect(result.amountMinor).toBe(2000);
    expect(result.currency).toBe("usd");
    expect(result.paymentStatus).toBe("unpaid");
  });

  it("markOneTimePaymentCompleted reconciles a known session", async () => {
    const result = await createOneTimePayment({
      successUrl: "https://checkinbliss.test/payment/complete",
      cancelUrl: "https://checkinbliss.test/",
    });
    await expect(markOneTimePaymentCompleted(result.sessionId)).resolves.toBe(true);
  });

  it("markOneTimePaymentCompleted reports unknown sessions as not found", async () => {
    await expect(markOneTimePaymentCompleted("cs_unknown")).resolves.toBe(false);
  });
});
