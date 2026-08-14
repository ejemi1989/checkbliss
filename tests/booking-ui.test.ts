import { describe, it, expect } from "vitest";
import { isReserveDisabled } from "@/lib/booking-ui";

describe("isReserveDisabled", () => {
  it("is never disabled by a missing Stripe instance when Stripe is not configured (mock mode)", () => {
    expect(
      isReserveDisabled({ stripeConfigured: false, stripeReady: false, loading: false }),
    ).toBe(false);
  });

  it("disables while loading even in mock mode", () => {
    expect(
      isReserveDisabled({ stripeConfigured: false, stripeReady: false, loading: true }),
    ).toBe(true);
  });

  it("disables until Stripe is ready when Stripe is configured", () => {
    expect(
      isReserveDisabled({ stripeConfigured: true, stripeReady: false, loading: false }),
    ).toBe(true);
  });

  it("enables once Stripe is ready when Stripe is configured", () => {
    expect(
      isReserveDisabled({ stripeConfigured: true, stripeReady: true, loading: false }),
    ).toBe(false);
  });

  it("disables during confirmation while Stripe is ready", () => {
    expect(
      isReserveDisabled({ stripeConfigured: true, stripeReady: true, loading: true }),
    ).toBe(true);
  });
});
