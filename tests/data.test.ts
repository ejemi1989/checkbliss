import { describe, it, expect } from "vitest";
import {
  getOwnerBookings,
  getOwnerPayouts,
  getInspections,
  getAdminClaims,
  getAdminOperators,
  getAdminProperties,
  getCurationQueue,
} from "@/lib/data";

describe("Data layer", () => {
  it("getOwnerBookings returns bookings with amounts in minor units", () => {
    const bookings = getOwnerBookings();
    expect(bookings.length).toBeGreaterThan(0);
    for (const b of bookings) {
      expect(b.amount_minor).toBeGreaterThan(0);
    }
  });

  it("getOwnerPayouts returns payouts in minor units", () => {
    const payouts = getOwnerPayouts();
    expect(payouts.length).toBeGreaterThan(0);
    for (const p of payouts) {
      expect(p.amount_minor).toBeGreaterThan(0);
    }
  });

  it("getInspections returns inspections with all required fields", () => {
    const inspections = getInspections();
    expect(inspections.length).toBeGreaterThan(0);
    for (const i of inspections) {
      expect(i.property_id).toBeTruthy();
      expect(i.guest_name).toBeTruthy();
      expect(i.checkout_date).toBeTruthy();
    }
  });

  it("getAdminClaims returns claims with minor unit amounts", () => {
    const claims = getAdminClaims();
    expect(claims.length).toBeGreaterThan(0);
    for (const c of claims) {
      expect(c.estimated_cost_minor).toBeGreaterThanOrEqual(0);
    }
  });

  it("getAdminOperators returns operators with assigned cities", () => {
    const operators = getAdminOperators();
    expect(operators.length).toBeGreaterThan(0);
    for (const o of operators) {
      expect(o.assigned_cities.length).toBeGreaterThan(0);
    }
  });

  it("getAdminProperties returns properties in minor units", () => {
    const props = getAdminProperties();
    expect(props.length).toBeGreaterThan(0);
    for (const p of props) {
      expect(p.nightly_price_minor).toBeGreaterThan(0);
    }
  });

  it("getCurationQueue returns pending review items", () => {
    const queue = getCurationQueue();
    expect(queue.length).toBeGreaterThan(0);
    for (const q of queue) {
      expect(q.status).toBe("pending");
    }
  });
});
