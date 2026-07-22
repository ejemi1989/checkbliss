# CheckinBliss Dashboard System Design

*A complete, role-based dashboard architecture for the four-role operational model: Super Admin, City Operator, Property Owner, Guest.*

---

## 1. Design Principles

1. **Authorisation is structural, not cosmetic.** Every role's dashboard is a different *view of the same data*, scoped by row-level security (RLS) at the database layer — not by hiding UI elements on top of an admin-everything query. A Lagos operator's API calls must be rejected server-side for Abuja data, not merely un-rendered client-side.
2. **Match dashboard weight to role weight.** Operators run cities and need substantial tooling. Admins oversee and adjudicate — their dashboard is wide (visibility into everything) but shallow (few daily actions). Owners are light users. Guests barely need an account at all.
3. **One shared design system, four different app shells.** Same component library, same tokens, same data model — but each role gets its own route namespace, nav, and permitted actions, rather than one dashboard with role-based feature flags scattered through it.
4. **Workflows are multi-role by design.** Damage claims, property approval, and dispute resolution are hand-offs between two roles, not single-user CRUD. The system should model these as explicit state machines, not implicit status fields.
5. **Mobile-first for operators.** Operators do physical inspections on-site — the operator dashboard's inspection and verification flows must work well on a phone camera, not just desktop tables.

---

## 2. Role & Access Model (RBAC)

| Role | Scope | Enforcement |
|---|---|---|
| `guest` | Own bookings only | RLS: `user_id = auth.uid()` |
| `owner` | Own properties + their bookings | RLS: `owner_id = auth.uid()` |
| `operator` | Properties/bookings/claims within assigned `city_id(s)` | RLS: `city_id = ANY(operator_cities(auth.uid()))` |
| `super_admin` | Everything | RLS: bypass via `service_role` claim / admin policy |

**Implementation notes (Supabase):**
- A `profiles` table with `role` enum (`guest`, `owner`, `operator`, `super_admin`) and an `operator_cities` join table (operator_id → city_id) for the rare multi-city operator case.
- RLS policies defined per table (`properties`, `bookings`, `damage_claims`, `verifications`, `payouts`) referencing a `has_city_access(city_id)` Postgres function — never trust a client-supplied `city_id` filter alone.
- Every sensitive action (payout approval, property suspension, claim adjudication) writes to an `audit_log` table with actor, role, before/after state, and timestamp — visible only to Super Admin.
- Session role is fixed at login; switching between "operator view" and "admin view" (if one person holds both) requires a distinct account or an explicit, logged role-switch action — never silent dual-permission sessions.

---

## 3. Cross-Role Workflow: Damage Claims (reference model)

Because this is the clearest multi-role hand-off in the brief, it's worth specifying as the template other workflows follow:

```
[Operator: Post-checkout inspection]
        │  reports CLEAN / DAMAGE / NOSHOW / GUESTPRESENT
        ▼
[DAMAGE reported] ──► status: draft
        │  operator attaches photos + cost estimate
        ▼
status: submitted ──► visible in Admin review queue
        │
        ▼
[Admin: reviews evidence, guest booking history, cost estimate]
        │
   ┌────┼─────────────┐
   ▼    ▼             ▼
approve adjust        reject
   │    │             │
   ▼    ▼             ▼
status: approved / adjusted / rejected
        │
        ▼
[Guest notified — can dispute within X days]
        │
   dispute raised? ──► status: disputed ──► back to Admin for final adjudication
        │
        ▼
[Operator notified of final outcome] ──► [Payout/charge processed]
```

Each status transition is a row in a `damage_claim_events` table (append-only), so both operator and admin dashboards can render a full timeline rather than just a current status badge.

---

## 4. Super Admin Dashboard

**Positioning:** strategic oversight and adjudication — wide visibility, narrow action set, daily use is light.

### 4.1 Information Architecture
```
/admin
 ├── /overview            (platform-wide KPIs)
 ├── /cities               (all cities, drill-down)
 │     └── /cities/:id     (single-city performance, same shape operator sees)
 ├── /claims                (adjudication queue)
 ├── /finance
 │     ├── /reconciliation
 │     └── /payouts
 ├── /operators             (management)
 ├── /users                 (guests, owners, operators — unified directory)
 ├── /properties             (platform-wide search & suspension)
 ├── /reports
 ├── /audit-log
 └── /settings               (platform config, policy)
```

