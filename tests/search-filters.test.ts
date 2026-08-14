import { describe, it, expect } from "vitest";
import { searchProperties } from "@/lib/data";
import { getSeedProperties } from "@/lib/seed-data";

describe("search filtering — guests and rooms", () => {
  it("returns all approved properties with no filters", () => {
    const all = getSeedProperties().filter((p) => p.status === "approved");
    const result = searchProperties({});
    expect(result).toHaveLength(all.length);
  });

  it("filters by guests (sleeps >= required)", () => {
    const result = searchProperties({ guests: 6 });
    for (const p of result) {
      expect(p.sleeps ?? 0).toBeGreaterThanOrEqual(6);
    }
    expect(result.length).toBeGreaterThan(0);
  });

  it("filters by rooms (bedrooms >= required)", () => {
    const result = searchProperties({ rooms: 4 });
    for (const p of result) {
      expect(p.bedrooms ?? 0).toBeGreaterThanOrEqual(4);
    }
    expect(result.length).toBeGreaterThan(0);
  });

  it("combines guests + rooms + where", () => {
    const result = searchProperties({ where: "Lagos", guests: 4, rooms: 2 });
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      expect(p.city).toBe("Lagos");
      expect(p.sleeps ?? 0).toBeGreaterThanOrEqual(4);
      expect(p.bedrooms ?? 0).toBeGreaterThanOrEqual(2);
    }
  });

  it("returns empty when no property fits the constraint", () => {
    const result = searchProperties({ guests: 99 });
    expect(result).toHaveLength(0);
  });

  it("ignores non-positive guests/rooms values", () => {
    const baseline = searchProperties({});
    const negative = searchProperties({ guests: -1, rooms: 0 });
    expect(negative).toHaveLength(baseline.length);
  });
});
