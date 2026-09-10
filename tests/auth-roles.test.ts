import { describe, it, expect } from "vitest";
import { DEMO_EMAIL_ROLES, demoRoleForEmail, mockOperatorCities } from "@/lib/auth";

describe("demoRoleForEmail", () => {
  it("maps demo credentials to their intended dashboards", () => {
    expect(demoRoleForEmail("admin@checkbliss.com")).toBe("admin");
    expect(demoRoleForEmail("owner@checkbliss.com")).toBe("owner");
    expect(demoRoleForEmail("guest@checkbliss.com")).toBe("guest");
    expect(demoRoleForEmail("operator-lagos@checkbliss.com")).toBe("operator");
    expect(demoRoleForEmail("operator-abuja@checkbliss.com")).toBe("operator");
    expect(demoRoleForEmail("operator@checkbliss.com")).toBe("operator");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(demoRoleForEmail("  ADMIN@Checkbliss.com ")).toBe("admin");
    expect(demoRoleForEmail("Owner@checkbliss.com")).toBe("owner");
  });

  it("returns null for real (non-demo) users", () => {
    expect(demoRoleForEmail("real.guest@gmail.com")).toBeNull();
    expect(demoRoleForEmail(undefined)).toBeNull();
  });

  it("every demo email resolves to a valid role", () => {
    for (const email of Object.keys(DEMO_EMAIL_ROLES)) {
      const role = demoRoleForEmail(email);
      expect(["admin", "operator", "owner", "guest"]).toContain(role);
    }
  });
});

describe("mockOperatorCities", () => {
  it("derives operator city scope from demo emails", () => {
    expect(mockOperatorCities("operator-lagos@checkbliss.com")).toEqual(["Lagos"]);
    expect(mockOperatorCities("operator-abuja@checkbliss.com")).toEqual(["Abuja"]);
    expect(mockOperatorCities("operator@checkbliss.com")).toEqual(["Lagos", "Abuja"]);
    expect(mockOperatorCities("admin@checkbliss.com")).toEqual([]);
  });
});