import { describe, it, expect } from "vitest";
import {
  MIN_ADVANCE_DAYS,
  BOOKING_RULE_TIMEZONE,
  daysUntilCheckIn,
  isBookingOpen,
  advanceRuleViolation,
  minCheckInDateStr,
  dateInTimeZone,
} from "@/lib/booking-rules";

const BASE = new Date("2026-08-01T12:00:00Z");
const BASE_TODAY = "2026-08-01";

/**
 * The 14-day rule, made explicit:
 *   diffDays  = check_in_date - today_date   (date-only, Africa/Lagos)
 *   allowed   = diffDays >= 14
 *   rejected  = diffDays <  14  (1..13)
 */
describe("14-day advance booking rule", () => {
  it("documents the rule constant", () => {
    expect(MIN_ADVANCE_DAYS).toBe(14);
    expect(BOOKING_RULE_TIMEZONE).toBe("Africa/Lagos");
  });

  it.each([
    [1, false],
    [3, false],
    [7, false],
    [13, false],
    [14, true],
    [15, true],
    [30, true],
    [60, true],
  ])("check-in %i day(s) ahead is %s", (days, allowed) => {
    const checkIn = `2026-08-${String(1 + days).padStart(2, "0")}`;
    expect(isBookingOpen(checkIn, { now: BASE })).toBe(allowed);
  });

  describe("boundary — exactly 14 days", () => {
    it("13 days ahead is rejected", () => {
      // 14 Aug, BASE_TODAY = 1 Aug → diff 13
      expect(daysUntilCheckIn("2026-08-14", { now: BASE })).toBe(13);
      expect(advanceRuleViolation("2026-08-14", { now: BASE })).toBe("ADVANCE_14_DAYS");
      expect(isBookingOpen("2026-08-14", { now: BASE })).toBe(false);
    });

    it("14 days ahead is the earliest bookable day", () => {
      // 15 Aug, BASE_TODAY = 1 Aug → diff 14
      expect(daysUntilCheckIn("2026-08-15", { now: BASE })).toBe(14);
      expect(advanceRuleViolation("2026-08-15", { now: BASE })).toBeNull();
      expect(isBookingOpen("2026-08-15", { now: BASE })).toBe(true);
    });

    it("minCheckInDateStr is exactly today + 14 days", () => {
      expect(minCheckInDateStr({ now: BASE })).toBe("2026-08-15");
    });
  });

  describe("date-only arithmetic across months and years", () => {
    it("computes across a month boundary", () => {
      // today 2026-08-20, check-in 2026-09-03 → diff 14
      expect(daysUntilCheckIn("2026-09-03", { now: new Date("2026-08-20T10:00:00Z") })).toBe(14);
      expect(isBookingOpen("2026-09-03", { now: new Date("2026-08-20T10:00:00Z") })).toBe(true);
      expect(isBookingOpen("2026-09-02", { now: new Date("2026-08-20T10:00:00Z") })).toBe(false);
    });

    it("computes across a year boundary", () => {
      // today 2026-12-20, check-in 2027-01-03 → diff 14
      expect(daysUntilCheckIn("2027-01-03", { now: new Date("2026-12-20T09:00:00Z") })).toBe(14);
      expect(isBookingOpen("2027-01-03", { now: new Date("2026-12-20T09:00:00Z") })).toBe(true);
    });
  });

  describe("timezone determinism (Africa/Lagos is the rule's clock)", () => {
    it("Lagos 'today' can differ from UTC 'today'", () => {
      // 2026-08-14T23:30:00Z is 2026-08-15 00:30 in Lagos → Lagos date is the 15th
      const instant = new Date("2026-08-14T23:30:00Z");
      expect(dateInTimeZone(instant, "UTC")).toBe("2026-08-14");
      expect(dateInTimeZone(instant, "Africa/Lagos")).toBe("2026-08-15");
    });

    it("rule uses the Lagos date, so the same UTC instant can flip the verdict", () => {
      const instant = new Date("2026-08-14T23:30:00Z");
      // In UTC today is the 14th → 14 days to the 28th
      expect(daysUntilCheckIn("2026-08-28", { now: instant, timeZone: "UTC" })).toBe(14);
      // In Lagos today is the 15th → 14 days to the 29th; the 28th is only 13 ahead
      expect(daysUntilCheckIn("2026-08-28", { now: instant })).toBe(13);
      expect(isBookingOpen("2026-08-28", { now: instant })).toBe(false);
      expect(isBookingOpen("2026-08-29", { now: instant })).toBe(true);
    });

    it("defaults to the Lagos clock regardless of any other zone", () => {
      // The function's default IS the invariant: callers never pass a
      // timezone, so the verdict is always derived from Africa/Lagos.
      const checkIn = "2026-08-28";
      // Boundary instant where Lagos date != UTC date
      const instant = new Date("2026-08-14T23:30:00Z");
      // Default call → Lagos "today" = 15 Aug → 13 days → rejected
      expect(isBookingOpen(checkIn, { now: instant })).toBe(false);
      // A caller that did pass its own zone would change semantics — the
      // library therefore documents that timeZone is test-only.
      expect(isBookingOpen(checkIn, { now: instant, timeZone: "UTC" })).toBe(true);
      // Next day, still via default, becomes bookable
      expect(isBookingOpen("2026-08-29", { now: instant })).toBe(true);
    });
  });

  describe("past and same-day check-ins", () => {
    it("past dates are rejected", () => {
      expect(isBookingOpen("2026-07-31", { now: BASE })).toBe(false);
      expect(advanceRuleViolation("2026-07-31", { now: BASE })).toBe("ADVANCE_14_DAYS");
    });

    it("today and tomorrow are rejected", () => {
      expect(isBookingOpen(BASE_TODAY, { now: BASE })).toBe(false);
      expect(isBookingOpen("2026-08-02", { now: BASE })).toBe(false);
    });
  });

  describe("helper invariants", () => {
    it("advanceRuleViolation returns null exactly when booking is open", () => {
      for (const days of [1, 7, 13, 14, 21, 45]) {
        const checkIn = `2026-08-${String(1 + days).padStart(2, "0")}`;
        const code = advanceRuleViolation(checkIn, { now: BASE });
        if (days >= 14) expect(code).toBeNull();
        else expect(code).toBe("ADVANCE_14_DAYS");
      }
    });

    it("minCheckInDateStr is always >= 14 days after today and < 15", () => {
      for (let day = 1; day <= 28; day++) {
        const now = new Date(`2026-07-${String(day).padStart(2, "0")}T06:00:00Z`);
        const min = minCheckInDateStr({ now });
        expect(daysUntilCheckIn(min, { now })).toBe(14);
        expect(daysUntilCheckIn(min, { now })).not.toBe(13);
      }
    });
  });
});
