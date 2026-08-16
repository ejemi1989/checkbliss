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
| `npm test` | 2026-08-16 | 22 files, **292 tests passing** |
| `npm run typecheck` | 2026-08-16 | clean |
| `npm run lint` | 2026-08-16 | 23 pre-existing errors (unrelated files); new code clean |

## Recently completed

### Implemented: suppress-expected-hydration-mismatches pattern (2026-08-16)
- Audited the codebase against `.context/features/rendering.md` (suppressHydrationWarning only for *expected* server/client render differences — random IDs, dates, locale/timezone formatting — never to hide real bugs, never overused).
- **Verdict: pattern already correctly applied at every legitimate site.** Verified inventory:
  - `app/book/[slug]/client.tsx:578,583` — `formatCheckinDate()` locale-formatted dates (only rendered after user picks dates).
  - `components/admin/bookings-view.tsx:47` — `monthLabel()` uses `toLocaleString("default", ...)`; locale differs between Node ICU and browser.
  - `components/notification-bell.tsx:84`, `components/notifications-view.tsx:76` — `toLocaleDateString("en-GB", ...)` timestamps.
  - `app/admin/crm/analytics/page.tsx:11` — chart axis label (`toLocaleDateString`).
  - `app/layout.tsx:55,57` — `<html>/<body>` (extension/theme-attribute tolerance).
- **Correctly left alone (would be overuse):** `guest-client.tsx` `today` (filter-only, never rendered), `verification-client.tsx` `now` (handler computation only), hero-search date labels (user-interaction gated, no hydration), admin CRM audit/inbox pages (server components — no hydration), `Math.round(...).toLocaleString` number formatting (stable across ICU).
- The month-boundary *state* bug class (owner dashboard calendar) was already fixed properly in `a3ec233` by deferring "now"-derived state to post-mount rather than suppressing.

### First-paint flash fix — inline critical CSS (2026-08-16)
- Reported "hydration issues / page flashes then fixes" on `/book/lagoon-view-loft`. **Investigation (nextjs-first-render-debugger):** no hydration mismatch exists — `app/book/[slug]/client.tsx` renders deterministically (no window/Date/random at render time); verified clean in Chromium on both aliases, desktop+mobile, direct load, `?step` variants, and client navigation (only DOM delta was Stripe's hidden metrics iframe).
- **Root cause:** the HTML shipped **zero inline critical CSS** — styling came entirely from 2 render-blocking external stylesheet requests. On first-time/slow/cold-cache loads the browser paints before (or waits on) those requests, producing a visible "flash then fix" (FOUC-style). Skeleton during client nav is <16 ms locally, not the culprit.
- **Fix:** enabled `experimental.inlineCss: true` in `next.config.ts` (documented in Next 16 `inlineCss.md`, recommended for Tailwind atomic CSS). Verified in local production build: book-page HTML now contains a single 88 KB inline `<style>` block and **zero** stylesheet `<link>` tags; page renders styled with correct bg/fonts and no JS errors.
- **Verification:** 292 tests pass, typecheck clean, lint clean for touched file.

### frontend-patterns skill installed (2026-08-15)
- Installed the frontend development patterns skill: `.agents/skills/frontend-patterns/SKILL.md` (source: `.context/features/frontend-patterns.md`).
- Covers: component patterns (composition, compound components, render props), custom hooks (useToggle, referentially-stable `useQuery` with refs to avoid infinite fetch loops, useDebounce), state management (Context + useReducer), performance (memoization with copy-before-sort, `React.memo`, lazy/Suspense code splitting, TanStack virtualizer), controlled forms with validation, ErrorBoundary class pattern, Framer Motion list/modal animations, and accessibility (keyboard navigation, focus management).
- Includes privacy/data-boundary rules: synthetic data in examples, no tracking/analytics without approval, least-privilege APIs, server-side validation at every boundary.
- Registered in `AGENTS.md` Project Skills table.

### nextjs-first-render-debugger skill installed (2026-08-15)
- Installed the professional first-render/hydration incident-resolution skill: `.agents/skills/nextjs-first-render-debugger/SKILL.md` (source: `.context/features/nextjs-first-render-debugger.md`).
- 31-section workflow: Incident Definition → required investigation model → evidence-first → reproduce → differentiate **server vs client** → hydration investigation → server/client component boundary → loading-state → auth/session timing → CSS → Tailwind → font → image → data-fetching → cache → middleware → effects → race conditions → console classification (incl. treating `ERR_BLOCKED_BY_CLIENT` as likely extension noise) → accessibility → production reproduction → fix principles → `suppressHydrationWarning` rule → validation protocol → visual regression verification → root-cause confidence (HIGH/MEDIUM/LOW) → failure recovery → git safety → Definition of Done → required incident report.
- Core principle: ask *"why did the app render state A initially and state B after hydration/refresh?"* and prove the answer before changing CSS. Bans fake fixes (setTimeout, reload, `"use client"` everywhere, `suppressHydrationWarning`, `no-store` everywhere) without evidence.
- Registered in `AGENTS.md` Project Skills table.

### nextjs-issue-resolver skill installed (2026-08-15)
- Installed the autonomous Next.js debugging/repair skill: `.agents/skills/nextjs-issue-resolver/SKILL.md` (source: `.context/features/nextjs_resolve.md`).
- 41-section workflow: FIND → REPRODUCE → TRACE → ROOT CAUSE → FIX → VALIDATE → REGRESSION. Covers hydration, server/client boundaries, async data, auth, routing, CSS/FOUC, images/fonts, API, DB, env vars, caching, build/TS failures, race conditions, third-party integrations (incl. distinguishing ad-blocker `ERR_BLOCKED_BY_CLIENT` from app bugs), console classification, accessibility, performance, security (never expose secrets), controlled experiments, and a strict Definition of Done + root-cause report format. Explicitly bans fake fixes (setTimeout hacks, `any`, "use client" everywhere, disabling hydration/TS/ESLint).
- Registered in `AGENTS.md` Project Skills table.

### Server-side GA4 page-view tracking (2026-08-15)
- The app previously had **no analytics code at all** — a `GET /mp/collect` error seen in the browser was traced to a third-party/browser-side GA4 implementation (not CheckinBliss; that endpoint only accepts POST, and its `api_secret` was exposed in the URL — rotated advice given).
- **Implementation (Measurement Protocol, server-only secret):** `lib/analytics.ts` (`sendPageView()`, reads `GA_MEASUREMENT_ID`/`GA_API_SECRET` lazily, no-op in mock mode) → `app/api/analytics/page-view/route.ts` (Zod-validated POST, max lengths) → `components/analytics/page-view-tracker.tsx` (client component, fires once per route incl. query params, persists `ga_client_id` in `localStorage`, `crypto.randomUUID()` session, `keepalive`). Mounted in root layout inside `<Suspense fallback={null}>` — the `useSearchParams()` CSR bailout otherwise broke static prerender of `/dashboard/operator`.
- **Security:** `GA_API_SECRET` lives only in the server env (`lib/analytics.ts` is `server-only`); the browser only ever talks to our route.
- **Verification:** 292 tests (5 new in `tests/analytics.test.ts` — no-op mock mode, correct MP POST shape, route 200/400/non-JSON), typecheck, lint (0 new), production build green.

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
