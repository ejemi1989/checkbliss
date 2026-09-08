import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { POST } from "@/app/api/bookings/route";
import {
  getAdminClaims,
  getAdminFinance,
  getReconciliation,
} from "@/lib/data";
import { getSeedDamageClaims, getSeedProperties } from "@/lib/seed-data";

// Booking references are 8-char base32 (charset mirrors `generateReference()`
// in app/api/bookings/route.ts and book_stays() in the schema). This charset
// omits I, O, 0 and 1 to avoid lookalike ambiguity in guest-facing booking
// references. Deposit-hold and refund references are NOT booking references
// and are excluded from this invariant.
const BASE32_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const BASE32_RE = new RegExp(`^[${BASE32_CHARSET}]{8}$`);

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

describe("Booking reference format (8-char base32)", () => {
  describe("generation", () => {
    it("mock booking response returns an 8-char base32 reference", async () => {
      const prop = getSeedProperties().find((p) => p.status === "approved");
      if (!prop) throw new Error("No approved seed property");

      const res = await POST(
        new NextRequest("http://localhost/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guest: {
              name: "Ref Guest",
              email: "ref@example.com",
              phone: "+447700900000",
              guests: 2,
            },
            items: [
              {
                property_id: prop.id,
                check_in: futureDate(30),
                check_out: futureDate(33),
              },
            ],
            turnstile_token: "mock-token",
          }),
        }),
      );
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.reference).toBeTruthy();
      expect(data.reference).toMatch(BASE32_RE);
    });

    it("charset excludes lookalike characters (I, O, 0, 1)", () => {
      expect(BASE32_CHARSET).not.toMatch(/[IO01]/);
    });
  });

  describe("fixtures", () => {
    it("damage-claim booking_refs are 8-char base32", () => {
      const claims = [...getSeedDamageClaims(), ...getAdminClaims()];
      expect(claims.length).toBeGreaterThan(0);
      for (const c of claims) {
        // "N/A" is the intentional sentinel for the pre-listing inspection
        // walkthrough claim (C003) — it has no booking.
        if (c.booking_ref === "N/A") continue;
        expect(c.booking_ref).toMatch(BASE32_RE);
      }
    });

    it("reconciliation booking_charge refs are 8-char base32", () => {
      const charges = getReconciliation().records.filter(
        (r) => r.type === "booking_charge" && r.booking_ref,
      );
      expect(charges.length).toBeGreaterThan(0);
      for (const c of charges) {
        expect(c.booking_ref).toMatch(BASE32_RE);
      }
    });

    it("finance payment refs are 8-char base32", () => {
      const payments = getAdminFinance().filter(
        (f) => f.type === "payment" && f.ref,
      );
      expect(payments.length).toBeGreaterThan(0);
      for (const p of payments) {
        expect(p.ref).toMatch(BASE32_RE);
      }
    });
  });

  describe("real-mode plumbing (schema-drift guard)", () => {
    const routeSource = readFileSync(
      join(process.cwd(), "app/api/bookings/route.ts"),
      "utf8",
    );
    const migration = readFileSync(
      join(process.cwd(), "supabase/migrations/0018_phase7_schema.sql"),
      "utf8",
    );

    it("book_stays RPC call passes p_reference and p_currency", () => {
      expect(routeSource).toContain("p_reference: reference");
      expect(routeSource).toContain("p_currency: currency");
    });

    it("booking_groups.write after reserve is an upsert, not a conflicting insert", () => {
      expect(routeSource).toContain('.upsert(');
      expect(routeSource).toContain('onConflict: "id"');
    });

    it("migration 0018 provides operators, country_of_residence and booking_groups.reference", () => {
      expect(migration).toMatch(/create table if not exists operators/);
      expect(migration).toContain("country_of_residence text");
      expect(migration).toContain("booking_groups");
      expect(migration).toContain("add column if not exists reference text");
      expect(migration).toContain("booking_groups_reference_uidx");
    });

    it("book_stays in the base schema inserts booking_groups atomically", () => {
      const base = readFileSync(
        join(process.cwd(), "supabase/migrations/0001_schema.sql"),
        "utf8",
      );
      expect(base).toContain("p_reference text");
      expect(base).toContain("insert into booking_groups");
    });
  });
});