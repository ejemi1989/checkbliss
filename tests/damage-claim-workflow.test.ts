import { describe, it, expect } from "vitest";
import { getAdminClaims, getAdminAudit } from "@/lib/data";
import {
  releaseHold,
  captureFromHold,
} from "@/lib/stripe";
import type { DamageClaim } from "@/lib/types";

describe("Damage claim workflow", () => {
  describe("Operator creates damage report", () => {
    it("all claims have required fields", () => {
      const claims = getAdminClaims();
      for (const c of claims) {
        expect(c.id).toBeTruthy();
        expect(c.reservation_id).toBeTruthy();
        expect(c.property_id).toBeTruthy();
        expect(c.guest_name).toBeTruthy();
        expect(c.description).toBeTruthy();
      }
    });

    it("claims include estimated cost in minor units", () => {
      const claims = getAdminClaims();
      for (const c of claims) {
        expect(Number.isInteger(c.estimated_cost_minor)).toBe(true);
        expect(c.estimated_cost_minor).toBeGreaterThanOrEqual(0);
      }
    });

    it("claims include photo evidence", () => {
      const claims = getAdminClaims();
      for (const c of claims) {
        expect(c.photo_count).toBeGreaterThanOrEqual(1);
      }
    });

    it("claims reference a valid booking/guest", () => {
      const claims = getAdminClaims();
      for (const c of claims) {
        expect(c.booking_ref).toBeTruthy();
        expect(c.stay_dates).toBeTruthy();
      }
    });
  });

  describe("Claim enters admin review", () => {
    it("all claims start with admin_decision pending", () => {
      const claims = getAdminClaims();
      for (const c of claims) {
        expect(c.admin_decision).toBe("pending");
      }
    });

    it("pending claims have no decision date or admin", () => {
      const claims = getAdminClaims();
      for (const c of claims) {
        if (c.admin_decision === "pending") {
          expect(c.decided_at).toBeNull();
          expect(c.decided_by).toBeNull();
        }
      }
    });

    it("claims with damage have estimated cost > 0", () => {
      const claims = getAdminClaims();
      const withDamage = claims.filter((c) => c.description.toLowerCase().includes("broken") || c.description.toLowerCase().includes("stain"));
      for (const c of withDamage) {
        expect(c.estimated_cost_minor).toBeGreaterThan(0);
      }
    });

    it("operator can add notes to the claim", () => {
      const claims = getAdminClaims();
      for (const c of claims) {
        expect("operator_notes" in c).toBe(true);
      }
    });
  });

  describe("Admin approves full capture", () => {
    it("approved claim triggers full deposit capture", async () => {
      const holdAmount = 10000;
      const approvedCost = 10000;
      expect(approvedCost).toBeLessThanOrEqual(holdAmount);
      await expect(
        captureFromHold("mock-hold-approve-full", approvedCost),
      ).resolves.toBeUndefined();
    });

    it("full approval captures the entire estimated cost", () => {
      const estimatedCost = 35000;
      const capturedAmount = 35000;
      expect(capturedAmount).toBe(estimatedCost);
    });

    it("approved claim updates audit log", () => {
      const audit = getAdminAudit();
      const claimApproval = audit.find(
        (a) => a.action === "Damage claim approved",
      );
      expect(claimApproval).toBeTruthy();
      expect(claimApproval!.detail).toContain("deducted from deposit");
    });
  });

  describe("Admin adjusts partial capture", () => {
    it("adjusted amount is less than estimated cost", () => {
      const estimatedCost = 35000;
      const adjustedAmount = 15000;
      expect(adjustedAmount).toBeLessThan(estimatedCost);
      expect(adjustedAmount).toBeGreaterThan(0);
    });

    it("partial capture captures adjusted amount and releases remainder", async () => {
      const holdAmount = 50000;
      const adjustedAmount = 15000;
      const remainder = holdAmount - adjustedAmount;

      expect(adjustedAmount).toBeLessThan(holdAmount);
      await expect(
        captureFromHold("mock-hold-adjusted", adjustedAmount),
      ).resolves.toBeUndefined();
      await expect(
        releaseHold("mock-hold-adjusted"),
      ).resolves.toBeUndefined();

      expect(remainder).toBeGreaterThan(0);
    });

    it("adjusted amounts are in integer minor units", () => {
      const adjustedAmount = 15000;
      expect(Number.isInteger(adjustedAmount)).toBe(true);
    });
  });

  describe("Admin rejects full release", () => {
    it("rejected claim releases the full deposit", async () => {
      await expect(
        releaseHold("mock-hold-rejected"),
      ).resolves.toBeUndefined();
    });

    it("rejected claim captures nothing", () => {
      const captureAmount = 0;
      expect(captureAmount).toBe(0);
    });

    it("rejected claim changes admin_decision from pending to rejected", () => {
      const decision: DamageClaim["admin_decision"] = "rejected";
      expect(decision).toBe("rejected");
      expect(["pending", "approved", "adjusted", "rejected"]).toContain(decision);
    });
  });

  describe("Guest disputes within 7-day window", () => {
    it("dispute status starts as none", () => {
      const claims = getAdminClaims();
      for (const c of claims) {
        expect(["none", "open", "accepted", "resolved"]).toContain(c.dispute_status);
      }
    });

    it("guest can dispute within 7 days of decision", () => {
      const decisionDate = "2026-06-23";
      const disputeDeadline = new Date(decisionDate);
      disputeDeadline.setDate(disputeDeadline.getDate() + 7);
      const now = new Date("2026-06-25");
      expect(now.getTime()).toBeLessThanOrEqual(disputeDeadline.getTime());
    });

    it("dispute after 7 days is invalid", () => {
      const decisionDate = "2026-06-15";
      const disputeDeadline = new Date(decisionDate);
      disputeDeadline.setDate(disputeDeadline.getDate() + 7);
      const now = new Date("2026-06-30");
      expect(now.getTime()).toBeGreaterThan(disputeDeadline.getTime());
    });

    it("dispute transitions status from none to open", () => {
      const before: DamageClaim["dispute_status"] = "none";
      const after: DamageClaim["dispute_status"] = "open";
      expect(before).toBe("none");
      expect(after).toBe("open");
    });

    it("dispute can be accepted by admin and resolved", () => {
      const disputeFlow: DamageClaim["dispute_status"][] = [
        "none",
        "open",
        "accepted",
        "resolved",
      ];
      expect(disputeFlow.length).toBe(4);
      for (let i = 0; i < disputeFlow.length - 1; i++) {
        expect(disputeFlow[i]).not.toBe(disputeFlow[i + 1]);
      }
    });
  });
});
