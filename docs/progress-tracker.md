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
| Owner LINK proof-of-ownership + cross-owner security | **Done** | `lib/whatsapp.ts` parses `LINK <unit>`; `handleOwner()` verifies the unit is owned by the sender; HELP updated; cross-owner tests cover BLOCK/UNBLOCK/AVAILABILITY/LINK |

## Verification gates (must stay green)

| Command | Last run | Result |
|---------|----------|--------|
| `npm test` | 2026-09-07 | 25 files, **345 tests passing** |
| `npm run typecheck` | 2026-09-07 | clean |
| `npm run lint` | 2026-09-07 | 20 pre-existing errors (unrelated files); new code clean |
| `npm run build` | 2026-09-07 | compiled, 65/65 static pages |

## Recently completed

### Global CSS Scoping & Layout Shift Resolution Across All Routes (2026-09-08)
- **Root Cause & Symptoms Fixed:** Resolved hydration and first-render/navigation layout shifts (FOUC) where pages like `/book/[slug]` rendered unstyled, stretched, or misaligned on initial client-side entry (Image 1 in user reports) but appeared properly styled on hard refresh (Image 2).
- **CSS Isolation Architecture:** In Next.js App Router, legacy custom stylesheets (`app/landing.css`, `app/styles/main.css`, `app/styles/listings.css`, `app/styles/property.css`) injected into DOM `<head>` by client components or nested layouts persist across SPA navigation (`Link` / `router.push`). Un-scoped `:root` variable overrides, font-family declarations, and global element resets (`*`, `html`, `body`, `a`, `img`) in those legacy files were leaking onto subsequent routes, overriding Tailwind CSS v4 `@theme` tokens and utility classes (`max-w-[1240px]`, `mx-auto`, `px-8`, `grid-cols-[1fr_400px]`, etc.).
- **Scoped Stylesheets:**
  - `app/landing.css`: Scoped `:root` variables and resets under `.landing-page` container.
  - `app/landing-client.tsx`: Wrapped homepage root with `className="landing-page"`.
  - `app/styles/main.css`: Scoped `:root` variables, `img`, and `a` resets under `.lst-body, .prop-body`.
  - `app/styles/listings.css`: Scoped `:root` variables under `.lst-body`.
  - `app/styles/property.css`: Scoped `:root` variables and media query root variables under `.prop-body`.
- **Verification:** `npm run typecheck` clean, `npm test` 25 test files / 345 tests passing, `npm run build` compiled 65/65 static pages with 0 warnings.

