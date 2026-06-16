import { describe, it, expect } from "vitest";
import {
  createBookingCharge,
  createDepositHold,
  releaseHold,
  captureFromHold,
} from "@/lib/airwallex";

describe("Airwallex mock mode", () => {
  it("createBookingCharge returns mock intent", async () => {
    const result = await createBookingCharge(50000, "test-charge");
    expect(result.intentId).toMatch(/^mock-charge-/);
    expect(result.status).toBe("succeeded");
  });

  it("createDepositHold returns mock intent", async () => {
    const result = await createDepositHold(10000, "test-hold");
    expect(result.intentId).toMatch(/^mock-hold-/);
    expect(result.status).toBe("requires_capture");
  });

  it("releaseHold is a no-op for mock intents", async () => {
    await expect(releaseHold("mock-hold-test")).resolves.toBeUndefined();
  });

  it("captureFromHold is a no-op for mock intents", async () => {
    await expect(captureFromHold("mock-hold-test", 5000)).resolves.toBeUndefined();
  });
});
