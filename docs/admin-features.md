# CheckinBliss — Admin Dashboard Features

Location: `app/admin/` · Route root: `/admin` (role: `admin`)

> **Accessing it locally:** a populated `.env` forces real mode and the demo logins fail.
> Run **`npm run dev:mock`**, then sign in as `admin@checkbliss.com` / `checkbliss-demo-2026`.

The Admin dashboard provides **strategic oversight, operational control, and financial control**
across the whole platform (storefront + operators + owners + guests). Nothing here is guest-facing —
it is the internal back-office.

---

## Navigation (Admin sidebar)

| Section | Route | Purpose |
|---------|-------|---------|
| Dashboard | `/admin` | Overview: KPIs, recent activity, pending claims, active operators |
| Damage Claims | `/admin/claims` | Adjudicate operator-submitted damage claims + guest disputes |
| Operators | `/admin/operators` | Create, edit, suspend city operators |
| Finance | `/admin/finance` | Payments, payout approvals, reconciliation |
| Owner Payouts | `/admin/payouts` | Owner payout ledger + alerts |
| Properties | `/admin/properties` | Platform-wide property curation (approve / suspend / reactivate) |
| Users | `/admin/users` | Unified user directory (guests + owners), suspend support |
| Audit Log | `/admin/audit` | Immutable sensitive-actions log |
| WhatsApp CRM | `/admin/crm/...` | Inbound WhatsApp inbox, contacts, broadcast, analytics |
| Notifications | `/admin/notifications` | In-app notification centre |
| Settings | `/admin/settings` | Admin profile + platform config |

---

## 1. Dashboard — `/admin`

- **KPI cards:** Revenue (MTD), occupancy/booking stats, live inventory.
- **Recent Activity:** latest audit events (action — target — detail — date).
- **Pending Claims:** top claims awaiting decision with claimed amounts.
- **Active Operators:** operators with property counts and verification counts.

Source: `overview-client.tsx` (reads `getAdminStats`, `getAdminAudit`, `getAdminClaims`, `getAdminOperators`).

---

## 2. Damage Claims — `/admin/claims`

Adjudication queue for claims submitted by city operators.

- **Queue tabs:** All / Pending Review / Disputes / Decided (with counts).
- **Claim card:** property, guest, stay dates, booking ref, description, operator notes,
  photo count, claimed amount, adjusted amount.
- **Decision actions (pending):**
  - **Approve** — claim approved; deposit charged to the guest.
  - **Adjust** — admin enters a custom adjusted amount (£).
  - **Reject** — claim rejected.
- **Dispute adjudication (guest disputed):**
  - **Uphold** — claim upheld, deposit captured to the owner.
  - **Reverse** — claim reversed, deposit released back to guest.
- **Detail modal:** full claim breakdown + decide from the modal.

Source: `claims-client.tsx` · mutation: `decideClaim()` in `actions/claims.ts`.

---

## 3. Operators — `/admin/operators`

Manage the city-scoped operations team.

- **List:** name, email, assigned cities, properties, verified count, quality score, status.
- **Create Operator:** name, email, assigned cities (Lagos / Abuja / Port Harcourt / combo / All).
- **Edit Operator:** update name, email, assigned city.
- **Suspend Operator:** deactivate an operator.

Source: `operators-client.tsx` · mutations: `createOperator`, `updateOperator`, `suspendOperator`
in `actions/operators.ts`.

---

## 4. Finance — `/admin/finance`

Money movements across the platform.

- **Overview tab:** Payments Received / Payouts Issued / Deposits Held (+ per-transaction ledger).
- **Payouts tab:** pending owner payouts requiring approval (period, units, nights, revenue,
  15% fee, net payout). **Approve** or **Reject** (with reason).
- **Reconciliation tab:** Stripe ↔ internal ledger matching — matched/unmatched totals,
  reconciliation rate, per-record status, and **Flag discrepancy**.

Source: `finance-client.tsx` · mutations: `approvePayout`, `rejectPayout`, `flagDiscrepancy`
in `actions/finance.ts`.

---

## 5. Owner Payouts — `/admin/payouts`

Dedicated owner payout ledger with operational alerts, driven from the DB
(`getPayoutLedgerFromDB`, `getPayoutAlertsFromDB`). Supports the Fincra-based NGN owner
disbursement flow.

Source: `payouts/page.tsx` + `payouts-client.tsx`.

---

## 6. Properties — `/admin/properties`

Platform-wide property curation and status control.

- **Search** by name or city.
- Per-property: city, neighbourhood, owner, beds/baths/guests, nightly rate, bookings, revenue.
- **Approve** — approve a property in `pending_review` curation queue.
- **View** — property detail modal (all listing fields).
- **Suspend** — with a required reason (only for approved properties).
- **Reactivate** — bring a suspended property back to approved.

Source: `properties-client.tsx` · mutations: `decideCuration` (`actions/curation.ts`),
`suspendProperty` (`actions/operators.ts`).

---

## 7. Users — `/admin/users`

Unified directory of guests and owners with their booking/property counts and role badges.
Suspend support action available per user.

Source: `users-client.tsx` (reads `getAdminUsers`).

---

## 8. Audit Log — `/admin/audit`

Immutable log of sensitive actions — filterable by actor, action type, and date range.
Documents every admin/operator mutation with actor, target, detail, and timestamp.

Source: `audit-client.tsx` (reads `getAdminAudit`).

---

## 9. WhatsApp CRM — `/admin/crm/...`

Meta Cloud API–powered WhatsApp operational console (inbox-style CRM).

| Section | Route | Purpose |
|---------|-------|---------|
| Inbox | `/admin/crm/inbox` | Inbound WhatsApp messages (+ per-conversation `/[e164]`) |
| Contacts | `/admin/crm/contacts` | Guest/owner contact directory |
| Damage Claims | `/admin/crm/claims` | Claims surfaced in the CRM context |
| Inspections | `/admin/crm/inspections` | Property inspection records |
| Broadcast | `/admin/crm/broadcast` | Outbound WhatsApp broadcast to contacts |
| Audit Log | `/admin/crm/audit` | WhatsApp-integration audit trail |
| Analytics | `/admin/crm/analytics` | Messaging metrics |

Source: `app/admin/crm/*` (layout drives the CRM tab nav).

---

## 10. Notifications — `/admin/notifications`

In-app notification centre for the admin role (booking-confirmed alerts, claim decisions,
owner notifications). Uses the shared `NotificationsView` component role-scoped to `admin`.

Source: `notifications/page.tsx` + `components/notifications-view.tsx`.

---

## 11. Settings — `/admin/settings`

- **Admin profile:** avatar photo upload (JPG/PNG/WebP, max 5MB).
- **Platform configuration**: platform name, default currency (GBP/USD/EUR — **NGN excluded**
  per business rule), deposit-hold duration (days), max nights per booking,
  enable WhatsApp notifications, maintenance mode. **Save Settings** persists (mock).

Source: `settings-client.tsx`.

---

## Key business invariants enforced by the admin surface

- **Money is integer minor units (GBP pence).** Display only GBP/USD/EUR — NGN is excluded from display.
- **Deposit holds are manual-capture** — money only moves on an approved damage claim (admin decision).
- **Double-booking is a DB invariant** — admin cannot override availability.
- **Admin role gates every `/admin` route** via role re-authorisation on each mutation
  (every write re-verifies `session.role === "admin"`).
- **Audit trail** on every sensitive action.

---

*Source of truth: `app/admin/` directory. This doc mirrors the implemented UI as of the current build.*
