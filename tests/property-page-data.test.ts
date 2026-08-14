import { describe, it, expect } from "vitest";
import { getSeedProperties } from "@/lib/seed-data";

describe("property pages — room types and verification", () => {
  it("every approved property has at least one room type", () => {
    const props = getSeedProperties().filter((p) => p.status === "approved");
    expect(props.length).toBeGreaterThan(0);
    for (const p of props) {
      expect(p.room_types).toBeDefined();
      expect(p.room_types!.length).toBeGreaterThan(0);
      expect(p.room_types!.length).toBeLessThanOrEqual(p.bedrooms);
      for (const room of p.room_types!) {
        expect(room.label).toBeTruthy();
        expect(room.bed).toBeTruthy();
      }
    }
  });

  it("room type count matches bedroom count", () => {
    const props = getSeedProperties().filter((p) => p.status === "approved");
    for (const p of props) {
      expect(p.room_types!.length).toBe(p.bedrooms);
    }
  });

  it("the master suite is always first", () => {
    const props = getSeedProperties().filter((p) => p.status === "approved");
    for (const p of props) {
      expect(p.room_types![0].label).toBe("Master suite");
      expect(p.room_types![0].bed).toMatch(/king/i);
    }
  });

  it("every approved property has a verification record", () => {
    const props = getSeedProperties().filter((p) => p.status === "approved");
    for (const p of props) {
      expect(p.verification).toBeDefined();
      expect(p.verification!.inspected_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.verification!.inspector).toBeTruthy();
      expect(p.verification!.photos).toBeGreaterThan(0);
      expect(p.verification!.notes.length).toBeGreaterThan(20);
    }
  });

  it("inspection dates are deterministic", () => {
    const a = getSeedProperties();
    const b = getSeedProperties();
    for (let i = 0; i < a.length; i++) {
      expect(a[i].verification?.inspected_on).toBe(b[i].verification?.inspected_on);
      expect(a[i].verification?.inspector).toBe(b[i].verification?.inspector);
    }
  });
});
