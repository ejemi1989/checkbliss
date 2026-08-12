import { describe, it, expect, beforeEach } from "vitest";
import {
  computeSplit,
  isPayoutEligible,
  computeNextAttemptAt,
  PLATFORM_COMMISSION_BPS,
  PLATFORM_COMMISSION_FACTOR,
  OWNER_SHARE_FACTOR,
  PAYOUT_SETTLEMENT_BUSINESS_DAYS,
  MAX_PAYOUT_RETRY_ATTEMPTS,
  RETRY_BASE_DELAY_MS,
  addMockPayout,
  getMockPayoutLedger,
  resetMockPayoutLedger,
  evaluatePayoutEligibility,
  releaseEligiblePayouts,
  pollPendingPayouts,
  recordRefundSplit,
  createOwnerPayoutRows,
} from "@/lib/payouts";
import { resetMockRaenest } from "@/lib/raenest";
import { convertGbpToNgnMinor, isFxWithinRange } from "@/lib/currency";

beforeEach(() => {
  resetMockPayoutLedger();
  resetMockRaenest();
});

describe("Payout split computation", () => {
  it("computes 12% commission on £600 (60000 minor)", () => {
    const split = computeSplit(60000);
    expect(split.commissionMinor).toBe(7200); // 12% of 60000
    expect(split.ownerShareMinor).toBe(52800); // 88% of 60000
    expect(split.commissionMinor + split.ownerShareMinor).toBe(60000);
  });

  it("rounds commission correctly for odd amounts", () => {
    const split = computeSplit(42001);
    expect(split.commissionMinor + split.ownerShareMinor).toBe(42001);
    expect(split.commissionMinor).toBe(Math.round(42001 * PLATFORM_COMMISSION_FACTOR));
  });

  it("handles small amounts without losing cents", () => {
    const split = computeSplit(1);
    expect(split.commissionMinor + split.ownerShareMinor).toBe(1);
  });

  it("sum of commission + owner share always equals total", () => {
    for (const amount of [0, 1, 99, 100, 48000, 99999, 123456]) {
      const split = computeSplit(amount);
      expect(split.commissionMinor + split.ownerShareMinor).toBe(amount);
    }
  });
});

describe("Payout eligibility", () => {
  it("eligible when all reservations completed, inspections clean, no open claims", () => {
    const eligible = isPayoutEligible(
      [{ id: "R1", status: "completed" }],
      [{ reservation_id: "R1", result: "clean" }],
      0,
    );
    expect(eligible).toBe(true);
  });

  it("not eligible when any reservation not completed", () => {
    const eligible = isPayoutEligible(
      [{ id: "R1", status: "confirmed" }, { id: "R2", status: "completed" }],
      [{ reservation_id: "R1", result: "clean" }],
      0,
    );
    expect(eligible).toBe(false);
  });

  it("not eligible when no inspections exist", () => {
    const eligible = isPayoutEligible(
      [{ id: "R1", status: "completed" }],
      [],
      0,
    );
    expect(eligible).toBe(false);
  });

  it("not eligible when inspection result is damage", () => {
    const eligible = isPayoutEligible(
      [{ id: "R1", status: "completed" }],
      [{ reservation_id: "R1", result: "damage" }],
      0,
    );
    expect(eligible).toBe(false);
  });

  it("not eligible when open damage claims exist", () => {
    const eligible = isPayoutEligible(
      [{ id: "R1", status: "completed" }],
      [{ reservation_id: "R1", result: "clean" }],
      1,
    );
    expect(eligible).toBe(false);
  });

  it("not eligible when no reservations exist", () => {
    const eligible = isPayoutEligible([], [], 0);
    expect(eligible).toBe(false);
  });
});

describe("Mock payout ledger", () => {
  it("adds and retrieves mock payout records", () => {
    addMockPayout({
      id: "OP-test",
      bookingGroupId: "BG-test",
      reservationId: "R-test",
      propertyId: "P-test",
      ownerId: "OW-test",
      ownerShareMinor: 52800,
      status: "pending",
      payoutNgnMinor: null,
      fxRate: null,
      raenestReference: null,
      requestedAt: null,
      releasedAt: null,
      paidAt: null,
      nextAttemptAt: null,
    });

    const ledger = getMockPayoutLedger();
    expect(ledger).toHaveLength(1);
    expect(ledger[0].status).toBe("pending");
  });

  it("evaluatePayoutEligibility marks all pending as eligible in mock mode", async () => {
    addMockPayout({
      id: "OP-e1",
      bookingGroupId: "BG-e1",
      reservationId: "R-e1",
      propertyId: "P-e1",
      ownerId: "OW-e1",
      ownerShareMinor: 50000,
      status: "pending",
      payoutNgnMinor: null,
      fxRate: null,
      raenestReference: null,
      requestedAt: null,
      releasedAt: null,
      paidAt: null,
      nextAttemptAt: null,
    });

    const eligibleIds = await evaluatePayoutEligibility();
    expect(eligibleIds).toContain("BG-e1");

    const ledger = getMockPayoutLedger();
    expect(ledger[0].status).toBe("eligible");
  });

  it("releaseEligiblePayouts processes eligible payouts in mock mode", async () => {
    addMockPayout({
      id: "OP-r1",
      bookingGroupId: "BG-r1",
      reservationId: "R-r1",
      propertyId: "P-r1",
      ownerId: "OW-r1",
      ownerShareMinor: 50000,
      status: "eligible",
      payoutNgnMinor: null,
      fxRate: null,
      raenestReference: null,
      requestedAt: null,
      releasedAt: null,
      paidAt: null,
      nextAttemptAt: null,
    });

    // Backdate createdAt to satisfy the 3-business-day settlement hold
    const ledger = getMockPayoutLedger();
    const past = new Date();
    past.setDate(past.getDate() - 5);
    ledger[0].createdAt = past.toISOString();

    const releasedIds = await releaseEligiblePayouts();
    expect(releasedIds).toContain("BG-r1");

    const updated = getMockPayoutLedger();
    expect(updated[0].status).toBe("paid");
    expect(updated[0].payoutNgnMinor).toBeGreaterThan(0);
    expect(updated[0].fxRate).toBeGreaterThan(0);
    expect(updated[0].raenestReference).toBeTruthy();
  });

  it("pollPendingPayouts confirms released payouts in mock mode", async () => {
    addMockPayout({
      id: "OP-p1",
      bookingGroupId: "BG-p1",
      reservationId: "R-p1",
      propertyId: "P-p1",
      ownerId: "OW-p1",
      ownerShareMinor: 50000,
      status: "released",
      payoutNgnMinor: null,
      fxRate: null,
      raenestReference: "rnst_mock_BG-p1",
      requestedAt: new Date().toISOString(),
      releasedAt: new Date().toISOString(),
      paidAt: null,
      nextAttemptAt: null,
    });

    const confirmed = await pollPendingPayouts();
    expect(confirmed).toBe(1);

    const ledger = getMockPayoutLedger();
    expect(ledger[0].status).toBe("paid");
    expect(ledger[0].paidAt).toBeTruthy();
  });
});