### First-render font hydration & search layout CSS pollution fix (2026-09-08)
- **Search page global CSS bleeding fix**: Scoped `.search`, `.field`, and `.search-btn` rules in `app/landing.css` (to `.search-wrap`) and `app/styles/main.css` (to `.hero`), and removed un-scoped global resets (`* { margin: 0; padding: 0 }`, `body { font-size: 20px; background: #E9ECE2 }`). Previously, navigating from the homepage or listing pages to `/search` left `landing.css` / `main.css` in the DOM `<head>`, causing global resets and square-edge `.search` styles to override `/search`'s Tailwind v4 layout (Image 1 vs Image 2).
- **Font display setting (`display: "swap"`)**: Updated `Inter`, `Playfair_Display`, `Newsreader`, and `Hanken_Grotesk` in `app/layout.tsx` from `display: "optional"` to `display: "swap"`. `optional` was instructing browsers to permanently fall back to basic unstyled system fonts whenever Google Fonts took >100ms on first load, only applying custom fonts after hard refresh. `swap` guarantees custom typography renders consistently on first entry while swapping smoothly.
- **Turbopack workspace root configuration**: Added `turbopack: { root: path.resolve(__dirname) }` in `next.config.ts`. Eliminates the Next.js workspace root inference warning caused by parent `pnpm-lock.yaml`, ensuring PostCSS, Tailwind CSS `@theme` tokens, and CSS layout assets resolve correctly on first route compile.
- **Login panel responsive utilities**: Refactored `app/login/page.tsx` responsive image panel to use native Tailwind utility classes (`hidden lg:block`, `block lg:hidden`), removing inline media query style tag injection.
- **Verification**: `npm run typecheck` clean, `npm test` 25 files / 345 tests passing, `npm run build` compiled 65/65 static pages with 0 warnings.
- **Owner LINK command implemented** (user-confirmed: simple verify, not a token flow). `lib/whatsapp.ts` `OwnerCommand` gains `{ kind: "LINK"; unit: string }`; `parseOwnerCommand()` handles `LINK <unit>` (with `LINK` alone returning `INCOMPLETE` with usage). The `HELP` text now lists `LINK <unit>`.
- **Webhook handler:** `app/api/webhooks/whatsapp/route.ts` `handleOwner()` adds a `LINK` case — resolves the unit via the same `findOwnedProperty(db, profile.id, unit)` used by BLOCK/UNBLOCK/AVAILABILITY, so **the sender's `owner_id` scoping is shared**. Owned → "✓ Ownership verified — `<name>` is linked to your account."; not owned / not found → rejection copy. Every other command already authed against the same `findOwnedProperty`, so cross-owner isolation is now exercised explicitly.
- **Owner notify number fix:** both booking-confirmation notify paths (`app/api/webhooks/stripe/route.ts` + `lib/reconciliation.ts`) already guarded against a missing `whatsapp_e164` but silently skipped; they now emit a `warn` log (`Owner <id> has no WhatsApp number — booking notification skipped`) so a notify that didn't happen is observable instead of the misleading "owner notified" success log.
- **Tests:** added to `tests/whatsapp-webhook.test.ts` — 4 parser tests (`LINK` parse, whitespace, `LINK` alone → INCOMPLETE, case-insensitive), 6 LINK command tests (owned/webhook-level: OWNER can LINK own, reject unowned, reject nonexistent, `LINK` alone → help, Sheena can LINK own, Sheena rejected on Owner A's), and an explicit **cross-owner security suite** (11 tests): Owner A cannot BLOCK/UNBLOCK/AVAILABILITY/LINK Owner B's property and vice-versa, and both owners can manage their own properties across all four commands. **Total: 25 files, 345 tests passing** (was 25/324). Typecheck clean, lint unchanged (20 pre-existing errors in unrelated files), build green.

### Live schema parity — 0003–0018 merge + `properties.name` → `branded_name` (2026-09-07)
- **Live Supabase audit** (`docs/supabase-audit-2026-07-12.md` basis): the deployed project (`ejwurxnkcxpenmhbqwdi`) sat at migrations **0001+0002 only** — no `/rpc/book_stays`, `/rpc/search_properties`, `/rpc/auth_role`, `/rpc/has_city_access`; still had `properties.name` and `deposit_holds.airwallex_authorisation_id`. Storefront + booking + dashboard real-mode paths would fail.
- **Decision (user-confirmed):** DB = migration source of truth. Applied `0003`–`0018` in full (excluding `0010` demo-user seeding) via a single idempotent merge script for the Supabase SQL editor; 0001's `book_stays()` is recreated in the merge reading `v_property.branded_name` + writing `booking_groups.reference` (0018), and 0005's `search_properties` is extended to the 5-arg signature the app already calls (`p_where, p_in, p_out, p_guests, p_rooms`).
- **Repo migrations kept coherent:** `0004_seo_naming.sql` now also recreates `book_stays()` post-rename; `0005_search.sql` now defines the 5-arg `search_properties` — a fresh 0001→0018 chain stays consistent.
- **Code patched to `branded_name`** (real mode): `lib/data-server.ts` (8 selects + 8 mappings incl. payouts/commission/trace), `lib/data-guest.ts`, `lib/crm-admin.ts`, `lib/reconciliation.ts`, `app/api/webhooks/stripe/route.ts` + `whatsapp/route.ts` (incl. `findOwnedProperty` ilike + BOOKINGS list), `app/api/bookings/route.ts` (propsById fetch), `actions/properties.ts` (insert + update now write `branded_name`). Storefront `app/api/properties/route.ts` already selected `branded_name`.
- **Known pre-existing drift (flagged, out of scope):** `data-server.ts` reads `reservations.nights` (no such column — falls back to mock) and `deposit_holds.amount_minor` (column is `hold_amount_minor` — falls back to mock).
- **Verification:** `npm test` 25 files / 324 tests, typecheck clean, `npm run build` green. Lint unchanged (20 pre-existing errors in unrelated files).

### Phase 7 schema drift — operators, country_of_residence, booking reference (2026-09-07)
- **Migration `0018_phase7_schema.sql`** closes three real-mode gaps the app code already assumed:
  1. `operators` table (id, profile_id, name, email, `assigned_cities text[]`, status, quality_score, inspections_done, verified_count, properties_count) matching the shape read in `actions/operators.ts` (5 sites) + `app/api/admin/operators/route.ts`. `operator_assignments` remains the per-city RLS source of truth.
  2. `profiles.country_of_residence text` — written by `actions/auth.ts` on signup + first-session auto-upsert (3 sites).
  3. `booking_groups.reference text` + partial unique index (`booking_groups_reference_uidx`) — read by `app/api/bookings/[reference]/route.ts` lookup.
- **`book_stays()` RPC rewritten** (in `0001_schema.sql`): now takes `p_reference text` + `p_currency char(3)`, inserts the `booking_groups` row (with `reference`, charge/deposit totals, `pending`) **inside the same transaction** as the reservation inserts — the group and its reservations are now atomic. Route no longer needs a separate group insert.
- **`app/api/bookings/route.ts`**: passes `p_reference`/`p_currency` to the RPC; the post-charge `booking_groups` write changed from `.insert()` to `.upsert({ onConflict: "id" })` (fill in charge intents / status after the RPC already created the row).
- **Fixture cleanup**: all booking references in `lib/data.ts` + `lib/seed-data.ts` migrated from `PAY-2026-MMDD` / `DEPT-*` mock formats to the real 8-char base32 charset (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`). Deposit-hold `DEPT-*` and refund `B001` refs intentionally kept — they are not booking references.
- **Verification:** new `tests/reference-format.test.ts` — 9 tests: mock booking response is 8-char base32, charset excludes lookalikes (I/O/0/1), claim/reconciliation-charge/finance-payment fixture refs all match, RPC call passes `p_reference`/`p_currency`, route uses upsert, migration 0018 provides all three pieces. **Total: 25 files, 324 tests passing** (was 24/315). Typecheck clean, build green.

### Fincra beneficiary + payout-name fixes (2026-09-06)
- `lib/fincra.ts:createFincraBeneficiary` hard-coded `address.state: "Lagos"` (wrong for any non-Lagos owner) and sent only `country + state` in the address object. Currency was already correctly `NGN` (the earlier note was stale).
- **Fix:** `FincraBeneficiaryCreateInput` and `FincraBeneficiaryRecord` now accept optional `currency`, `addressState/City/Street/Zip`, and `uniqueIdentifier` — the address object is built dynamically and `state` is no longer hard-coded. `currency` defaults to `"NGN"`. Mock and real-mode paths both store these fields; the real-mode response mapping reads them back from `data.address`.
- `lib/payouts.ts:splitAccountHolderName(fullName)` pure helper splits a full name into `{ firstName, lastName? }` (whitespace-collapsed, single-word names yield `lastName: undefined`). Used in `releaseEligiblePayouts` so the `beneficiary` object sent to Fincra's `/disbursements/payouts` now includes `lastName` when present (Fincra docs list it as part of the payout beneficiary shape).
- **Verification:** new `tests/fincra-beneficiary.test.ts` — 11 tests: NGN default, caller-supplied currency, address fields, "no hard-coded Lagos" assertion, `uniqueIdentifier`, mock-mode idempotency, and `splitAccountHolderName` (2-word, 3-word, single-word, extra-whitespace, empty-string). **Total: 24 files, 315 tests passing** (was 23/304).

### Fincra webhook signature — fix per Fincra docs (2026-09-06)
- `lib/fincra.ts:verifyFincraWebhookSignature` was HMACing the raw request body, but Fincra's docs ([`validating-webhook`](https://docs.fincra.com/docs/validating-webhook)) explicitly state the payload must be "encrypted and unmodified as received" — they sign the compact JSON of the parsed `{event, data}` object. **Every real webhook would have failed signature verification (401), so no payout would ever be marked `paid` via the webhook** — only the polling path would confirm them.
- **Fix:** `verifyFincraWebhookSignature` now takes the **parsed event** instead of the raw body. `compactJson()` re-serialises via `JSON.stringify` (no whitespace, default separators), matching Fincra's Python example using `json.dumps(payload, separators=(',', ':'))`. New `computeFincraWebhookSignature` export for tests + future replay tooling. Webhook route parses first, then verifies on the parsed object, then re-validates the schema with Zod (so a syntactically-valid-but-schema-bad payload still 400s, not 401).
- **Verification:** new `tests/fincra-webhook-signature.test.ts` — 10 tests: positive match, whitespace-tolerant match, tamper-detection, missing/empty/wrong-length signature, wrong-secret rejection, round-trip via `parseFincraWebhookEvent`, and event-field mutation detection. **Total: 23 files, 304 tests passing** (was 22/294).

### FX guard alert dedup (2026-09-06)
- `lib/payouts.ts` `releaseEligiblePayouts` was emitting a fresh `fx_out_of_range` and `invalid_beneficiary` alert on every cron pass while the condition persisted — within 24h this could pile up dozens of identical rows per group.
- **Fix:** new internal helper `hasRecentAlert(db, bookingGroupId, kind, windowMs)` checks for any un-dedup'd alert matching `(booking_group_id, kind)` within `ALERT_DEDUP_WINDOW_MS` (24h). Both FX-guard inserts now skip when one is already present. New constant test confirms the 24h window.

### Bank-details re-registration idempotency (2026-09-06)
- `actions/owner-payout-details.ts:saveOwnerPayoutDetails` was calling `createFincraBeneficiary` on every save and overwriting `fincra_beneficiary_id`, orphaning the prior Fincra-side beneficiary.
- **Fix:** fetch the existing `owner_payout_details` row first; compare bank name / code / account number / account name / tax id; if all unchanged **and** `fincra_beneficiary_id` already exists, skip the Fincra call and reuse. If anything changed, register a fresh beneficiary (Fincra receives the same payload shape, so the new id is deterministic via `accountHolderName:accountNumber`).

### Payout alert resolve path (2026-09-06)
- `actions/finance.ts:resolveAlert` existed but (a) accepted any string and (b) wasn't wired into the new `/admin/payouts` page. Hardened it with Zod UUID validation, added an `audit_log` entry (`payout_alert.resolved`), and added a `Resolve` button to each open alert on the admin payouts view with an in-component toast (`useTransition`, revalidatePath covers `/admin/payouts`).

### Admin owner-payouts ledger UI (2026-09-06)
- New `/admin/payouts` page (`app/admin/payouts/page.tsx` + `payouts-client.tsx`) reads `getPayoutLedgerFromDB()` + `getPayoutAlertsFromDB()` server-side and renders: status summary tiles (pending / eligible / released / paid totals), an open-alerts panel (top 8 unresolved `payout_alerts` with severity pill + kind), and the full ledger as a filterable table (status dropdown + free-text owner/property search). Includes NGN payout column (FX × GBP share), retry count, Fincra reference, paid timestamp.
- Nav entry "Owner Payouts" added under Finance. Read-only — all mutations still go through Server Actions.
- Separate from `/admin/finance` (which renders the mock "approve before disbursement" queue); both can coexist.

### Owner dashboard reads real owner_payouts (2026-09-06)
- The owner "Payouts" tab previously rendered hardcoded mock data (`getOwnerPayouts()` in `lib/data.ts`) and showed a literal `"Paid"` label regardless of status.
- **Fix:** `getOwnerPayoutsFromDB(ownerId)` in `lib/data-server.ts` reads `owner_payouts` joined with `properties.name`, maps each row to the existing `OwnerPayout` display shape (`period` = `Month YYYY` from the terminal date, `units` = property name), and derives a human label per status (`paid → "Paid"`, `released → "Disbursing"`, `eligible → "Eligible"`, `pending/failed/refunded` etc). Server pages `/dashboard/owner` (home) and `/dashboard/owner/payouts` pass the fetched list via a new optional `initialPayouts` prop (force-dynamic, falls back to module mock when unauthenticated / Supabase not configured / not owner). The dashboard now renders the actual status pill (green=paid, primary=eligible/released, danger=failed, warning=refunded), an empty-state message, and drops the bogus "Paid 2026-07-05" copy.

### Refund flow consolidated through recordRefundSplit (2026-09-06)
- The Stripe webhook (`app/api/webhooks/stripe/route.ts`) previously inlined the refund SQL directly — duplicate of `recordRefundSplit` in `lib/payouts.ts` and missing the `payout_alerts` insertion the rest of the payout lifecycle emits.
- **Fix:** `recordRefundSplit` is now the single source of truth — it updates `booking_groups` + `owner_payouts`, inserts a `payout_alerts` row (`kind: 'refund'`, `severity: 'medium'`), and logs. The Stripe `record_refund` action delegates to it. New partial-refund test in `tests/payment-architecture.test.ts` confirms refund < owner_share keeps status `paid`.

### Fincra payouts cron scheduled (2026-09-06)
- `app/api/cron/payouts` (eligibility → release → poll) existed but was **not** in `vercel.json`, so the entire owner-payout lifecycle was dormant in production. Added `"path": "/api/cron/payouts", "schedule": "0 4 * * *"` (after inspections/feedback/reconcile/sweep so it runs against a fully reconciled set). Single-line change.

### vercel-react-best-practices skill installed (2026-08-16)
- Installed the Vercel Engineering performance guide: `.agents/skills/vercel-react-best-practices/SKILL.md` (source: `.context/features/vercel.md`).
- 70 rules across 8 categories prioritized by impact: (1) Eliminating Waterfalls — `Promise.all`, defer/start-early, Suspense streaming; (2) Bundle Size — no barrel imports, `next/dynamic`, defer third-party, preload on hover; (3) Server-Side — auth server actions, `React.cache()`, LRU, dedupe RSC props, hoist static I/O, no shared module state, minimize serialization, parallel nested fetches, `after()`; (4) Client Fetching — SWR dedup, listener dedup, passive scroll listeners, versioned localStorage; (5) Re-render — memoization, lazy state init, functional setState, `startTransition`, `useDeferredValue`, refs for transient values, no inline components; (6) Rendering — content-visibility, hoist static JSX, suppress expected hydration mismatches, ternary over `&&`, resource hints; (7) JS perf — Maps for lookups, cache property access, early exits, hoisted RegExp, `toSorted()`, `flatMap`; (8) Advanced — `useEffectEvent` deps, handler refs, init-once, `useLatest`.
- Registered in `AGENTS.md` Project Skills table.

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

### Forgot Password styling & FOUC fix (2026-08-16)
- **Problem:** `/forgot-password` page was visually unstyled and misaligned on client-side routing from `/login` but correct on reload.
- **Root Cause:** Next.js `inlineCss: true` optimization inlines only the critical styles used by the source page. Since `/login` uses inline styles, the Tailwind CSS structural rules needed by `/forgot-password` were missing from the client-side bundle on first navigation.
- **Fix:** Refactored `app/forgot-password/page.tsx` to match the brand-compliant editorial split-panel layout used on `/login` and `/signup` and implemented visual styling using React inline style attributes. This makes style loading instant, consistent, and independent of external CSS files.
- **Verification:** Passed typechecking, 292 unit tests, and production build compiles cleanly. Manual layout verified for desktop and mobile viewports.

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
1. Phase 7 — real-mode drift: apply `0018` migration to the live project; verify `operators` / `assigned_cities` / `country_of_residence` / `booking_groups.reference` reads against real schema.
2. Phase 8 — final doc pass.
