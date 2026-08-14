# The 14-Day Advance Booking Rule

**Status:** Live invariant · **Owner:** Platform rules
**App code:** `lib/booking-rules.ts` (single source of truth) · **DB guard:** `book_stays()` in `supabase/migrations/0001_schema.sql`

## The rule

Bookings open **14 calendar days ahead**. A check-in date is allowed only when the number of full calendar days between **today** (in the platform's home market timezone, Africa/Lagos) and the check-in date is **greater than or equal to 14**.

```
diffDays  = check_in_date - today_date        (date-only, no time of day)
allowed   = diffDays >= 14
rejected  = diffDays <  14
```

### The boundary, made unambiguous

| If today is 1 Aug | Check-in | diffDays | Bookable? |
|-------------------|----------|----------|-----------|
|                   | 2 Aug    | 1        | No        |
|                   | 5 Aug    | 4        | No        |
|                   | 10 Aug   | 9        | No        |
|                   | 14 Aug   | 13       | **No** (< 14) |
|                   | **15 Aug** | **14** | **Yes — earliest bookable day** |
|                   | 15 Sep   | 45       | Yes       |

- **13 days ahead → rejected.** **14 days ahead → the earliest bookable day.** There is no "14-day window" reading; 14 full days must separate today from check-in.

## Why the timezone matters

"Today" is always derived in **Africa/Lagos** — the market where every CheckinBliss property sits — not the server's or the customer's local zone. `daysUntilCheckIn()` builds date-only values via `Date.UTC`, so the arithmetic is immune to DST and server-local clock skew. Example: at `2026-08-14T23:30:00Z` it is already 15 August in Lagos, so a `2026-08-28` check-in is 13 days ahead (rejected), even though UTC still calls it the 14th.

## Where it is enforced (all four layers)

| # | Layer | File | Role |
|---|-------|------|------|
| 1 | Search UI date picker `min` | `components/search-bar.tsx` | UX only |
| 2 | Booking page date picker `min` | `app/book/[slug]/page.tsx` | UX only |
| 3 | **Server guard** | `app/api/bookings/route.ts` (`advanceRuleViolation`) | **Authoritative (app)** — returns `422 { code: "ADVANCE_14_DAYS" }` |
| 4 | **Database guard** | `book_stays()` RPC, `supabase/migrations/0001_schema.sql` | **Authoritative (DB)** — raises `ADVANCE_14_DAYS`, transaction rolls back |

All four derive from the same constant, `MIN_ADVANCE_DAYS = 14` in `lib/booking-rules.ts`. **Never hardcode `14` in app code, SQL, or tests** — import the constant.

## Tests

`tests/booking-rules.test.ts` covers the boundary matrix (1, 3, 7, 13, 14, 15, 30, 60 days), month/year rollovers, past dates, timezone determinism (Lagos vs UTC vs server zone), and the `minCheckInDateStr === today + 14` invariant. Run with `npm test`.

## Do not

- Do not change the boundary semantics (`<14` rejects) without updating this doc, the SQL comment, and the tests together.
- Do not enforce the rule only in the UI — the server guard and `book_stays()` are the real gate.
- Do not use `new Date(checkIn) - new Date()` in new code; use `daysUntilCheckIn()`.
