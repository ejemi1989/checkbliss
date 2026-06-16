# Progress Tracker

Update this file after every completed feature. Any engineer reading this should immediately know what is done, what is in progress, and what is next. Scope = **V1 Launch-Critical** (PRD §12.1), 25 features across 7 phases (see `CheckinBliss-Build-Plan.md`).

---

## Current Status

**Phase:** Phase 7 — Polish; features 21, 23, 24, 25 remaining

**Last completed:** Calendar sync (feature 22) — iCal feed API, owner dashboard subscribe links, guest confirmation "Add to calendar" download. Notification system (bell + inbox) wired into all 3 dashboards. Photo/media management with inline editing and reordering. Search bar with typeahead + availability filtering wired into homepage. WhatsApp DAMAGE photo flow with 5-photo cap.

**Next:** 21 NGN Payout (blocked on partner), 23 Database Seeding, 24 Testing, 25 Polish

**Features completed:** 22 / 25

> **Honest state:** The entire platform is built — 5 storefront pages (landing, detail, booking, confirmation, booking status), 3 dashboards (admin/operator/owner) with full CRUD + notifications + photo management, 23 API routes, 18 Server Actions, WhatsApp bot with command parsing + image handling, search with availability filtering, calendar sync, reliability layer (idempotency/observability/outbox). All runs in mock mode. Only NGN payout (partner-gated), database seeding (~30 properties), testing, and polish remain.

---

## Progress

### Phase 1 — Foundation

- [x] 01 Design System + Shell
  - `app/globals.css` — Tailwind v4 `@theme` tokens (ink/bone/lagoon/brass/hairline, canvas/primary for admin SaaS, Playfair + Inter)
  - Brand colour `brass`: #5a3ef1 (purple-blue)
  - `app/layout.tsx` — root layout with `suppressHydrationWarning`
- [x] 02 Database Schema
  - `supabase/migrations/0001_schema.sql` — **GiST `EXCLUDE`**, `book_stays()`, `confirm_booking_group()`
  - `supabase/migrations/0002_rls.sql` — RLS policies
  - `supabase/migrations/0003_photos.sql` — `property_photos` table + `photo_status` enum
- [x] 03 Supabase Clients + Mock Mode
  - `lib/supabase.ts` — `createBrowser`/`createServer`/`createAdmin`, `supabaseConfigured` flags
  - `lib/data.ts` (19 functions) + `lib/seed-data.ts` (6 properties) — mock fallback
- [x] 04 Storefront Homepage — Plum Guide editorial UI
  - Hero (full vw/vh), compact search bar (where + dates typeahead), 3 filter cards, "Trusted" 6-point grid + Trustpilot, city directory, CheckinBliss Promise, footer

### Phase 2 — Browse & Detail

- [x] 05 Real Inventory — `GET /api/properties` with `?city` filter, mock fallback
- [x] 06 Property Detail — `GET /api/properties/[slug]` + availability API; **`app/stays/[slug]/page.tsx`** — gallery, amenities, checkout options, sticky booking panel, ID fallback lookup (`/stays/PR001`, `/stays/p001`, `/stays/001` all work)

### Phase 3 — Booking & Payments

- [x] 07 Availability Feed — `GET /api/properties/[slug]/availability`
- [x] 08 Booking Flow — **`app/book/[slug]/page.tsx`** — 3-step client flow (dates + guest → checkout option → payment), inline validation errors, 14-day rule, mock payment
- [x] 09 Booking Engine — `POST /api/bookings` (Zod + 14-day + atomic RPC + Airwallex + WhatsApp + audit)
- [x] 10 Airwallex — `lib/airwallex.ts` (charge auto-capture, deposit manual-capture, release, partial capture) + webhook
- [x] 11 Confirmation Page — **`app/confirmation/[reference]/page.tsx`** — reference, per-stay cards, payment summary, deposit explainer, "Add to calendar" download

### Phase 4 — Deposit & Inspection

- [x] 12 Deposit Lifecycle — capture/release in `lib/airwallex.ts`; 7-day expiry backstop; cron auto-release
- [x] 13 Inspection Scheduler — cron state machine (24h→checkout→4h→48h→7d)
- [x] 14 Damage Claim Flow — API routes + `actions/claims.ts` + WhatsApp `DAMAGE` photo flow (≤5 images)

### Phase 5 — WhatsApp Bot

- [x] 15 WhatsApp Webhook — GET Meta challenge + POST HMAC + strict parse + idempotency
- [x] 16 Owner Commands — `BLOCK`/`UNBLOCK` (availability_blocks), `AVAILABILITY`, `BOOKINGS`, `HELP` — authorized to owned units
- [x] 17 Operator Inspection — `CLEAN` (release hold) / `DAMAGE` (photo flow, 5-cap) / `NOSHOW` / `GUESTPRESENT` / `YES` / `REASSIGN` — city-scoped

### Phase 6 — Admin

- [x] 18 Admin Dashboard — 8 sidebar tabs (Dashboard, Claims, Operators, Finance, Properties, Users, Audit, Notifications) with optimistic state, session display, Escape-close modals
- [x] 18b Owner Dashboard — 5 tabs (Bookings+calendar, Properties, Payouts, Notifications, Calendar Sync)
- [x] 18c Operator Dashboard — 6 tabs (Today, Curation, Inspections, Photos, Notifications, Verification)
- [x] 19 Admin Decisions — Claims approve/adjust/reject (optimistic), operators create/edit/suspend, properties approve/edit/suspend, property photo management (upload/approve/reject/delete/reorder), Settings modal

