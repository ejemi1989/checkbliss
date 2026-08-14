-- 0015_booking_rules.sql
-- The 14-day advance booking rule — single source of truth.
--
-- Bookings open 14 calendar days ahead (check-in >= today + 14 days, in the
-- Africa/Lagos market timezone). The DB guard below is the authoritative
-- last line of defence; app-level guards in lib/booking-rules.ts mirror it.
--
-- Docs: docs/booking-rules.md

comment on function public.book_stays is
  'Atomic stay-booking RPC. Enforces the 14-day advance rule (ADVANCE_14_DAYS):
   check-in must be at least 14 full calendar days from today (Africa/Lagos);
   overlaps raise DATES_UNAVAILABLE and roll back. The GiST EXCLUDE constraint
   on reservations is the double-booking guard — application availability
   checks are UX, never the guard.';