### 4.2 Feature Detail

**Overview**
- Aggregate KPIs: total live properties, occupancy rate, GMV, take-rate revenue, active disputes, avg. verification compliance %
- City comparison table (Lagos vs Abuja vs future cities): revenue, occupancy, claim rate, operator quality score
- Trend charts (30/90/365-day) for bookings, revenue, cancellations
- Alerts panel: overdue verifications, claims aging past SLA, negative payout balances

**City Drill-Down**
- Same view an operator sees for their city, but read-only + an "assume city context" toggle for support purposes (logged in audit trail)
- Operator performance for that city: inspections completed, verification compliance %, guest satisfaction proxy (claim rate, cancellation rate)

**Damage Claim Review Queue**
- Filterable queue: `submitted`, `disputed`, aging (days since submission)
- Claim detail view: full photo evidence, operator's cost estimate, property history, guest booking history, prior claims for this property/guest
- Actions: Approve / Adjust (with amount + reason) / Reject (with reason) — each writes an audit entry and triggers guest + operator notification
- Dispute sub-queue: guest-raised disputes requiring final adjudication (separate SLA, escalation flag if aging)

**Financial Reconciliation**
- Payments received vs payouts made vs platform take-rate, per city and platform-wide
- Reserve/held funds view (security deposits currently held, pending claim resolutions)
- Payout approval queue (owner payouts, operator revenue-share payouts) with batch-approve and hold/flag actions
- Exportable statements per period for accounting

**Operator Management**
- Create operator account, assign city/cities
- Performance review: verification compliance, inspection turnaround time, claim quality (approved vs rejected/adjusted rate — a proxy for whether operator estimates are trustworthy), guest-facing quality score
- Revenue-share configuration per operator (5–7% band) and payout history

**User Management**
- Unified searchable directory across guests, owners, operators with role, city, status, join date
- Suspend/reinstate accounts (with reason logged)
- Cannot view guest payment details directly (masked; last 4 digits + processor reference only) — financial detail flows through the payment processor's dashboard, not duplicated here

**Property Oversight**
- Platform-wide property search/filter (city, status, operator, quality score, verification recency)
- Suspend/reinstate a listing platform-wide (overrides operator-level status) — used for policy violations or legal issues, logged
- Cannot edit property content directly — that's an operator-initiated, admin-approved workflow (see §7)

**Reports & Analytics**
- Standard report templates: monthly revenue, occupancy by city, claim rate trends, operator scorecards
- Ad hoc export (CSV) for board/investor reporting

**Audit Log**
- Immutable log of every adjudication, suspension, payout approval, role/permission change
- Filterable by actor, action type, date range — this is the accountability backbone of the "admin doesn't do operations" model

**Platform Settings**
- Policy configuration: cancellation windows, damage claim SLA, verification frequency requirements, commission/revenue-share defaults
- Feature flags for phased rollout (e.g., enabling a new city)

---

## 5. City Operator Dashboard

**Positioning:** the operator *runs* their city — this is the most feature-dense role, and the one most likely to be under-built if treated as a "limited" account.

### 5.1 Information Architecture
```
/operator
 ├── /overview             (city snapshot)
 ├── /properties            (inventory, scoped to assigned city)
 │     └── /properties/:id  (detail, verification history, edit-request)
 ├── /onboarding             (new property intake workflow)
 ├── /verification           (monthly re-verification queue)
 ├── /inspections             (post-checkout inspection queue)
 ├── /claims                  (damage claim submission + status)
 ├── /bookings                (city bookings, in-progress stays)
 ├── /owners                  (owner directory for this city)
 └── /performance              (own scorecard, read-only)
```
*Scoped entirely by `city_id`; an operator assigned to two cities gets a city switcher at the top, never a merged view.*

### 5.2 Feature Detail

**City Overview**
- Snapshot: properties live/pending/suspended, occupancy this month, upcoming checkouts requiring inspection, open claims, verification compliance %
- Action-oriented "Today" panel: inspections due today, verifications due this week, claims awaiting evidence submission

**Property Inventory**
- List/grid of all properties in-city with status (draft, pending review, approved, live, suspended)
- Filter/sort by verification recency, quality score, occupancy, owner
- Bulk actions: flag for re-verification, message owners

