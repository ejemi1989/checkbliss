# Role-Based Dashboards

CheckinBliss has four distinct user roles, each with its own dedicated dashboard surface and access boundaries. Per `.context/admin/operator.md` (which restates `.context/admin/structure.md`), the platform is **not a freelancer marketplace** — it's a curated marketplace with an embedded operational partner network. Each role has specific responsibilities and only sees what it needs.

## 1. Super Admin (Platform)

**Route:** `/admin` (9 views) + `/admin/crm/*` (8 sub-routes for the WhatsApp CRM)

**Purpose:** Strategic oversight and financial control, not daily operations. The admin handles what operators cannot: platform-wide decisions, financial reconciliation, dispute adjudication, and expansion planning.

### Day-to-day responsibilities
- Platform-wide performance monitoring
- Damage claim final review and adjudication (approve, adjust, reject)
- Dispute resolution when guest disputes a damage claim
- Financial reconciliation across all cities
- Payout approval and management
- Operator management (creating operators, assigning cities, reviewing performance)
- Property suspension decisions across the platform
- Platform-wide policy settings and standards
- Investor and partner communications
- Expansion planning for new cities and markets

### What the dashboard has
- **Home** — Platform-wide metrics, performance summary
- **Damage Claims** — Final review queue with approve/adjust/reject
- **Operators** — Create, assign cities, review performance
- **Finance** — Payments received, payouts made, reserves held
- **Properties** — Platform-wide suspension decisions
- **Users** — All guests, owners, operators
- **Audit Log** — Sensitive action history
- **Notifications** — Personal inbox
- **WhatsApp CRM** (`/admin/crm/`) — 8 sub-routes: inbox, claims, contacts, inspections, broadcast, analytics, audit, layout

### What admin does NOT do daily
- Physical property inspection (operators do this)
- Damage claim initial reporting (operators do this)
- Owner communication for individual bookings (operators do this)
- New property sourcing (operators do this)

> Super admin is escalation and oversight. Operators do the operational work.

**File locations:** `app/admin/page.tsx`, `app/admin/client.tsx`, `app/admin/crm/`

---

## 2. City Operators (Lagos, Abuja)

**Route:** `/dashboard/operator` (9 tabs)

**Purpose:** Embedded operational partner running their city. Not a freelancer. Not a customer support agent. The CheckinBliss operational presence on the ground. Compensated through revenue share (5–7% of city revenue) and has substantial autonomy within their assigned city.

### Day-to-day responsibilities
- Sourcing new property owners for their city
- Conducting physical property inspections before listing approval
- Photographing properties (or coordinating photography)
- Onboarding property owners including WhatsApp channel setup
- Monthly re-verification of all properties in their city (with photographic documentation)
- Post-checkout inspections with CLEAN / DAMAGE / NOSHOW / GUESTPRESENT reporting
- Submitting damage claims with photos and cost estimates
- First-line issue resolution during guest stays
- Maintaining quality standards across their city inventory
- Coordinating with local vendors (photographers, cleaners if needed)

### What the dashboard has (9 tabs)
- **Today** — Today's inspection schedule + pipeline overview (Draft / Pending / Approved / Suspended counts) + performance metrics
- **Curation** — New property approval workflow + "+ Onboard new property" form for sourcing
- **Inspections** — Full queue of upcoming checkouts requiring inspection (Start / Complete actions)
- **Bookings** — City-scoped guest stays: In Progress, Upcoming, Pending Confirmation, Recent
- **Damage Claims** — Submission interface with photo upload + cost estimate
- **Owners** — City-scoped owner directory with contact information
- **Photos** — Property photo management (upload, approve, reject, reorder)
- **Verification** — Monthly re-verification log per property with notes
- **Notifications** — Personal inbox

### What operators do NOT have access to
- Other cities' data (Lagos operator cannot see Abuja properties)
- Platform-wide financial data
- Other operators' performance
- Guest personal financial information (payment details)
- Owner banking details
- Platform strategic settings

**Authorisation principle:** Row-level access scoped to their assigned city. If an operator is assigned to multiple cities (rare, but possible), they see all their assigned cities but not others. Enforced in:
- Middleware (`roleRouteMap[pathname] === "operator"`)
- `lib/operator-gate.ts` (`checkOperatorGate()`)
- `lib/auth.ts` (`operatorCanAccessCity()`, `filterByAssignedCities()`, `mockOperatorCities()`)
- Data helpers (`getOperatorClaims(assignedCities)`, `getOwnersForCity(assignedCities)`, `getOperatorBookings(assignedCities)`)

**Demo operator accounts:**
- `operator-lagos@checkbliss.com` (Lagos only) — password `checkbliss-demo-2026`
- `operator-abuja@checkbliss.com` (Abuja only) — password `checkbliss-demo-2026`
- `operator@checkbliss.com` (Lagos + Abuja multi-city) — password `checkbliss-demo-2026`

**File location:** `app/dashboard/operator/page.tsx`, `app/dashboard/operator/client.tsx`

---

## 3. Property Owners

**Route:** `/dashboard/owner` (6 tabs)

**Purpose:** Inventory supplier with limited platform interaction. Owners are not the primary users of the platform. Their interaction is intentionally simple because the city operator handles most operational needs.

### Responsibilities
- Providing property for CheckinBliss to list
- Maintaining property to CheckinBliss standards
- Blocking dates when property is unavailable (via WhatsApp with operator)
- Receiving guests according to platform protocols
- Responding to their city operator for any issues