### Phase 7 — Feedback, Payout & Polish

- [x] 20 Post-Checkout Feedback — `GET /api/cron/feedback` (CRON_SECRET, 24h after checkout)
  - All cron routes (inspections, feedback, reconcile, sweep) with idempotency + heartbeats
- [ ] 21 NGN Payout Integration — **blocked on partner confirmation** (Africhange/Yolat)
- [x] 22 Outbound Calendar Sync
  - `lib/calendar.ts` — RFC 5545 iCal generator
  - `GET /api/calendar/[ownerId]` — subscribe feed (Google/Outlook/Apple)
  - Owner dashboard: subscribe URL + copy + per-booking downloads
  - Guest confirmation: "Add to calendar" download
- [ ] 23 Database Seeding — 6 seed properties; ~30-property target pending
- [ ] 24 Pre-Launch Testing — documented; execution not started
- [ ] 25 Polish + Demo — responsive pass + walkthrough pending

---

## Velocity Tracking

| Phase | Features | Status |
|-------|----------|--------|
| 1 — Foundation | 4 | **4/4 complete** |
| 2 — Browse & Detail | 3 | **3/3 complete** |
| 3 — Booking & Payments | 4 | **4/4 complete** |
| 4 — Deposit & Inspection | 3 | **3/3 complete** |
| 5 — WhatsApp Bot | 3 | **3/3 complete** |
| 6 — Admin | 2 | **2/2 complete** |
| 7 — Feedback, Payout & Polish | 6 | 2/6 (feedback + calendar done; payout blocked; 3 pending) |
| **TOTAL** | **25** | **22/25 complete** |

---

## Built Beyond Spec

| Feature | Details |
|---|---|
| Login / session auth | 3 demo users, `cb_session` cookie, middleware route protection |
| Notifications | Bell + inbox in all dashboards, 9 seed notifications per role |
| Photo management | Upload/approve/reject/delete/reorder/set-cover in operator + admin |
| Property editing | Operator/admin edit name/description/rate/bedrooms/extended checkout |
| Search on homepage | Where typeahead + date pickers, URL params, availability filtering |
| Booking status page | `/booking/[token]` — magic-link deposit status + dispute entry |
| Reliability layer | `lib/idempotency.ts` + `lib/observability.ts` + `lib/outbox.ts` |
| WhatsApp DAMAGE photos | Image message handling, 5-photo cap, Meta media fetch |
| Calendar sync | iCal feed API + Google/Outlook subscribe + per-booking downloads |

---

## API Routes Built (23 total)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/bookings` | POST | Atomic multi-city booking |
| `/api/bookings/[reference]` | GET | Booking confirmation lookup |
| `/api/bookings/lookup` | POST | Magic-link token generation |
| `/api/properties` | GET | List approved properties |
| `/api/properties/[slug]` | GET | Property detail |
| `/api/properties/[slug]/availability` | GET | Unavailable date ranges |
| `/api/admin/claims` | GET | Damage claims list |
| `/api/admin/claims/[id]/decision` | POST | Claim decision |
| `/api/admin/operators` | POST | Create operator |
| `/api/admin/properties/[id]/suspend` | POST | Suspend property |
| `/api/claims/[id]/dispute` | POST | Guest dispute |
| `/api/operator/properties/[id]/photos` | GET/POST | List/upload photos |
| `/api/operator/properties/[id]/photos/reorder` | POST | Reorder photos |
| `/api/operator/photos/[photoId]` | DELETE | Delete photo |
| `/api/operator/photos/[photoId]/approve` | POST | Approve photo |
| `/api/operator/photos/[photoId]/reject` | POST | Reject photo |
| `/api/webhooks/whatsapp` | GET/POST | Meta verification + messages |
| `/api/webhooks/airwallex` | POST | Payment webhook |
| `/api/cron/inspections` | GET | Inspection lifecycle |
| `/api/cron/feedback` | GET | Post-checkout feedback |
| `/api/cron/reconcile` | GET | Payment reconciliation |
| `/api/cron/sweep` | GET | Orphan sweep |
| `/api/locations` | GET | City/neighbourhood typeahead |
| `/api/calendar/[ownerId]` | GET | iCal feed for owners |

---

## Known Issues / Blockers

| Issue | Severity | Status |
|-------|----------|--------|
| NGN payout partner unconfirmed | High | Blocked |
| Database seeding (target ~30 properties) | Medium | 6 seed properties complete |
| Session auth is dev-only | Medium | Replace with Supabase Auth before launch |
| Airwallex hosted fields not on frontend | Medium | Mock payment form in booking flow |

---

## Next Steps

1. **Confirm NGN partner** → unblock feature 21
2. **Database seeding**: 30 properties, operators with E.164, realistic reservations
3. **Testing**: 5 critical workflows (booking, payment, deposit, inspection, claim)
4. **Polish**: responsive audit, performance, accessibility, demo walkthrough

---

## Resources
- `CheckinBliss-Architecture.md` · `CheckinBliss-Build-Plan.md` · `AGENTS.md`
- `specs/Design-System-V1.md` · `Payment-Flow-V1.md` · `specs/WhatsApp-Messaging-V1.md`
- `phase1/01-Backend-Architecture.md` · `02-API.md` · `03-Database.md` · `04-Schema.md`
