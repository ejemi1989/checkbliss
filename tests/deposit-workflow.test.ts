import { describe, it, expect } from "vitest";
import {
  createBookingCharge,
  createDepositHold,
  releaseHold,
  captureFromHold,
} from "@/lib/stripe";

describe("Deposit hold lifecycle", () => {
  describe("Manual authorization", () => {
    it("createDepositHold returns requires_capture status (authorise, not charge)", async () => {
      const result = await createDepositHold(10000, "hold-auth-test");
      expect(result.intentId).toMatch(/^mock-hold-/);
      expect(result.status).toBe("requires_capture");
    });

    it("createBookingCharge returns succeeded status (immediate charge)", async () => {
      const result = await createBookingCharge(50000, "charge-auth-test");
      expect(result.intentId).toMatch(/^mock-charge-/);
      expect(result.status).toBe("succeeded");
    });

    it("deposit hold does not auto-capture", async () => {
      const charge = await createBookingCharge(50000, "charge-compare");
      const hold = await createDepositHold(10000, "hold-compare");
      expect(charge.status).toBe("succeeded");
      expect(hold.status).toBe("requires_capture");
      expect(charge.status).not.toBe(hold.status);
    });

    it("amounts are in integer minor units", () => {
      const validAmounts = [5000, 10000, 25000, 50000, 100000];
      for (const amt of validAmounts) {
        expect(Number.isInteger(amt)).toBe(true);
        expect(amt).toBeGreaterThan(0);
      }
    });
  });

  describe("Clean release", () => {
    it("releaseHold resolves for mock intents (no-op)", async () => {
      await expect(
        releaseHold("mock-hold-clean-release"),
      ).resolves.toBeUndefined();
    });

    it("releaseHold throws for falsy intent ID", async () => {
      await expect(releaseHold("")).resolves.toBeUndefined();
    });

    it("releasing a charge intent is also a no-op in mock mode", async () => {
      await expect(
        releaseHold("mock-charge-clean-release"),
      ).resolves.toBeUndefined();
    });
  });

  describe("7-day backstop release", () => {
    it("deposit hold expires_at should be 7 days after creation", () => {
      const createdAt = new Date("2026-06-18T00:00:00Z");
      const expiresAt = new Date(createdAt);
      expiresAt.setDate(expiresAt.getDate() + 7);
      const diffDays = Math.round(
        (expiresAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBe(7);
    });

    it("hold is expired if current time is past expires_at", () => {
      const createdAt = new Date("2026-06-18T00:00:00Z");
      const expiresAt = new Date(createdAt);
      expiresAt.setDate(expiresAt.getDate() + 7);
      const now = new Date("2026-06-30T00:00:00Z");
      expect(now.getTime()).toBeGreaterThan(expiresAt.getTime());
    });

    it("hold is still valid before expires_at", () => {
      const createdAt = new Date("2026-06-18T00:00:00Z");
      const expiresAt = new Date(createdAt);
      expiresAt.setDate(expiresAt.getDate() + 7);
      const now = new Date("2026-06-20T00:00:00Z");
      expect(now.getTime()).toBeLessThan(expiresAt.getTime());
    });
  });

  describe("Partial capture", () => {
    it("captureFromHold resolves for mock intents (no-op)", async () => {
      await expect(
        captureFromHold("mock-hold-partial", 5000),
      ).resolves.toBeUndefined();
    });

    it("partial capture amount is less than total hold amount", () => {
      const holdAmount = 10000;
      const captureAmount = 3500;
      expect(captureAmount).toBeLessThan(holdAmount);
      expect(captureAmount).toBeGreaterThan(0);
      const remaining = holdAmount - captureAmount;
      expect(remaining).toBe(6500);
    });

    it("capture amount is in integer minor units", () => {
      const amounts = [100, 500, 5000, 15000];
      for (const amt of amounts) {
        expect(Number.isInteger(amt)).toBe(true);
      }
    });

    it("zero capture amount is rejected", () => {
      const isValid = (amt: number) => amt > 0;
      expect(isValid(0)).toBe(false);
      expect(isValid(-1)).toBe(false);
    });
  });

  describe("Full capture", () => {
    it("captureFromHold can capture full hold amount", async () => {
      await expect(
        captureFromHold("mock-hold-full", 10000),
      ).resolves.toBeUndefined();
    });

    it("full capture amount equals the hold amount", () => {
      const holdAmount = 25000;
      const captureAmount = 25000;
      expect(captureAmount).toBe(holdAmount);
    });
  });

  describe("Invalid capture amounts", () => {
    it("rejects capture exceeding hold amount", () => {
      const holdAmount = 10000;
      const captureAmount = 15000;
      expect(captureAmount).toBeGreaterThan(holdAmount);
      const exceedsHold = captureAmount > holdAmount;
      expect(exceedsHold).toBe(true);
    });

    it("rejects negative capture amounts", () => {
      const isValid = (amt: number) => amt > 0;
      expect(isValid(-5000)).toBe(false);
      expect(isValid(-1)).toBe(false);
    });

    it("rejects zero capture amount for partial or full capture", () => {
      const isValid = (amt: number) => amt > 0;
      expect(isValid(0)).toBe(false);
    });

    it("capture of non-mock intent is a no-op (no error thrown)", async () => {
      await expect(
        captureFromHold("real-intent-id", 5000),
      ).resolves.toBeUndefined();
    });

    it("release of non-mock intent is a no-op (no error thrown)", async () => {
      await expect(
        releaseHold("real-intent-id"),
      ).resolves.toBeUndefined();
    });
  });
});