### What the dashboard has (6 tabs)
- **Home** — Dashboard summary with stats, upcoming bookings, recent claims
- **Bookings** — Calendar of upcoming bookings with guest names and dates
- **Claims** — Damage claim viewer (read-only — operators initiate, owners can view resolutions)
- **Payouts** — Payout history and pending payouts
- **Calendar Sync** — iCal subscribe URL for Google/Outlook/Apple
- **Notifications** — Personal inbox

### What owners do NOT have
- Direct communication with guests (mediated by platform)
- Ability to set pricing (operator manages this in partnership with owner)
- Ability to modify property details (operator submits changes for approval)
- Damage claim initiation (operators initiate; owners can view resolutions)

**Primary interaction channel:** WhatsApp with their city operator. The web dashboard is secondary, for visual overview of bookings and earnings.

**Demo owner account:** `owner@checkbliss.com` (Adaora Mensah) — password `checkbliss-demo-2026`

**File location:** `app/dashboard/owner/page.tsx`, `app/dashboard/owner/client.tsx`

---

## 4. Guests

**Route:** No separate dashboard — public marketplace user

**Purpose:** Standard marketplace user. Browses publicly, books via the booking flow, accesses their account via magic links.

### What they have
- **Public browsing** — `/` (homepage), `/lagos`, `/abuja`, `/search`, `/[city]/[neighbourhood]/[building]/[property]` — no login required for discovery
- **Booking flow** — `/book/[slug]` (3-step client flow: guest details + dates → checkout option → payment)
- **Confirmation** — `/confirmation/[reference]` — booking reference, per-stay cards, payment summary, deposit explainer, "Add to calendar"
- **Status page** — `/booking/[token]` — magic-link deposit status + dispute entry
- **Login / signup** — `/login`, `/signup` (for accounts that want notification preferences)
- **Public account** — Account for booking history, profile, active bookings, damage claim viewer (if a claim is filed against their stay), basic communication with platform for issues

### What guests do NOT have
- Property management (operators)
- Claims adjudication (admin)
- Owner banking or financial reconciliation (admin)
- Damage claim initiation (operators initiate, guests can dispute via `/booking/[token]`)

**Standard e-commerce/marketplace user experience** — same pattern as Airbnb, Booking.com.

---

## Workflow handoffs

The four roles are not silos — they participate in shared workflows. Per the brief:

### Damage claim workflow
1. **Operator** runs post-checkout inspection (CLEAN / DAMAGE / NOSHOW / GUESTPRESENT)
2. **Operator** submits damage claim via `actions/claims-operator.ts` (`submitDamageClaim`)
3. **Admin** reviews claim in `/admin` or `/admin/crm/claims` and decides (approve / adjust / reject) via `decideClaim`
4. **Operator** sees the decision in their Claims tab; **Owner** sees it in their Claims tab (read-only)

### Property onboarding workflow
1. **Operator** sources property via "+ Onboard new property" or reviews submissions in Curation tab
2. **Operator** physically inspects the property, photographs it, verifies quality
3. **Operator** approves via `decideCuration` (mock) or sets to `approved` (Supabase)
4. **Owner** sees the new property in their `/dashboard/owner` Home tab

### Inspection workflow
1. **System** creates inspection row on booking confirmation (`actions/inspections.ts`)
2. **Operator** sees the inspection in their Today / Inspections tab (city-scoped)
3. **Operator** runs the inspection (Start → Complete) at checkout
4. **Operator** reports CLEAN / DAMAGE / NOSHOW / GUESTPRESENT
5. CLEAN → deposit released automatically; DAMAGE → claim workflow starts; NOSHOW → admin escalation

### Calendar sync
- **Owner** gets iCal subscribe URL in `/dashboard/owner` Calendar Sync tab
- **Guest** gets "Add to calendar" download in `/confirmation/[reference]`
- **Operator** doesn't see calendars directly — they coordinate via WhatsApp

---

## Authorisation enforcement

The four-role model is enforced at multiple layers:

### 1. Middleware (`middleware.ts`)
```ts
const roleRouteMap: Record<string, Role> = {
  "/admin": "admin",
  "/dashboard/operator": "operator",
  "/dashboard/owner": "owner",
};
// Redirects to /login if user.role !== requiredRole
```

### 2. Server-side session check
Every dashboard page calls `getSession()` (from `actions/auth.ts`) and renders only if the user has the correct role. In Supabase mode, the role is read from the `profiles` table.

### 3. Data-layer row-level access
City operators see only their assigned cities. The data helpers take `assignedCities` and filter results:
- `getOperatorClaims(assignedCities)`
- `getOwnersForCity(assignedCities)`
- `getOperatorBookings(assignedCities)`
- `operatorCanAccessCity(user, city)`
- `filterByAssignedCities(user, items)`

### 4. Mock-mode determinism
Demo operator accounts encode their city in the email:
- `operator-lagos@checkbliss.com` → `["Lagos"]`
- `operator-abuja@checkbliss.com` → `["Abuja"]`
- `operator@checkbliss.com` → `["Lagos", "Abuja"]` (multi-city)

All four roles use the same `checkbliss-demo-2026` password in mock mode.

---

## Why this structure

Per `.context/admin/operator.md`:

> **City operator dashboard is more substantial than currently built.**
> The operator is not a light user — they run their city.

> **Super admin dashboard is less operational than currently built.**
> The super admin does strategic oversight, not daily execution.

> **Row-level authorisation is essential for operators.**
> Lagos operator sees only Lagos data. Abuja operator sees only Abuja data.

> **Property owner dashboard should be lightweight.**
> It should be simple: calendar, bookings, earnings, basic settings.

The current implementation matches this exactly: operator dashboard has 9 tabs of operational tools, admin has 9 views of strategic + financial controls (no operational tools), owner has 6 lightweight tabs (no self-service pricing or messaging), guests use the public marketplace with no separate dashboard.
