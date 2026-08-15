# CheckinBliss — Build Progress Tracker

**Launch target:** 1 Sep 2026. Update this file after every completed feature.

## Build status: Launch-Critical Flow COMPLETE (mock-verified)

The core money-and-inventory flow is implemented, tested, and documented:

| Feature | Status | Evidence |
|---------|--------|----------|
| 14-day advance booking rule (single source of truth, 4 layers) | **Done** | `lib/booking-rules.ts`, `supabase/migrations/0015_booking_rules.sql`, `docs/booking-rules.md`, `tests/booking-rules.test.ts` (21 tests) |
| Atomic booking reserve (GiST EXCLUDE guard + mock lock) | **Done** | `app/api/bookings/route.ts` → `book_stays()`, `tests/booking-route.test.ts` (7 tests incl. duplicate-submit + simultaneous race) |
| Payment flow (charge + deposit hold) | **Done** | `lib/stripe.ts` (mock ledger), `tests/stripe-events.test.ts`, `tests/booking-route.test.ts` |
| **Payment reconciliation** (paid-but-unconfirmed recovery + orphan refund) | **Done** | `lib/reconciliation.ts`, `app/api/cron/reconcile/route.ts`, `supabase/migrations/0016_reconciliation.sql`, `docs/payment-reconciliation.md`, `tests/reconciliation.test.ts` (14 tests) |
| Property pages (images, description, amenities, room types, pricing, availability CTA, nearby info, verification info, policies, cancellation) | **Done** | `app/[city]/[neighbourhood]/[building]/[property]/property-client.tsx` — "Verified by us" panel, structured `room_types` in configuration modal; `tests/property-page-data.test.ts` (5 tests); `SeedProperty` extended with `room_types[]` and `verification` in `lib/seed-data.ts` |
| WhatsApp owner/operator bot (8 templates, strict parsing, webhook security) | Done (audit) | `lib/whatsapp.ts`, `app/api/webhooks/whatsapp/route.ts`, `tests/whatsapp.test.ts`, `tests/whatsapp-webhook.test.ts` |
| Dashboards (admin / operator Lagos+Abuja / owner) | **Done** | `app/admin/*`, `app/dashboard/operator/*` (gated by `checkOperatorGate`), `app/dashboard/owner/*` (gated by new `checkOwnerGate`) |
| Customer account (register → verify → login → bookings persist) | **Done** | `/account/*` server components → `getGuestBookingsFromDB()`; mock allowlist now includes `guest@checkbliss.com`; `updateProfileAction` + `requestPasswordResetAction` (Zod-validated); `/forgot-password` page; all `/account/*` routes redirect to `/login` when not signed in |
| Owner LINK proof-of-ownership + cross-owner security tests | **Not started** | `lib/whatsapp.ts` parses `LINK`; authz not verified end-to-end |

## Verification gates (must stay green)

| Command | Last run | Result |
|---------|----------|--------|
| `npm test` | 2026-08-14 | 21 files, **287 tests passing** |
| `npm run typecheck` | 2026-08-14 | clean |
| `npm run lint` | 2026-08-14 | 20 pre-existing errors (unrelated files); new code clean |

## Recently completed

### vercel-cdn-debugger skill installed (2026-08-15)
- Installed the Vercel CDN/deployment debugger as a loadable project skill: `.agents/skills/vercel-cdn-debugger/SKILL.md` (source: `.context/features/vercel_debug.md`).
- Workflow: establish what "broken" looks like → mandatory incognito cold-load production test (disambiguates dev-only Turbopack CSS-chunk lag from real prod bugs) → structured CDN causes (deployment alias mismatch, stale edge cache mid-propagation, asset-hash 404s, ISR/data-cache staleness, duplicate `globals.css` imports causing async chunk splitting) → redeploy + re-test confirmation. Explicitly forbids CDN-side fixes without the Step 2 incognito test and forbids broad cache disabling.
- Registered in `AGENTS.md` Project Skills table.

### Timezone-stable seed data — property "Inspected on" date (2026-08-15)
- **SSR content bug (root cause):** `lib/seed-data.ts` `defaultVerification()` built the inspection date via `new Date(2026, 5, 14 - (idx % 12))` — a **local-time** constructor — then serialized with `.toISOString()` (UTC). The calendar date therefore shifted by one day with the deployment server's timezone (reproduced via SSR sweep: UTC → "Inspected on 13 June 2026", Pacific/Auckland → "12 June 2026" on every property page's "Verified by us" panel). Same-page cached/SEO content was non-deterministic across environments.
- **Fix:** construct with `new Date(Date.UTC(2026, 5, 14 - (idx % 12)))`. `inspected_on` is now identical on every server timezone. `formatInspectionDate()` in `property-client.tsx` already parsed ISO components directly (timezone-safe).
- **Same-class audit:** `lib/booking-rules.ts` `minCheckInDateStr()` already uses `Date.UTC`; `lib/crm-admin.ts` date-rollover math is server-only analytics (no hydration surface). No other local-time constructor feeds SSR-rendered content.
- **SSR verification method (repeatable):** dev server run twice with `TZ=UTC` and `TZ=Pacific/Auckland`, SSR HTML captured for all public routes (/, /search, /lagos, /login, /signup, /forgot-password, /list-property, /stays/[slug], /book/[slug], property pages), normalized (RSC flight payloads + build IDs stripped) and diffed. All routes byte-identical; only the property page differed, now fixed. Dashboard routes need a mock session cookie and were covered by the earlier Playwright sweeps.

