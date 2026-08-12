import "server-only";
import { supabaseAdminConfigured, createAdmin } from "@/lib/supabase/admin";
import { createRaenestPayout, getRaenestPayoutStatus, raenestConfigured, RaenestError } from "@/lib/raenest";
import { convertGbpToNgnMinor, GBP_TO_NGN_RATE, isFxWithinRange } from "@/lib/currency";
import { log } from "@/lib/observability";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

export const PLATFORM_COMMISSION_BPS = 1200;
export const PLATFORM_COMMISSION_PCT = 12;
export const PLATFORM_COMMISSION_FACTOR = 0.12;
export const OWNER_SHARE_FACTOR = 0.88;
export const PAYOUT_SETTLEMENT_BUSINESS_DAYS = 3;
export const MAX_PAYOUT_RETRY_ATTEMPTS = 5;
export const RETRY_BASE_DELAY_MS = 60_000;
export const RETRY_MAX_DELAY_MS = 900_000;
export const FX_EXPECTED_MIN = 2000;
export const FX_EXPECTED_MAX = 3500;

/* ------------------------------------------------------------------ */
/*  Split computation                                                  */
/* ------------------------------------------------------------------ */

export interface PayoutSplit {
  commissionMinor: number;
  ownerShareMinor: number;
}

export function computeSplit(totalMinor: number): PayoutSplit {
  const commissionMinor = Math.round(totalMinor * PLATFORM_COMMISSION_FACTOR);
  const ownerShareMinor = totalMinor - commissionMinor;
  return { commissionMinor, ownerShareMinor };
}

/* ------------------------------------------------------------------ */
/*  Eligibility — determines if a booking group is ready for payout   */
/* ------------------------------------------------------------------ */

export function isPayoutEligible(reservations: PayoutReservationCheck[], inspections: PayoutInspectionCheck[], openClaims: number): boolean {
  const allCompleted = reservations.every((r) => r.status === "completed");
  if (!allCompleted) return false;

  const allInspected = reservations.length > 0 && inspections.length > 0 &&
    inspections.every((insp) => insp.result === "clean");
  if (!allInspected) return false;

  if (openClaims > 0) return false;

  return true;
}

export interface PayoutReservationCheck {
  id: string;
  status: string;
}

export interface PayoutInspectionCheck {
  reservation_id: string;
  result: string | null;
}

/* ------------------------------------------------------------------ */
/*  Retry with exponential backoff                                     */
/* ------------------------------------------------------------------ */

export function computeNextAttemptAt(attempts: number): Date {
  const delay = Math.min(RETRY_BASE_DELAY_MS * Math.pow(2, attempts), RETRY_MAX_DELAY_MS);
  return new Date(Date.now() + delay);
}

/* ------------------------------------------------------------------ */
/*  Mock ledger (in-memory, used when Supabase is not configured)      */
/* ------------------------------------------------------------------ */

interface MockPayoutRecord {
  id: string;
  bookingGroupId: string;
  reservationId: string;
  propertyId: string;
  ownerId: string;
  ownerShareMinor: number;
  status: string;
  payoutNgnMinor: number | null;
  fxRate: number | null;
  raenestReference: string | null;
  requestedAt: string | null;
  releasedAt: string | null;
  paidAt: string | null;
  attempts: number;
  lastError: string | null;
  nextAttemptAt: string | null;
  createdAt: string;
}

const mockPayoutLedger: MockPayoutRecord[] = [];

export function getMockPayoutLedger(): MockPayoutRecord[] {
  return mockPayoutLedger;
}

export function resetMockPayoutLedger(): void {
  mockPayoutLedger.length = 0;
}

export function addMockPayout(record: Omit<MockPayoutRecord, "createdAt" | "attempts" | "lastError">): MockPayoutRecord {
  const entry: MockPayoutRecord = {
    ...record,
    attempts: 0,
    lastError: null,
    createdAt: new Date().toISOString(),
  };
  mockPayoutLedger.push(entry);
  return entry;
}

export function updateMockPayout(bookingGroupId: string, updates: Partial<MockPayoutRecord>): MockPayoutRecord | undefined {
  const idx = mockPayoutLedger.findIndex((p) => p.bookingGroupId === bookingGroupId);
  if (idx === -1) return undefined;
  mockPayoutLedger[idx] = { ...mockPayoutLedger[idx], ...updates };
  return mockPayoutLedger[idx];
}

/* ------------------------------------------------------------------ */
/*  DB-backed payout persistence                                       */
/* ------------------------------------------------------------------ */