describe("Refund split reversal", () => {
  it("marks payout as refunded when fully refunded", async () => {
    addMockPayout({
      id: "OP-ref",
      bookingGroupId: "BG-ref",
      reservationId: "R-ref",
      propertyId: "P-ref",
      ownerId: "OW-ref",
      ownerShareMinor: 52800,
      status: "paid",
      payoutNgnMinor: 129360000,
      fxRate: 2450,
      raenestReference: "rnst_mock_BG-ref",
      requestedAt: new Date().toISOString(),
      releasedAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      nextAttemptAt: null,
    });

    await recordRefundSplit({
      bookingGroupId: "BG-ref",
      totalRefundedMinor: 60000,
      reason: "requested_by_customer",
    });

    const ledger = getMockPayoutLedger();
    expect(ledger[0].status).toBe("refunded");
  });
});

describe("Retry backoff", () => {
  it("computes exponential backoff delay", () => {
    const after0 = computeNextAttemptAt(0);
    const after1 = computeNextAttemptAt(1);
    const after2 = computeNextAttemptAt(2);

    const delay0 = after0.getTime() - Date.now();
    const delay1 = after1.getTime() - Date.now();
    const delay2 = after2.getTime() - Date.now();

    expect(delay0).toBeGreaterThanOrEqual(RETRY_BASE_DELAY_MS);
    expect(delay1).toBeGreaterThanOrEqual(RETRY_BASE_DELAY_MS * 2);
    expect(delay2).toBeGreaterThanOrEqual(RETRY_BASE_DELAY_MS * 4);
  });

  it("caps at RETRY_MAX_DELAY_MS", () => {
    const after20 = computeNextAttemptAt(20);
    const delay = after20.getTime() - Date.now();
    expect(delay).toBeLessThanOrEqual(RETRY_BASE_DELAY_MS * Math.pow(2, 20) + 1000);
  });
});

describe("NGN conversion", () => {
  it("converts GBP minor to NGN minor at default rate", () => {
    const ngnMinor = convertGbpToNgnMinor(52800, 2450); // £528 → NGN
    expect(ngnMinor).toBe(129360000); // 528 * 2450 * 100 = 1,293,600 * 100
  });

  it("converts £100 GBP deposit to NGN", () => {
    const ngnMinor = convertGbpToNgnMinor(10000, 2450);
    expect(ngnMinor).toBe(24500000); // 100 * 2450 * 100
  });

  it("FX rate is within expected range", () => {
    expect(isFxWithinRange(2450)).toBe(true);
    expect(isFxWithinRange(1980)).toBe(false);
    expect(isFxWithinRange(3600)).toBe(false);
    expect(isFxWithinRange(2000)).toBe(true);
    expect(isFxWithinRange(3500)).toBe(true);
  });
});

describe("Constants", () => {
  it("platform commission is 12%", () => {
    expect(PLATFORM_COMMISSION_BPS).toBe(1200);
    expect(PLATFORM_COMMISSION_FACTOR).toBe(0.12);
    expect(OWNER_SHARE_FACTOR).toBe(0.88);
  });

  it("payout settlement hold is 3 business days", () => {
    expect(PAYOUT_SETTLEMENT_BUSINESS_DAYS).toBe(3);
  });

  it("max payout retry attempts is 5", () => {
    expect(MAX_PAYOUT_RETRY_ATTEMPTS).toBe(5);
  });
});

describe("createOwnerPayoutRows in mock mode", () => {
  it("creates payout entries in the mock ledger", async () => {
    await createOwnerPayoutRows("BG-test-creator", [
      { ownerId: "OW1", reservationId: "R1", propertyId: "P1", ownerShareMinor: 52800 },
      { ownerId: "OW4", reservationId: "R2", propertyId: "P5", ownerShareMinor: 96800 },
    ]);

    const ledger = getMockPayoutLedger();
    expect(ledger).toHaveLength(2);

    const ow1 = ledger.find((l) => l.ownerId === "OW1");
    expect(ow1).toBeDefined();
    expect(ow1!.ownerShareMinor).toBe(52800);
    expect(ow1!.status).toBe("pending");

    const ow4 = ledger.find((l) => l.ownerId === "OW4");
    expect(ow4).toBeDefined();
    expect(ow4!.ownerShareMinor).toBe(96800);
  });
});