### Owner dashboard calendar hydration fix (2026-08-15)
- **Calendar `month`/`year` hydration bug (same class as the greeting fix):** `app/dashboard/owner/client.tsx` created `month`/`year` via `useState(() => new Date().getMonth())` / `getFullYear()` — the initializers ran at SSR (server timezone) and again at hydration (client timezone). `/dashboard/owner/bookings` deep-links to `initialTab="bookings"`, so the calendar grid is SSR-rendered; whenever server/client month buckets differed (month or year boundary straddle), the whole grid mismatched on hydration. Fixed with the repo's established deferral pattern: `month`/`year` now start `null` and are set in the same ref-guarded post-mount effect as `today`; `calendar`, `monthLabel()`, and the nav handlers (`shiftMonth(delta)`) handle the null-before-mount state. SSR HTML and first client render now agree (empty grid), then the real local month/year is applied after mount.
- **Same-class audit:** `components/admin/bookings-view.tsx` (dead code, not imported) still uses the old initializer — flagged, not changed. `components/hero-search.tsx` (`viewDate`/`minDate` render only after the calendar opens, not SSR), `app/dashboard/operator/client.tsx` (`today.toISOString()` UTC-based), `app/account/guest-client.tsx` (`toISOString()` UTC-based), and the admin CRM analytics/claims pages (server components, no hydration) are all timezone-immune or server-only. No further changes needed.
- **Verification:** 287 tests, typecheck, lint (no new issues), production build all green.

### Owner dashboard hydration fix + mock-mode login tooling (2026-08-14)
- **Owner greeting hydration bug (root cause):** `app/dashboard/owner/client.tsx` created `today` via `useState(() => new Date())` — the initializer ran at SSR (server timezone) and again at hydration (client timezone). The hour-driven greeting ("Good morning/afternoon/evening") therefore mismatched whenever the server/client hour buckets differed (reproduced: server Europe/London 16:30 vs client Pacific/Auckland 03:30). Fixed with the repo's established deferral pattern (commit 11a38a4): `today` now starts `null`, is set in a ref-guarded `useEffect` post-mount, and the greeting + calendar `isToday` handle `null` before mount. SSR HTML and first client render now agree; the real local time is applied after hydration.
- **Same-class audit:** `components/admin/bookings-view.tsx` (dead code, not imported) and `app/dashboard/operator/client.tsx` (`today.toISOString()` — UTC-based, timezone-immune) checked; `components/hero-search.tsx` `viewDate`/`minDate` only render after the calendar opens (not SSR). No further changes needed.
- **`data-scroll-behavior="smooth"`** added to `<html>` in `app/layout.tsx` — silences the Next.js `missing-data-scroll-behavior` dev warning raised by `html { scroll-behavior: smooth }` (`app/landing.css`) with `experimental.scrollRestoration` enabled.
- **Verification:** Playwright sweeps (direct loads + client navigation, en-GB locale, Africa/Lagos / Europe/London / Pacific/Auckland timezones) all clean except benign mapbox WebGL GPU-stall noise on `/search`; production sweep on `checkbliss-gamma.vercel.app` clean. 287 tests, typecheck, build green.
- **Tooling note:** a full `.env` (Supabase + Stripe + WhatsApp) forces real mode locally, so mock login silently fails — the repo's own Phase 7 item (`country_of_residence` schema cache drift). Run `env NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= SUPABASE_SECRET_KEY= npm run dev` to force mock mode for dashboard testing.

### Customer account + search filters + dashboards (2026-08-14)
- **Customer account:** `guest@checkbliss.com` added to mock allowlist (mock login → `/account`); all `/account/*` server components redirect to `/login` when unauthenticated; bookings wired to `reservations` via `getGuestBookingsFromDB()` filtered by `guest_email`, with mock fallback for the seeded guest; upcoming vs. past split derived from `check_out >= today`. New actions: `updateProfileAction` (Zod-validated `full_name`/`phone`), `requestPasswordResetAction` (calls `supabase.auth.resetPasswordForEmail` in real mode, returns neutral success in mock). New page `/forgot-password`. Settings form posts to `updateProfileAction` and surfaces saved/error state.
- **Search:** `guests` and `rooms` (bedrooms) added to `SearchOpts` and applied in both mock and Supabase paths; `SearchBar` has a Bedrooms stepper; chips for `N guests` / `N+ bedrooms` shown next to the sort control; `app/search/loading.tsx` skeleton added for the `force-dynamic` route. New `tests/search-filters.test.ts` (6 tests).
- **Dashboards:** new `lib/owner-gate.ts` mirroring `operator-gate.ts`; both `/dashboard/owner/layout.tsx` and `/dashboard/operator/layout.tsx` now redirect non-owners/operators to `/login?next=...`. Admin gate already covered the whole `/admin` tree.

### Payment reconciliation (2026-08-14)
- Policy: succeeded booking-charge intents → group confirmed = `ok`; group pending = **recover** (mirror webhook: confirm reservations + group, schedule inspection, notify owner); no group = **refund**. Holds and non-booking intents = skip.
- Cron `GET /api/cron/reconcile` (CRON_SECRET + hourly idempotency) now calls `reconcilePaymentIntents()`; mock mode demonstrates the full story via the in-memory intent ledger.
- Migration 0016 also creates `inspection_schedule` + `reservations.payment_intent_id` — real-mode drift the Stripe webhook already depended on.

### 14-day advance rule (2026-08-14)
- Boundary: check-in ≥ 14 full calendar days from today in Africa/Lagos. 13 days → rejected; 14 → earliest bookable.
- Enforced at: search bar, booking page, `POST /api/bookings` (422 `ADVANCE_14_DAYS`), `book_stays()` RPC (DB).

## Next up (ordered)
1. Phase 6 — WhatsApp: owner LINK proof-of-ownership flow + owner-A-cannot-act-on-owner-B tests + owner notify number fix.
2. Phase 7 — real-mode fixes: operators refs, assigned_cities, country_of_residence, booking reference.
3. Phase 8 — final doc pass.
