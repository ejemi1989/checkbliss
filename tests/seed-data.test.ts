import { describe, it, expect } from "vitest";
import { getSeedProperties, getSeedReservations, getSeedBlocks } from "@/lib/seed-data";

describe("getSeedProperties", () => {
  it("returns 6 demo properties", () => {
    expect(getSeedProperties()).toHaveLength(6);
  });

  it("all properties have required fields", () => {
    for (const p of getSeedProperties()) {
      expect(p.id).toBeTruthy();
      expect(p.slug).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.city).toBeTruthy();
      expect(p.nightly_rate_minor).toBeGreaterThan(0);
      expect(p.deposit_minor).toBeGreaterThan(0);
    }
  });

  it("all approved properties are in Lagos or Abuja", () => {
    for (const p of getSeedProperties().filter((p) => p.status === "approved")) {
      expect(["Lagos", "Abuja"]).toContain(p.city);
    }
  });

  it("has mixed extended checkout options", () => {
    const offered = getSeedProperties().filter((p) => p.extended_checkout_offered);
    const notOffered = getSeedProperties().filter((p) => !p.extended_checkout_offered);
    expect(offered.length).toBeGreaterThan(0);
    expect(notOffered.length).toBeGreaterThan(0);
  });

  it("has featured and non-featured properties", () => {
    const featured = getSeedProperties().filter((p) => p.is_featured);
    const notFeatured = getSeedProperties().filter((p) => !p.is_featured);
    expect(featured.length).toBeGreaterThan(0);
    expect(notFeatured.length).toBeGreaterThan(0);
  });
});

describe("getSeedReservations", () => {
  it("returns reservations for validation testing", () => {
    expect(getSeedReservations().length).toBeGreaterThan(0);
  });

  it("all reservations have valid date ranges", () => {
    for (const r of getSeedReservations()) {
      expect(new Date(r.check_out) > new Date(r.check_in)).toBe(true);
    }
  });
});

describe("getSeedBlocks", () => {
  it("returns owner blocks for availability testing", () => {
    const blocks = getSeedBlocks();
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) {
      expect(b.source).toBe("owner");
    }
  });
});
