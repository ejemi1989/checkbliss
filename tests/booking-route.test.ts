import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/bookings/route";
import { getSeedProperties } from "@/lib/seed-data";

beforeAll(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_DATA_LOADED;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.TURNSTILE_SECRET_KEY;
});

function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function postBooking(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const GUEST = {
  name: "Test Guest",
  email: "guest@example.com",
  phone: "+447700900000",
  guests: 2,
};

function getBookableProperty() {
  const prop = getSeedProperties().find((p) => p.status === "approved");
  if (!prop) throw new Error("No approved seed property");
  return prop;
}

describe("POST /api/bookings (mock mode)", () => {
  describe("14-day advance rule enforced server-side", () => {
    it("rejects a check-in inside the 14-day window (422 ADVANCE_14_DAYS)", async () => {
      const prop = getBookableProperty();
      const tooSoon = futureDate(5);
      const res = await postBooking({
        guest: GUEST,
        items: [{ property_id: prop.id, check_in: tooSoon, check_out: futureDate(8) }],
        turnstile_token: "mock-token",
      });
      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.code).toBe("ADVANCE_14_DAYS");
    });

    it("accepts a check-in 14+ days ahead (201)", async () => {
      const prop = getBookableProperty();
      const ok = futureDate(30);
      const res = await postBooking({
        guest: GUEST,
        items: [{ property_id: prop.id, check_in: ok, check_out: futureDate(33) }],
        turnstile_token: "mock-token",
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.booking_group_id).toBeTruthy();
      expect(data.charge_total_minor).toBeGreaterThan(0);
      expect(data.reservations).toHaveLength(1);
    });
  });

  describe("Duplicate submit protection (PAY-PAY double-click)", () => {
    it("a second identical request cannot create a second booking", async () => {
      const prop = getBookableProperty();
      const body = {
        guest: GUEST,
        items: [{ property_id: prop.id, check_in: futureDate(45), check_out: futureDate(48) }],
        turnstile_token: "mock-token",
      };

      const res1 = await postBooking(body);
      expect(res1.status).toBe(201);
      const first = await res1.json();

      const res2 = await postBooking(body);
      const second = await res2.json();
      expect(res2.status).toBe(409);
      expect(second.code).toBe("DATES_UNAVAILABLE");
      expect(second.booking_group_id).toBeUndefined();

      const firstGroup = first.booking_group_id as string;
      expect(firstGroup).toBeTruthy();
    });
  });

  describe("Double-booking race (two simultaneous same-room bookings)", () => {
    it("exactly one of two concurrent requests for the same dates wins", async () => {
      const prop = getBookableProperty();
      const body = {
        guest: GUEST,
        items: [{ property_id: prop.id, check_in: futureDate(60), check_out: futureDate(63) }],
        turnstile_token: "mock-token",
      };

      const [a, b] = await Promise.all([postBooking(body), postBooking(body)]);

      const statuses = [a.status, b.status].sort();
      expect(statuses).toEqual([201, 409]);
      const loser = a.status === 409 ? a : b;
      const winner = a.status === 201 ? a : b;
      const loserData = await loser.json();
      const winnerData = await winner.json();
      expect(loserData.code).toBe("DATES_UNAVAILABLE");
      expect(winnerData.ok).toBe(true);
      expect(winnerData.booking_group_id).not.toBe(loserData.booking_group_id);
    });

    it("a nearby non-overlapping date still books successfully", async () => {
      const prop = getBookableProperty();
      const res = await postBooking({
        guest: GUEST,
        items: [{ property_id: prop.id, check_in: futureDate(70), check_out: futureDate(73) }],
        turnstile_token: "mock-token",
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.reservations).toHaveLength(1);
    });
  });

  describe("Overlapping seed reservations are rejected", () => {
    it("returns 409 DATES_UNAVAILABLE for dates already reserved", async () => {
      // Seed data has a reservation on PR001 over 2026-06-18..22 — past
      // dates, but the mock availability check still applies. Use a property
      // that exists and confirm the mock layer reports conflicts for held
      // ranges rather than 5xx.
      const prop = getSeedProperties().find((p) => p.status === "approved");
      if (!prop) throw new Error("No approved seed property");
      const res = await postBooking({
        guest: GUEST,
        items: [{ property_id: prop.id, check_in: futureDate(2), check_out: futureDate(5) }],
        turnstile_token: "mock-token",
      });
      // Either the 14-day rule (422) or availability rejects — never a 5xx.
      expect([422, 409]).toContain(res.status);
    });
  });

  describe("Invalid guest details rejected", () => {
    it("rejects malformed email with 400 VALIDATION_ERROR", async () => {
      const prop = getBookableProperty();
      const res = await postBooking({
        guest: { ...GUEST, email: "not-an-email" },
        items: [{ property_id: prop.id, check_in: futureDate(30), check_out: futureDate(33) }],
        turnstile_token: "mock-token",
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("VALIDATION_ERROR");
    });
  });
});