async function createOwnerPayoutRows(
  groupId: string,
  entries: Array<{
    reservationId: string;
    propertyId: string;
    ownerId: string;
    ownerShareMinor: number;
  }>,
): Promise<void> {
  if (!supabaseAdminConfigured) {
    for (const e of entries) {
      mockPayoutLedger.push({
        id: crypto.randomUUID(),
        bookingGroupId: groupId,
        reservationId: e.reservationId,
        propertyId: e.propertyId || "",
        ownerId: e.ownerId || "",
        ownerShareMinor: e.ownerShareMinor,
        status: "pending",
        payoutNgnMinor: null,
        fxRate: null,
        raenestReference: null,
        requestedAt: null,
        releasedAt: null,
        paidAt: null,
        attempts: 0,
        lastError: null,
        nextAttemptAt: null,
        createdAt: new Date().toISOString(),
      });
    }
    return;
  }

  const db = createAdmin();
  const rows = entries.map((e) => ({
    booking_group_id: groupId,
    reservation_id: e.reservationId,
    property_id: e.propertyId,
    owner_id: e.ownerId,
    owner_share_minor: e.ownerShareMinor,
    status: "pending",
  }));

  const { error } = await db.from("owner_payouts").insert(rows);
  if (error) log("payouts", "error", `Failed to create owner_payouts rows for group ${groupId}`, { error: error.message });
}

/* ------------------------------------------------------------------ */
/*  Eligibility evaluation — called by cron                           */
/* ------------------------------------------------------------------ */

export async function evaluatePayoutEligibility(): Promise<string[]> {
  const eligibleIds: string[] = [];

  if (!supabaseAdminConfigured) {
    for (const record of mockPayoutLedger) {
      if (record.status !== "pending") continue;
      record.status = "eligible";
      eligibleIds.push(record.bookingGroupId);
      log("payouts", "info", `Mock eligibility — group ${record.bookingGroupId} marked eligible`);
    }
    return eligibleIds;
  }

  const db = createAdmin();

  const { data: groups } = await db
    .from("booking_groups")
    .select("id")
    .in("owner_payout_status", ["pending"])
    .order("created_at", { ascending: true });

  if (!groups) return eligibleIds;

  for (const group of groups) {
    const { data: reservations } = await db
      .from("reservations")
      .select("id, status")
      .eq("booking_group_id", group.id);

    if (!reservations || reservations.length === 0) continue;

    const allCompleted = reservations.every((r) => r.status === "completed");
    if (!allCompleted) continue;

    const reservationIds = reservations.map((r) => r.id);
    const { data: inspections } = await db
      .from("inspections")
      .select("reservation_id, result")
      .in("reservation_id", reservationIds);

    const allClean = inspections && inspections.length > 0 &&
      inspections.every((insp) => insp.result === "clean");
    if (!allClean) continue;

    const { count: openClaims } = await db
      .from("damage_claims")
      .select("*", { count: "exact", head: true })
      .in("reservation_id", reservationIds)
      .in("admin_decision", ["pending"]);

    if ((openClaims ?? 0) > 0) continue;

    const now = new Date().toISOString();
    await db
      .from("booking_groups")
      .update({ owner_payout_status: "eligible", owner_payout_eligible_at: now })
      .eq("id", group.id);

    await db
      .from("owner_payouts")
      .update({ status: "eligible" })
      .eq("booking_group_id", group.id)
      .eq("status", "pending");

    eligibleIds.push(group.id);
    log("payouts", "info", `Group ${group.id} marked eligible — all conditions met`);
  }

  return eligibleIds;
}

/* ------------------------------------------------------------------ */
/*  Release eligible payouts (settlement hold expired → Raenest call)  */
/* ------------------------------------------------------------------ */

