/**
 * CheckinBliss booking rules — single source of truth.
 *
 * THE 14-DAY ADVANCE BOOKING RULE (documented in docs/booking-rules.md)
 * ---------------------------------------------------------------------
 * Bookings open **14 calendar days ahead**. A check-in is allowed only when
 * the number of full calendar days between *today* (in the platform's home
 * market timezone, Africa/Lagos) and the check-in date is **greater than or
 * equal to 14**.
 *
 * Boundary is explicit and unambiguous:
 *   diffDays  = check_in_date - today_date        (date-only, no time)
 *   allowed   = diffDays >= MIN_ADVANCE_DAYS      (i.e. 14)
 *   rejected  = diffDays <  MIN_ADVANCE_DAYS      (i.e. 1–13)
 *
 * Worked example — if today is 1 August:
 *   2 Aug  → diff 1  → NOT available
 *   5 Aug  → diff 4  → NOT available
 *   10 Aug → diff 9  → NOT available
 *   14 Aug → diff 13 → NOT available   (< 14)
 *   15 Aug → diff 14 → AVAILABLE       (>= 14)   ← earliest bookable day
 *   15 Sep → diff 45 → AVAILABLE
 *
 * This rule is enforced at EVERY boundary that can create a booking:
 *   1. Storefront search UI  (components/search-bar.tsx)  — date picker min
 *   2. Booking page UI       (app/book/[slug]/page.tsx)   — date picker min
 *   3. POST /api/bookings    (app/api/bookings/route.ts)  — server guard
 *   4. book_stays() SQL RPC  (supabase/migrations/0001_schema.sql) — DB guard
 * The server-side and DB-side guards are authoritative. UI guards are UX only.
 *
 * Timezone: "today" is always derived in Africa/Lagos (the market where every
 * CheckinBliss property sits). The rule is identical no matter which
 * timezone the server runs in.
 *
 * This module is pure — it must remain importable from both server and client
 * components (search bar, booking page, bookings route, and tests).
 */

/** Minimum number of full calendar days between today and check-in. */
export const MIN_ADVANCE_DAYS = 14;

/** Market timezone used to derive "today" for the rule. */
export const BOOKING_RULE_TIMEZONE = "Africa/Lagos";

export interface AdvanceRuleOptions {
  /** Reference clock. Defaults to now. Injectable for deterministic tests. */
  now?: Date;
  /** IANA timezone used to derive "today". Defaults to Africa/Lagos. */
  timeZone?: string;
}

/** Format a Date as YYYY-MM-DD in a given IANA timezone (date-only). */
export function dateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  // en-CA yields YYYY-MM-DD
  return parts;
}

/**
 * Number of full calendar days from "today" (in the market timezone) to the
 * given YYYY-MM-DD check-in date. Date-only arithmetic via UTC — immune to
 * DST and server-local clock skew.
 */
export function daysUntilCheckIn(
  checkIn: string,
  opts: AdvanceRuleOptions = {},
): number {
  const { now = new Date(), timeZone = BOOKING_RULE_TIMEZONE } = opts;
  const todayStr = dateInTimeZone(now, timeZone);
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const [cy, cm, cd] = checkIn.split("-").map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const targetUtc = Date.UTC(cy, cm - 1, cd);
  return Math.round((targetUtc - todayUtc) / (1000 * 60 * 60 * 24));
}

/**
 * Is booking open for the given check-in date?
 * Allowed when check-in is >= 14 full calendar days from today.
 */
export function isBookingOpen(checkIn: string, opts: AdvanceRuleOptions = {}): boolean {
  return daysUntilCheckIn(checkIn, opts) >= MIN_ADVANCE_DAYS;
}

/**
 * Returns the error code to reject a check-in, or null when it is allowed.
 * Prefer this over isBookingOpen at server boundaries so the caller can
 * return a machine-readable code.
 */
export function advanceRuleViolation(
  checkIn: string,
  opts: AdvanceRuleOptions = {},
): "ADVANCE_14_DAYS" | null {
  return isBookingOpen(checkIn, opts) ? null : "ADVANCE_14_DAYS";
}

/**
 * The earliest selectable check-in date (YYYY-MM-DD) for a date picker —
 * exactly today + 14 days in the market timezone.
 */
export function minCheckInDateStr(opts: AdvanceRuleOptions = {}): string {
  const { now = new Date(), timeZone = BOOKING_RULE_TIMEZONE } = opts;
  const todayStr = dateInTimeZone(now, timeZone);
  const [y, m, d] = todayStr.split("-").map(Number);
  const min = new Date(Date.UTC(y, m - 1, d + MIN_ADVANCE_DAYS));
  return min.toISOString().slice(0, 10);
}

/** Human-readable message for the 14-day rule, used at server boundaries. */
export const ADVANCE_RULE_MESSAGE = `Bookings open ${MIN_ADVANCE_DAYS}+ days ahead. Check-in must be at least ${MIN_ADVANCE_DAYS} calendar days from today (Africa/Lagos).`;
