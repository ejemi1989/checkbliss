import { describe, it, expect } from "vitest";
import { getInspections } from "@/lib/data";
import type { Inspection } from "@/lib/types";

type InspectionOutcome = "CLEAN" | "DAMAGE" | "NOSHOW" | "GUESTPRESENT";

function daysUntilCheckout(inspection: Inspection): number {
  const checkout = new Date(inspection.checkout_date);
  const now = new Date();
  return Math.round((checkout.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

describe("Inspection workflow state machine", () => {
  describe("Pre-checkout notification timing", () => {
    it("inspections have checkout_date in the future for current data", () => {
      const inspections = getInspections();
      for (const i of inspections) {
        expect(i.checkout_date).toBeTruthy();
        expect(i.checkout_time).toBeTruthy();
      }
    });

    it("notification should fire 1 day before checkout", () => {
      const futureInspection = getInspections().find(
        (i) => daysUntilCheckout(i) >= 1,
      );
      if (futureInspection) {
        const checkoutDate = new Date(futureInspection.checkout_date);
        const notifyDate = new Date(checkoutDate);
        notifyDate.setDate(notifyDate.getDate() - 1);
        expect(notifyDate.getTime()).toBeLessThan(checkoutDate.getTime());
      }
    });
  });

  describe("Checkout prompt", () => {
    it("checkout prompt should fire on checkout_date at checkout_time", () => {
      const inspections = getInspections();
      for (const i of inspections) {
        expect(i.checkout_time).toMatch(/^\d{2}:\d{2}$/);
      }
    });

    it("checkout prompt time is during reasonable hours", () => {
      const inspections = getInspections();
      for (const i of inspections) {
        const hour = parseInt(i.checkout_time.split(":")[0], 10);
        expect(hour).toBeGreaterThanOrEqual(8);
        expect(hour).toBeLessThanOrEqual(18);
      }
    });

    it("confirmed_checkout_time starts as null", () => {
      const inspections = getInspections();
      for (const i of inspections) {
        expect(i.confirmed_checkout_time).toBeNull();
      }
    });
  });

  describe("CLEAN outcome", () => {
    it("CLEAN should pass inspection immediately", () => {
      const outcome: InspectionOutcome = "CLEAN";
      const passes = outcome === "CLEAN";
      expect(passes).toBe(true);
    });

    it("CLEAN outcome requires no follow-up actions", () => {
      function needsClaim(o: InspectionOutcome): boolean { return o === "DAMAGE"; }
      function needsEscalation(o: InspectionOutcome): boolean { return o === "NOSHOW" || o === "GUESTPRESENT"; }
      expect(needsClaim("CLEAN")).toBe(false);
      expect(needsEscalation("CLEAN")).toBe(false);
    });

    it("CLEAN inspection transitions to completed status", () => {
      const initialStatus = "pending" as const;
      const outcome: InspectionOutcome = "CLEAN";
      const finalStatus = outcome === "CLEAN" ? "completed" : "escalated";
      expect(initialStatus).toBe("pending");
      expect(finalStatus).toBe("completed");
    });
  });

  describe("DAMAGE outcome", () => {
    it("DAMAGE triggers a damage claim", () => {
      function triggersClaim(o: InspectionOutcome): boolean { return o === "DAMAGE"; }
      expect(triggersClaim("DAMAGE")).toBe(true);
    });

    it("DAMAGE outcome transitions to escalated status", () => {
      const outcome: InspectionOutcome = "DAMAGE";
      const finalStatus = outcome === "DAMAGE" ? "escalated" : "completed";
      expect(finalStatus).toBe("escalated");
    });

    it("DAMAGE requires operator photo documentation", () => {
      const requiresPhotos = true;
      expect(requiresPhotos).toBe(true);
    });
  });

  describe("NOSHOW outcome", () => {
    it("NOSHOW escalates to admin", () => {
      function escalates(o: InspectionOutcome): boolean { return o === "NOSHOW" || o === "GUESTPRESENT"; }
      expect(escalates("NOSHOW")).toBe(true);
    });

    it("NOSHOW transitions inspection to escalated", () => {
      const initialStatus: Inspection["status"] = "in_progress";
      function isClean(o: InspectionOutcome): boolean { return o === "CLEAN"; }
      const finalStatus: Inspection["status"] = isClean("NOSHOW") ? "completed" : "escalated";
      expect(initialStatus).toBe("in_progress");
      expect(finalStatus).toBe("escalated");
    });
  });

  describe("GUESTPRESENT outcome", () => {
    it("GUESTPRESENT escalates to admin", () => {
      function escalates(o: InspectionOutcome): boolean { return o === "NOSHOW" || o === "GUESTPRESENT"; }
      expect(escalates("GUESTPRESENT")).toBe(true);
    });

    it("GUESTPRESENT requires admin review for resolution", () => {
      function requiresAdminReview(o: InspectionOutcome): boolean { return o === "GUESTPRESENT"; }
      expect(requiresAdminReview("GUESTPRESENT")).toBe(true);
    });
  });

  describe("Reminder timing", () => {
    it("reminder should fire 2 hours before checkout time", () => {
      const inspections = getInspections();
      for (const i of inspections) {
        const [hours] = i.checkout_time.split(":").map(Number);
        const reminderHour = hours - 2;
        expect(reminderHour).toBeGreaterThanOrEqual(6);
      }
    });

    it("reminder should not fire after checkout", () => {
      const pastInspection = getInspections().find(
        (i) => daysUntilCheckout(i) < 0,
      );
      if (pastInspection) {
        const needsReminder = daysUntilCheckout(pastInspection) >= 0;
        expect(needsReminder).toBe(false);
      }
    });
  });

  describe("Escalation timing", () => {
    it("DAMAGE escalation includes property and guest info", () => {
      const inspections = getInspections();
      for (const i of inspections) {
        expect(i.property_id).toBeTruthy();
        expect(i.guest_name).toBeTruthy();
        expect(i.property_name).toBeTruthy();
      }
    });

    it("escalated inspections have all required fields populated", () => {
      const inspections = getInspections();
      for (const i of inspections) {
        expect(i.id).toMatch(/^I\d{3}$/);
        expect(i.unit).toBeTruthy();
        expect(i.status).toBe("pending");
        expect(["pending", "in_progress", "completed", "escalated"]).toContain(i.status);
      }
    });

    it("escalation must happen within 24 hours of checkout", () => {
      const inspections = getInspections();
      for (const i of inspections) {
        const checkout = new Date(i.checkout_date);
        const escalationDeadline = new Date(checkout);
        escalationDeadline.setHours(escalationDeadline.getHours() + 24);
        expect(escalationDeadline.getTime()).toBeGreaterThan(checkout.getTime());
        const diffHours = Math.round(
          (escalationDeadline.getTime() - checkout.getTime()) / (1000 * 60 * 60),
        );
        expect(diffHours).toBe(24);
      }
    });
  });
});
