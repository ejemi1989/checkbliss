# Dashboards — Version 1 (Launch)

**CheckinBliss** · PRD v2.3 §9–§11. At launch, owner functions run primarily through **WhatsApp**; web dashboards are deliberately minimal. Three audiences, three surfaces, strictly separated.

---

## 1. Owner — Minimal Web Dashboard (PRD 9.1)

Owners interact primarily via WhatsApp; the web dashboard provides only essentials that work poorly through text:

- **Visual availability calendar** — monthly view with bookings displayed.
- **Bookings list** — current and upcoming, across all listings.
- **Earnings statement** — with payout history.
- **Property listing view** — read-only at launch (edits handled by operator).

### Owner grouping (PRD 9.3, both phases)
An owner with multiple units in one complex (e.g. "The Palms Maisonette · Unit 1", "Sunset Dove · Unit 2") sees all units consolidated:
- One WhatsApp thread per owner, not per listing.
- Notifications identify the specific unit booked.
- Calendar updates affect only the booked unit.
- **Payouts consolidated at owner level** — one payment per period covering all units, never one transfer per unit per booking.
- Dashboard shows all listings together.

## 2. Operator — Web Dashboard + WhatsApp (PRD 10)

The split is intentional: **WhatsApp for field actions, web dashboard for review/curation** (PRD 10).

Dashboard functions (PRD 10.1):
- **Curation queue** — properties pending review for approval.
- Approve / reject / request changes on properties.
- **Verification logging** — record monthly verification results, photos, notes.
- **Property pipeline tracker** — draft / pending_review / approved / suspended.
- **Inspection schedule** — upcoming checkouts requiring inspection.
- **Performance dashboard** — properties verified, quality scores, inspections completed, supply-side target progress.
- **City-level metrics** — scoped by `operator_assignments`.

### Operator authorisation scope (PRD 10.2)
Row-level: an operator assigned to Lagos cannot see, modify, or verify Abuja properties. Multi-city operators see only their cities. Operators cannot access platform-wide metrics or other operators' performance.

## 3. Admin — Web Dashboard (PRD 11)

Used by the platform team (initially the founder). Admin functions are **not** exposed to operators or owners (PRD 11.1):

- **Platform overview** — aggregate metrics across cities.
- **Damage claim review queue** — the simple launch version (see §4).
- **Dispute resolution** — review guest disputes against claims.
- **Operator management** — create operators, assign cities, review performance.
- **Property suspension** — suspend listings platform-wide.
- **Financial reconciliation** — payment, payout, deposit-hold status.
- **User management** — support actions on guest accounts.
- **Audit logs** — review of all sensitive actions (suspensions, refunds, damage decisions).

## 4. Admin Damage Claim Review — Lean at Launch (PRD 7.6)

At launch scale (~30 properties, ~1–3 claims/month) a full analytics dashboard is over-engineered. V1 is a **simple review interface**:

- Photos uploaded by operator (basic viewer, no fancy gallery).
- Operator description and cost estimate.
- Booking details: guest name, dates, property, payment reference.
- Guest contact information.
- **Three action buttons: Approve · Adjust · Reject.**

The founder reviews each in ~10–15 minutes; no analytics or pattern detection at launch scale. Direct database access is acceptable for less common admin tasks (PRD 12.1).

## 5. Surface Separation (PRD 8.1)

| Audience | Primary surface | Web dashboard role |
|---|---|---|
| Guest | Web app | book / manage / dispute |
| Owner | WhatsApp | minimal (calendar, bookings, earnings) |
| Operator | WhatsApp (field) + web (review) | curation, verification, inspection schedule |
| Admin | Web dashboard | review, decisions, platform-wide control |