export async function releaseEligiblePayouts(): Promise<string[]> {
  const releasedIds: string[] = [];

  if (!supabaseAdminConfigured) {
    const now = new Date();
    for (const record of mockPayoutLedger) {
      if (record.status !== "eligible") continue;
      const settlementHold = new Date(now);
      settlementHold.setDate(settlementHold.getDate() - PAYOUT_SETTLEMENT_BUSINESS_DAYS);
      if (new Date(record.createdAt) > settlementHold) continue;

      const ngnMinor = convertGbpToNgnMinor(record.ownerShareMinor);
      const fxRate = GBP_TO_NGN_RATE;

      if (!isFxWithinRange(fxRate, FX_EXPECTED_MIN, FX_EXPECTED_MAX)) {
        log("payouts", "warn", `FX rate ${fxRate} outside range [${FX_EXPECTED_MIN}, ${FX_EXPECTED_MAX}] for group ${record.bookingGroupId}`);
      }

      try {
        const idempotencyKey = `raenest-${record.bookingGroupId}-${record.id}`;
        const result = await createRaenestPayout({
          beneficiaryId: record.ownerId,
          amountNgnMinor: ngnMinor,
          reference: record.bookingGroupId,
          idempotencyKey,
        });

        record.status = "released";
        record.payoutNgnMinor = result.amountNgnMinor;
        record.fxRate = result.fxRate;
        record.raenestReference = result.payoutReference;
        record.releasedAt = now.toISOString();
        record.requestedAt = now.toISOString();
        releasedIds.push(record.bookingGroupId);

        if (result.status === "completed") {
          record.status = "paid";
          record.paidAt = now.toISOString();
        }

        log("payouts", "info", `Mock release — group ${record.bookingGroupId}, NGN ${ngnMinor / 100} @ ${fxRate}`);
      } catch {
        record.attempts++;
        record.lastError = "Raenest unavailable (mock)";
        record.nextAttemptAt = computeNextAttemptAt(record.attempts).toISOString();
        if (record.attempts >= MAX_PAYOUT_RETRY_ATTEMPTS) {
          record.status = "failed";
        }
      }
    }
    return releasedIds;
  }

  const db = createAdmin();
  const settlementDeadline = new Date();
  settlementDeadline.setDate(settlementDeadline.getDate() - PAYOUT_SETTLEMENT_BUSINESS_DAYS);

  const { data: eligibleGroups } = await db
    .from("booking_groups")
    .select("id, owner_payout_eligible_at, owner_payout_status")
    .eq("owner_payout_status", "eligible")
    .lte("owner_payout_eligible_at", settlementDeadline.toISOString());

  if (!eligibleGroups) return releasedIds;

  for (const group of eligibleGroups) {
    const { data: payouts } = await db
      .from("owner_payouts")
      .select("*")
      .eq("booking_group_id", group.id)
      .eq("status", "eligible");

    if (!payouts) continue;

    for (const payout of payouts) {
      if ((payout.attempts ?? 0) >= MAX_PAYOUT_RETRY_ATTEMPTS) {
        await db.from("owner_payouts")
          .update({ status: "failed", last_error: "Max retries exceeded" })
          .eq("id", payout.id);
        continue;
      }

      try {
        const ngnMinor = convertGbpToNgnMinor(payout.owner_share_minor, GBP_TO_NGN_RATE);

        if (!isFxWithinRange(GBP_TO_NGN_RATE, FX_EXPECTED_MIN, FX_EXPECTED_MAX)) {
          await db.from("payout_alerts").insert({
            severity: "high",
            kind: "fx_out_of_range",
            booking_group_id: group.id,
            owner_payout_id: payout.id,
            message: `GBP→NGN rate ${GBP_TO_NGN_RATE} outside range [${FX_EXPECTED_MIN}, ${FX_EXPECTED_MAX}]`,
          });
        }

        const idempotencyKey = `raenest-${group.id}-${payout.id}`;
        const result = await createRaenestPayout({
          beneficiaryId: payout.owner_id,
          amountNgnMinor: ngnMinor,
          reference: group.id,
          idempotencyKey,
        });

        const now = new Date().toISOString();
        const updateData: Record<string, unknown> = {
          status: result.status === "completed" ? "paid" : "released",
          payout_ngn_minor: result.amountNgnMinor,
          fx_rate: result.fxRate,
          raenest_reference: result.payoutReference,
          raenest_idempotency_key: idempotencyKey,
          requested_at: now,
          released_at: now,
        };
        if (result.status === "completed") updateData.paid_at = now;

        await db.from("owner_payouts").update(updateData).eq("id", payout.id);
        await db.from("booking_groups")
          .update({
            owner_payout_status: result.status === "completed" ? "paid" : "released",
            owner_payout_requested_at: now,
            owner_payout_reference: result.payoutReference,
            owner_payout_ngn_minor: result.amountNgnMinor,
            owner_payout_fx_rate: result.fxRate,
          })
          .eq("id", group.id);

        releasedIds.push(group.id);
        log("payouts", "info", `Released payout ${payout.id} for group ${group.id} — NGN ${ngnMinor / 100}`);

      } catch (err) {
        const errorMessage = err instanceof RaenestError ? `${err.kind}: ${err.message}` : String(err);

        await db.from("owner_payouts")
          .update({
            last_error: errorMessage,
            attempts: (payout.attempts ?? 0) + 1,
            next_attempt_at: computeNextAttemptAt((payout.attempts ?? 0) + 1).toISOString(),
          })
          .eq("id", payout.id);

        if (!(err instanceof RaenestError) || !err.retryable || (payout.attempts ?? 0) + 1 >= MAX_PAYOUT_RETRY_ATTEMPTS) {
          await db.from("owner_payouts")
            .update({ status: "failed", last_error: errorMessage })
            .eq("id", payout.id);
        }

        await db.from("payout_alerts").insert({
          severity: "high",
          kind: err instanceof RaenestError && err.kind === "bank_rejected" ? "bank_rejected" : "raenest_unavailable",
          booking_group_id: group.id,
          owner_payout_id: payout.id,
          message: errorMessage,
        });

        log("payouts", "error", `Payout ${payout.id} failed: ${errorMessage}`);
      }
    }
  }

  return releasedIds;
}

