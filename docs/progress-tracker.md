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
| `npm test` | 2026-08-14 | 18 files, **271 tests passing** |
| `npm run typecheck` | 2026-08-14 | clean |
| `npm run lint` | 2026-08-14 | 20 pre-existing errors (unrelated files); new code clean |

## Recently completed

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
