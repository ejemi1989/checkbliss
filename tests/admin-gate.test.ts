import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  adminGateConfigured,
  adminGateBypassed,
  isMockMode,
} from "@/lib/admin-gate";

describe("Admin gate — pure helpers", () => {
  const env = process.env as Record<string, string | undefined>;
  const originalNodeEnv = env.NODE_ENV;
  const originalKey = env.ADMIN_DASH_KEY;
  const originalSupabase = env.SUPABASE_SECRET_KEY;
  const originalStripe = env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    delete env.ADMIN_DASH_KEY;
    delete env.SUPABASE_SECRET_KEY;
    delete env.STRIPE_SECRET_KEY;
    env.NODE_ENV = "test";
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = originalNodeEnv;
    if (originalKey) env.ADMIN_DASH_KEY = originalKey;
    if (originalSupabase) env.SUPABASE_SECRET_KEY = originalSupabase;
    if (originalStripe) env.STRIPE_SECRET_KEY = originalStripe;
  });

  describe("isMockMode", () => {
    it("returns true in test env with no Supabase or Stripe keys", () => {
      expect(isMockMode()).toBe(true);
    });

    it("returns false when SUPABASE_SECRET_KEY is set", () => {
      process.env.SUPABASE_SECRET_KEY = "sb_secret_x";
      expect(isMockMode()).toBe(false);
    });

    it("returns false when STRIPE_SECRET_KEY is set", () => {
      process.env.STRIPE_SECRET_KEY = "sk_test_x";
      expect(isMockMode()).toBe(false);
    });

    it("returns false in production even without keys", () => {
      env.NODE_ENV = "production";
      expect(isMockMode()).toBe(false);
    });
  });

  describe("adminGateConfigured", () => {
    it("is false when ADMIN_DASH_KEY is unset", () => {
      expect(adminGateConfigured()).toBe(false);
    });

    it("is true when ADMIN_DASH_KEY is set", () => {
      process.env.ADMIN_DASH_KEY = "test-key-12345";
      expect(adminGateConfigured()).toBe(true);
    });
  });

  describe("adminGateBypassed", () => {
    it("is true in mock mode with no key set", () => {
      expect(adminGateBypassed()).toBe(true);
    });

    it("is false in mock mode once a key is set", () => {
      process.env.ADMIN_DASH_KEY = "test-key-12345";
      expect(adminGateBypassed()).toBe(false);
    });

    it("is false in production", () => {
      env.NODE_ENV = "production";
      expect(adminGateBypassed()).toBe(false);
    });
  });
});