/* ------------------------------------------------------------------ */
/*  Poll released payouts for confirmation                             */
/* ------------------------------------------------------------------ */

export async function pollPendingPayouts(): Promise<number> {
  let confirmed = 0;

  if (!supabaseAdminConfigured) {
    for (const record of mockPayoutLedger) {
      if (record.status !== "released") continue;
      record.status = "paid";
      record.paidAt = new Date().toISOString();
      confirmed++;
    }
    return confirmed;
  }

  const db = createAdmin();
  const { data: released } = await db
    .from("owner_payouts")
    .select("*")
    .eq("status", "released");

  if (!released) return confirmed;

  for (const payout of released) {
    try {
      const result = await getRaenestPayoutStatus(payout.raenest_reference);

      if (result.status === "completed") {
        const now = new Date().toISOString();
        await db.from("owner_payouts")
          .update({ status: "paid", paid_at: now })
          .eq("id", payout.id);
        await db.from("booking_groups")
          .update({ owner_payout_status: "paid", owner_payout_date: now })
          .eq("id", payout.booking_group_id);
        confirmed++;
      } else if (result.status === "failed") {
        await db.from("owner_payouts")
          .update({ status: "failed", last_error: "Raenest reported payout as failed" })
          .eq("id", payout.id);
        await db.from("payout_alerts").insert({
          severity: "critical",
          kind: "payout_failed",
          booking_group_id: payout.booking_group_id,
          owner_payout_id: payout.id,
          message: `Raenest reported payout ${payout.raenest_reference} as failed`,
        });
      }
    } catch {
      await db.from("owner_payouts")
        .update({ attempts: (payout.attempts ?? 0) + 1, last_error: "Poll error" })
        .eq("id", payout.id);
    }
  }

  return confirmed;
}

/* ------------------------------------------------------------------ */
/*  Refund handler — reverse the split                                */
/* ------------------------------------------------------------------ */

export interface RefundSplitOpts {
  bookingGroupId: string;
  totalRefundedMinor: number;
  reason: string;
}

export async function recordRefundSplit(opts: RefundSplitOpts): Promise<void> {
  if (!supabaseAdminConfigured) {
    for (const record of mockPayoutLedger) {
      if (record.bookingGroupId !== opts.bookingGroupId) continue;
      if (opts.totalRefundedMinor >= record.ownerShareMinor) {
        record.status = "refunded";
      }
    }
    return;
  }

  const db = createAdmin();
  await db.from("booking_groups")
    .update({
      refunded_minor: opts.totalRefundedMinor,
      platform_payout_status: "failed",
      owner_payout_status: "refunded",
    })
    .eq("id", opts.bookingGroupId);

  await db.from("owner_payouts")
    .update({ status: "refunded" })
    .eq("booking_group_id", opts.bookingGroupId);
}

/* ------------------------------------------------------------------ */
/*  Commission summary                                                 */
/* ------------------------------------------------------------------ */

export interface CommissionSummary {
  daily: number;
  weekly: number;
  monthly: number;
  totalPayouts: number;
  totalPayoutAmountMinor: number;
}

export function getMockCommissionSummary(): CommissionSummary {
  const total = mockPayoutLedger.reduce((s, r) => s + r.ownerShareMinor, 0);
  return {
    daily: 0,
    weekly: 0,
    monthly: total,
    totalPayouts: mockPayoutLedger.length,
    totalPayoutAmountMinor: total,
  };
}

export async function getCommissionSummaryFromDB(): Promise<CommissionSummary> {
  if (!supabaseAdminConfigured) return getMockCommissionSummary();

  const db = createAdmin();
  const now = new Date();
  const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const w1 = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString();
  const m1 = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [{ data: daily }, { data: weekly }, { data: monthly }, { count: payouts }] = await Promise.all([
    db.from("booking_groups").select("commission_minor").gte("created_at", d1),
    db.from("booking_groups").select("commission_minor").gte("created_at", w1),
    db.from("booking_groups").select("commission_minor").gte("created_at", m1),
    db.from("owner_payouts").select("*", { count: "exact", head: true }),
  ]);

  const sum = (rows: { commission_minor: number }[] | null) =>
    (rows ?? []).reduce((s, r) => s + (r.commission_minor ?? 0), 0);

  return {
    daily: sum(daily),
    weekly: sum(weekly),
    monthly: sum(monthly),
    totalPayouts: payouts ?? 0,
    totalPayoutAmountMinor: (daily ?? []).reduce((s, r) => s + (r.commission_minor ?? 0), 0),
  };
}

export { createOwnerPayoutRows };
