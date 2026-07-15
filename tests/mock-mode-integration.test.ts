import { describe, it, expect, beforeAll } from "vitest";
import {
  createBookingCharge,
  createDepositHold,
  releaseHold,
  captureFromHold,
} from "@/lib/stripe";
import {
  searchProperties,
  getOwnerBookings,
  getInspections,
  getAdminClaims,
  getAllApprovedProperties,
} from "@/lib/data";
import { getSeedProperties } from "@/lib/seed-data";

beforeAll(() => {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
});

describe("Mock mode integration", () => {
  describe("Mock Stripe returns deterministic intents", () => {
    it("createBookingCharge returns mock charge intents without credentials", async () => {
      const result = await createBookingCharge(50000, "mock-int-charge");
      expect(result.intentId).toMatch(/^mock-charge-/);
      expect(result.status).toBe("succeeded");
    });

    it("createDepositHold returns mock hold intents without credentials", async () => {
      const result = await createDepositHold(10000, "mock-int-hold");
      expect(result.intentId).toMatch(/^mock-hold-/);
      expect(result.status).toBe("requires_capture");
    });

    it("mock intents are deterministic (same request_id prefix)", async () => {
      const result1 = await createBookingCharge(50000, "mock-det");
      const result2 = await createBookingCharge(50000, "mock-det");
      expect(result1.intentId).toBe(result2.intentId);
    });

    it("releaseHold is safe in mock mode (no credentials needed)", async () => {
      await expect(
        releaseHold("mock-hold-safe-release"),
      ).resolves.toBeUndefined();
    });

    it("captureFromHold is safe in mock mode (no credentials needed)", async () => {
      await expect(
        captureFromHold("mock-hold-safe-capture", 5000),
      ).resolves.toBeUndefined();
    });

    it("mock hold status is requires_capture (not auto-captured)", async () => {
      const hold = await createDepositHold(10000, "mock-status-check");
      expect(hold.status).toBe("requires_capture");
    });
  });

  describe("Mock Supabase fallback returns seed data", () => {
    it("searchProperties returns seed data when Supabase is not configured", () => {
      const results = searchProperties({});
      expect(results.length).toBeGreaterThan(0);
      for (const p of results) {
        expect(p.status).toBe("approved");
      }
    });

    it("getAllApprovedProperties returns only approved properties", () => {
      const all = getAllApprovedProperties();
      expect(all.every((p) => p.status === "approved")).toBe(true);
    });

    it("searchProperties filters by city", () => {
      const lagos = searchProperties({ where: "Lagos" });
      expect(lagos.length).toBeGreaterThan(0);
      expect(lagos.every((p) => p.city === "Lagos")).toBe(true);

      const abuja = searchProperties({ where: "Abuja" });
      expect(abuja.length).toBeGreaterThan(0);
      expect(abuja.every((p) => p.city === "Abuja")).toBe(true);

      const total = lagos.length + abuja.length;
      expect(total).toBe(getAllApprovedProperties().length);
    });

    it("searchProperties respects availability (excludes overlapping)", () => {
      const checkIn = "2026-06-18";
      const checkOut = "2026-06-22";
      const results = searchProperties({ checkIn, checkOut });
      const pr001 = results.find((p) => p.id === "PR001");
      expect(pr001).toBeUndefined();
    });

    it("getOwnerBookings returns data without Supabase", () => {
      const bookings = getOwnerBookings();
      expect(bookings.length).toBeGreaterThan(0);
      for (const b of bookings) {
        expect(b.amount_minor).toBeGreaterThan(0);
      }
    });

    it("getInspections returns data without Supabase", () => {
      const inspections = getInspections();
      expect(inspections.length).toBeGreaterThan(0);
      for (const i of inspections) {
        expect(i.property_id).toBeTruthy();
      }
    });

    it("getAdminClaims returns data without Supabase", () => {
      const claims = getAdminClaims();
      expect(claims.length).toBeGreaterThan(0);
      for (const c of claims) {
        expect(c.estimated_cost_minor).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Full booking -> payment -> confirmation flow completes", () => {
    it("searches available properties", () => {
      const futureIn = "2027-06-15";
      const futureOut = "2027-06-18";
      const results = searchProperties({ checkIn: futureIn, checkOut: futureOut });
      expect(results.length).toBeGreaterThan(0);
    });

    it("creates a mock charge for the booking", async () => {
      const property = getSeedProperties().filter((p) => p.status === "approved")[0];
      const nights = 3;
      const totalMinor = property.nightly_rate_minor * nights;
      const charge = await createBookingCharge(totalMinor, "mock-full-flow");
      expect(charge.status).toBe("succeeded");
    });

    it("creates a mock deposit hold for the booking", async () => {
      const property = getSeedProperties().filter((p) => p.status === "approved")[0];
      const hold = await createDepositHold(property.deposit_minor, "mock-full-hold");
      expect(hold.status).toBe("requires_capture");
    });

    it("releases deposit hold in mock mode", async () => {
      await expect(
        releaseHold("mock-hold-cleanup"),
      ).resolves.toBeUndefined();
    });

    it("captures from deposit hold in mock mode", async () => {
      await expect(
        captureFromHold("mock-hold-capture", 5000),
      ).resolves.toBeUndefined();
    });
  });

  describe("No errors thrown when env vars are missing", () => {
    it("Stripe functions do not throw in mock mode", async () => {
      await expect(
        createBookingCharge(50000, "no-env-charge"),
      ).resolves.toBeDefined();
      await expect(
        createDepositHold(10000, "no-env-hold"),
      ).resolves.toBeDefined();
    });

    it("data functions do not throw without Supabase env vars", () => {
      expect(() => {
        searchProperties({});
        getOwnerBookings();
        getInspections();
        getAdminClaims();
        getAllApprovedProperties();
      }).not.toThrow();
    });

    it("seed data is always available (30 properties)", () => {
      const props = getSeedProperties();
      expect(props.length).toBe(30);
    });
  });
});
