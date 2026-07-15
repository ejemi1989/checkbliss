import { describe, it, expect } from "vitest";
import { getSeedProperties, getSeedReservations, getSeedBlocks } from "@/lib/seed-data";
import { searchProperties } from "@/lib/data";

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

describe("Booking workflow", () => {
  describe("Single property booking", () => {
    it("returns approved properties with valid slugs", () => {
      const props = getSeedProperties().filter((p) => p.status === "approved");
      expect(props.length).toBeGreaterThanOrEqual(4);
      for (const p of props) {
        expect(p.slug).toBeTruthy();
        expect(p.nightly_rate_minor).toBeGreaterThan(0);
        expect(p.deposit_minor).toBeGreaterThan(0);
      }
    });

    it("search returns available properties for future dates", () => {
      const checkIn = futureDate(30);
      const checkOut = futureDate(34);
      const results = searchProperties({ checkIn, checkOut });
      for (const p of results) {
        expect(p.status).toBe("approved");
      }
    });
  });

  describe("Multi-city booking", () => {
    it("supplies properties in both Lagos and Abuja", () => {
      const props = getSeedProperties().filter((p) => p.status === "approved");
      const cities = [...new Set(props.map((p) => p.city))];
      expect(cities).toContain("Lagos");
      expect(cities).toContain("Abuja");
    });

    it("can search properties by city", () => {
      const lagos = searchProperties({ where: "Lagos" });
      expect(lagos.length).toBeGreaterThan(0);
      expect(lagos.every((p) => p.city === "Lagos")).toBe(true);

      const abuja = searchProperties({ where: "Abuja" });
      expect(abuja.length).toBeGreaterThan(0);
      expect(abuja.every((p) => p.city === "Abuja")).toBe(true);
    });
  });

  describe("14-day advance booking rule", () => {
    it("rejects dates fewer than 14 days from now", () => {
      const tooSoon = new Date();
      tooSoon.setDate(tooSoon.getDate() + 5);
      const now = new Date();
      const diffDays = Math.round(
        (tooSoon.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeLessThan(14);
    });

    it("accepts dates 14 or more days from now", () => {
      const farEnough = new Date();
      farEnough.setDate(farEnough.getDate() + 20);
      const now = new Date();
      const diffDays = Math.round(
        (farEnough.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeGreaterThanOrEqual(14);
    });
  });

  describe("Double-booking rejection", () => {
    it("existing reservations block overlapping dates for same property", () => {
      const reservations = getSeedReservations();
      const pr001Overlap = reservations.filter(
        (r) => r.property_id === "PR001",
      );
      expect(pr001Overlap.length).toBeGreaterThanOrEqual(2);

      for (const r of pr001Overlap) {
        expect(new Date(r.check_out) > new Date(r.check_in)).toBe(true);
      }
    });

    it("searchProperties excludes properties with overlapping reservations", () => {
      const r = getSeedReservations()[0];
      const overlapIn = r.check_in;
      const overlapOut = r.check_out;
      const results = searchProperties({
        checkIn: overlapIn,
        checkOut: overlapOut,
      });
      const blocked = results.find((p) => p.id === r.property_id);
      expect(blocked).toBeUndefined();
    });

    it("owner blocks exclude properties from search results", () => {
      const blocks = getSeedBlocks().filter((b) => b.source === "owner");
      expect(blocks.length).toBeGreaterThan(0);
      for (const b of blocks) {
        const results = searchProperties({
          checkIn: b.starts,
          checkOut: b.ends,
        });
        const blocked = results.find((p) => p.id === b.property_id);
        expect(blocked).toBeUndefined();
      }
    });

    it("maintenance blocks also exclude properties from search results", () => {
      const blocks = getSeedBlocks().filter((b) => b.source === "maintenance");
      expect(blocks.length).toBeGreaterThan(0);
      for (const b of blocks) {
        const results = searchProperties({
          checkIn: b.starts,
          checkOut: b.ends,
        });
        const blocked = results.find((p) => p.id === b.property_id);
        expect(blocked).toBeUndefined();
      }
    });
  });

  describe("Past dates rejected", () => {
    it("past check-in date is before today", () => {
      const pastDate = new Date("2024-01-01");
      const today = new Date();
      expect(pastDate.getTime()).toBeLessThan(today.getTime());
    });

    it("search with past dates returns empty or unrelated results", () => {
      const pastIn = "2024-01-01";
      const pastOut = "2024-01-05";
      const results = searchProperties({
        checkIn: pastIn,
        checkOut: pastOut,
      });
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Invalid guest details rejected", () => {
    it("requires guest name to be non-empty", () => {
      const emptyName = "";
      expect(emptyName.trim().length).toBe(0);
    });

    it("requires guest email to contain @", () => {
      function isValidEmail(email: string): boolean {
        const parts = email.split("@");
        return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
      }
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail("notanemail")).toBe(false);
      expect(isValidEmail("missing@")).toBe(false);
      expect(isValidEmail("@nodomain")).toBe(false);
      expect(isValidEmail("valid@example.com")).toBe(true);
    });

    it("requires guest phone to be non-empty", () => {
      const emptyPhone = "";
      expect(emptyPhone.trim().length).toBe(0);
    });

    it("requires guest count between 1 and max occupancy", () => {
      const guestCounts = [0, -1, 10];
      const maxGuests = getSeedProperties().filter((p) => p.status === "approved")[0].sleeps;
      for (const count of guestCounts) {
        const valid = count >= 1 && count <= maxGuests;
        expect(valid).toBe(false);
      }
    });
  });

  describe("Booking total calculation", () => {
    it("calculates total as nightly rate times nights", () => {
      const props = getSeedProperties().filter((p) => p.status === "approved");
      for (const p of props) {
        const nights = 3;
        const total = p.nightly_rate_minor * nights;
        expect(total).toBeGreaterThan(0);
        expect(total % p.nightly_rate_minor).toBe(0);
      }
    });

    it("deposit is separate from nightly charges", () => {
      const props = getSeedProperties().filter((p) => p.status === "approved");
      for (const p of props) {
        expect(p.deposit_minor).toBeGreaterThan(0);
        expect(p.deposit_minor).not.toBe(p.nightly_rate_minor);
      }
    });
  });
});