**Onboarding Workflow (new property intake)**
- Structured intake form: owner details, property address, unit type, capacity
- Photo capture flow optimised for mobile (in-app camera, not just file upload) with a shot-list checklist (living room, each bedroom, each bathroom, kitchen, exterior/entrance, amenities)
- Physical inspection checklist (safety: smoke alarm, fire extinguisher, water supply, backup power; quality: cleanliness, furnishing standard) — pass/fail per item, notes field, photo attachment per failed item
- Owner WhatsApp channel setup — captures phone number, sends templated onboarding message via WhatsApp Business API, logs delivery status
- Submission moves property to `pending review`; **admin does not approve individual properties** — approval authority sits with the operator once the checklist passes 100%, unless a policy flag (e.g. price anomaly, duplicate address) routes it to admin, per the "operators do the operational work" principle. (If the business wants dual sign-off, this is the one exception worth flagging back to the brief author — see open question in §9.)

**Monthly Re-Verification**
- Queue of properties due for re-verification (auto-generated 30 days from last verification date)
- Same checklist pattern as onboarding, shorter form (delta-focused: "anything changed since last visit?")
- Photo diffing prompt: side-by-side with last verification's photos for key rooms, to make degradation visible
- Compliance tracker: % of city inventory verified on schedule (feeds Admin's operator scorecard)

**Post-Checkout Inspections**
- Queue driven by booking checkout dates (auto-populated, sorted by most overdue)
- Single-tap outcome selection: `CLEAN` / `DAMAGE` / `NOSHOW` / `GUESTPRESENT`
- If `DAMAGE`: routes directly into claim submission (see below) — no separate re-entry of property/booking context
- If `GUESTPRESENT` (guest hasn't left): flags booking for follow-up, notifies admin if it persists past a threshold

**Damage Claim Submission**
- Pre-filled from the triggering inspection (property, booking, guest, date)
- Photo upload (multiple, with room/item tagging)
- Cost estimate entry, itemised (item, estimated cost, notes) with running total
- Submit → claim enters Admin's review queue; operator sees status update in real time (submitted → approved/adjusted/rejected → disputed if applicable)
- Claim history view per property (repeat-damage patterns are useful evidence for both operator and admin)

**City Bookings**
- Current and upcoming bookings for the city, guest name, dates, property, status
- In-progress stays highlighted (for first-line issue resolution) with a direct message/contact action
- **No guest payment details** — booking amount and status only, per the "cannot see guest financial information" restriction

**Owner Directory**
- Contact info, properties owned, WhatsApp thread link, onboarding date
- Quick actions: message via WhatsApp, flag for property edit request

**Performance (read-only)**
- Own scorecard: properties verified on schedule, inspections completed on time, claim approval rate, guest satisfaction proxy
- Transparent so operators know how they're evaluated — not editable by them

---

## 6. Property Owner Dashboard

**Positioning:** deliberately lightweight. WhatsApp with the operator is the primary channel; the dashboard is a visual overview, not a self-service admin panel.

### 6.1 Information Architecture
```
/owner
 ├── /properties        (1–5 properties, simple cards)
 ├── /calendar            (occupancy calendar)
 ├── /bookings             (upcoming, with guest name + dates)
 ├── /earnings              (payout history + pending)
 └── /profile                 (basic settings)
```

### 6.2 Feature Detail

**Properties**
- Simple card per property: photo, name, status (live/suspended), current occupancy indicator
- No edit controls on core details (name, description, amenities, price) — a "Request a change" button opens a structured request that routes to their city operator, who submits the actual edit for admin/property approval if needed

**Calendar**
- Read view of occupancy (booked/available/blocked)
- Ability to mark dates unavailable directly (this is the one write action owners get, since it's time-sensitive and low-risk) — though the brief notes this is "usually via WhatsApp with operator," so the in-dashboard calendar-block should sync to/from whatever the operator sets, not conflict with it

**Bookings**
- Upcoming bookings: guest first name, check-in/out dates, nights, status
- No direct guest messaging (mediated by platform/operator) — a "Flag an issue" button routes to the operator, not a guest chat thread

**Earnings**
- Simple ledger: booking → payout amount → payout date → status (pending/paid)
- Running total for current month/quarter
- No editable pricing controls — pricing sits with the operator in partnership with the owner (per brief), so any pricing conversation happens over WhatsApp, not in-app

**Profile**
- Contact details, bank/payout details (view + update, since owners do need to correct their own payout destination), notification preferences

---

## 7. Guest Dashboard

**Positioning:** standard marketplace consumer experience — public browsing needs no login; the account layer is thin.

### 7.1 Information Architecture
```
/ (public)                  — browse, search, property pages, no login
/book                        — booking + payment flow
/account
 ├── /bookings                (history + active)
 ├── /bookings/:id             (detail, damage claim viewer if applicable)
 ├── /profile
 └── /support                    (contact platform)
```

### 7.2 Feature Detail

**Public Browsing & Booking**
- No-login browse and search (as already built on the marketplace site)
- Booking flow: dates, guests, extras (late checkout, etc.), payment, security deposit hold explanation
- Confirmation + itinerary email/WhatsApp

**Account — Bookings**
- List of past and upcoming bookings, status, amounts
- Active booking detail: property info, check-in instructions, city manager contact, cancellation policy reference

**Damage Claim Viewer**
- If a claim is filed against their stay: read-only view of the claim (photos, itemised costs, current status)
- "Dispute this claim" action — opens a structured dispute form (reason, optional counter-evidence upload), which routes into the Admin adjudication queue (§4, §3) as `disputed`
- Guests never see the operator's internal notes — only the evidence and outcome relevant to them

**Profile**
- Contact details, payment methods (tokenised — platform never stores/re-displays full card numbers), notification preferences

**Support**
- Contact form / WhatsApp link for issues outside an active claim (general support), routed to the relevant city operator or a general support queue

---

## 8. Cross-Cutting Systems

**Notifications**
- Channel-aware: guests and owners primarily via WhatsApp (per brief), operators/admin via in-app + email for anything SLA-bound
- Event-driven: claim status changes, verification due, payout processed, dispute raised — each maps to a notification template per recipient role

**Data Model (core entities)**
- `properties` (city_id, owner_id, status, verification fields)
- `bookings` (property_id, guest_id, dates, status, amount)
- `verifications` (property_id, operator_id, date, checklist_json, photos, compliance flags)
- `damage_claims` (booking_id, property_id, operator_id, status, itemised_costs, photos)
- `damage_claim_events` (claim_id, from_status, to_status, actor_id, role, timestamp, note) — the audit trail that powers both operator and admin timeline views
- `payouts` (recipient_type [owner/operator], recipient_id, amount, status, period)
- `audit_log` (actor_id, role, action, entity, before, after, timestamp)

**Suggested stack alignment** (matching your existing CheckinBliss build): Next.js App Router for the four role-scoped route groups (`/admin`, `/operator`, `/owner`, `/account`), Supabase for auth + Postgres + RLS + Storage (verification/claim photos), Tailwind v4 for the shared component system, WhatsApp Business Cloud API for owner/guest notification channel, Stripe for payments/payouts.

**Permission testing**
- Every RLS policy should have an automated test: "operator A cannot read/write city B's rows via any table," run in CI — this is the concrete implementation of the brief's "not just filtered display" requirement.

---

## 9. Open Questions to Resolve Before Build

1. **Property approval authority:** does the operator have full sign-off on new listings, or does admin retain a final approval step? The brief implies operator autonomy, but "listing approval" is mentioned as something operators do *before* — worth confirming whether admin ever sees a pending-approval queue or only exceptions.
2. **Owner calendar-block vs operator-set availability:** if both can block dates, which wins on conflict, and does one need to defer to the other?
3. **Claim SLA definitions:** how many days does admin have to adjudicate, and how many days does a guest have to dispute? These need to be concrete for the queue "aging" indicators to be meaningful.
4. **Multi-city operator UI:** confirm whether the rare multi-city operator should get a merged view with a filter, or strictly a city switcher with no merged view (recommended, to keep the RLS story simple).

---

## 10. Build Phasing Recommendation

| Phase | Scope |
|---|---|
| 1 | RLS/auth foundation, role-scoped route shells, property inventory + booking views (all roles) |
| 2 | Operator: onboarding + verification workflows (mobile-first) |
| 3 | Damage claim workflow end-to-end (operator submit → admin adjudicate → guest dispute) |
| 4 | Financial reconciliation + payouts (admin), earnings view (owner) |
| 5 | Reporting/analytics, audit log, performance scorecards |

This sequencing gets the structural fix (correct roles + RLS) in place first, then layers the operationally complex workflows (verification, claims) before the purely financial/reporting layers — matching the brief's priority that operator tooling and row-level authorisation are the most urgent corrections.