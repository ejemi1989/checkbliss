# CheckinBliss Operational Structure — Dashboard Implementation Brief

## Purpose

This document clarifies CheckinBliss's operational structure so the dashboards accurately reflect how the platform actually operates. Please read this before further dashboard development.

## Overview: We Are Not A Freelancer Marketplace

CheckinBliss is a curated marketplace with an embedded operational partner network. This is fundamentally different from platforms like Airbnb (open marketplace) or freelance networks (transactional relationships).

Our structure has four distinct roles:

1. **Super Admin (Platform)** — strategic oversight, financial control, final adjudication
2. **City Operators (Lagos, Abuja)** — embedded operational partners running each city
3. **Property Owners** — inventory suppliers with limited platform interaction
4. **Guests** — customers using the marketplace

Each role has distinct responsibilities, permissions, and dashboard needs.

---

## Role 1: City Operator (Lagos, Abuja)

*Not a freelancer. Not a customer support agent. An operational partner.*

City operators are compensated through revenue share (5–7% of city revenue) and have substantial autonomy within their city. They are the CheckinBliss operational presence on the ground.

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

### What they need in their dashboard
- Property inventory view for their assigned city (Lagos operator sees only Lagos properties)
- Property status tracker (draft, pending review, approved, live, suspended)
- Verification history log per property with photos and notes
- Inspection queue showing upcoming checkouts requiring inspection
- Damage claim submission interface with photo upload
- Owner directory for their city with contact information
- Bookings view for their city with guest details for stays in progress
- Basic performance metrics (properties verified, inspections completed, quality scores)
- Onboarding workflow for new properties

### What they should NOT have access to
- Other cities' data (Lagos operator cannot see Abuja properties)
- Platform-wide financial data
- Other operators' performance
- Guest personal financial information (payment details)
- Owner banking details
- Platform strategic settings

**Authorisation principle:** row-level access scoped to their assigned city. If an operator is assigned to multiple cities (rare, but possible), they see all their assigned cities but not others.

---

## Role 2: Super Admin (Platform)

*Strategic oversight and financial control, not daily operations.*

The super admin handles what operators cannot: platform-wide decisions, financial reconciliation, dispute adjudication, and expansion planning.

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

### What they need in their dashboard
- Platform-wide overview with aggregate metrics
- All cities visible with drill-down to individual city performance
- Damage claim review queue (with all evidence, history, and action buttons)
- Financial reconciliation views (payments received, payouts made, reserves held)
- Operator management (create, assign, review performance)
- User management (guests, owners, operators)
- Platform-wide search across properties, bookings, users
- Reports and analytics
- Audit logs for sensitive actions
- Platform configuration settings

### What super admin does NOT do daily
- Physical property inspection (operators do this)
- Damage claim initial reporting (operators do this)
- Owner communication for individual bookings (operators do this)
- New property sourcing (operators do this)

> Super admin is escalation and oversight. Operators do the operational work.

---

## Role 3: Property Owner

*Inventory supplier with limited platform interaction.*

Property owners are not the primary users of the platform. Their interaction is intentionally simple because the city operator handles most operational needs.

### Responsibilities
- Providing property for CheckinBliss to list
- Maintaining property to CheckinBliss standards
- Blocking dates when property is unavailable (via WhatsApp with operator)
- Receiving guests according to platform protocols
- Responding to their city operator for any issues

### What they need in their dashboard
- Their properties view (usually 1–5 properties)
- Booking calendar showing occupancy
- Upcoming bookings with guest names and dates
- Payout history and pending payouts
- Simple earnings view
- Basic profile settings

### What they should NOT have
- Direct communication with guests (mediated by platform)
- Ability to set pricing (operator manages this in partnership with owner)
- Ability to modify property details (operator submits changes for approval)
- Damage claim initiation (operators initiate; owners can view resolutions)

**Primary interaction channel:** WhatsApp with their city operator. The web dashboard is secondary, for visual overview of bookings and earnings.

---

## Role 4: Guest

*Standard marketplace user.*

Guests use the public website to browse and book. Their account is simple.

### What they need
- Public browsing (no login required)
- Booking flow with payment
- Guest account with booking history, profile, active bookings
- Damage claim viewer (if a claim is filed against their stay)
- Basic communication with platform for issues

Standard e-commerce/marketplace user experience.

---

## Structural Implications For Dashboard Development

The most important rebuilds needed:

**1. City operator dashboard is more substantial than currently built.**
The operator is not a light user — they run their city. Their dashboard needs proper inventory management, verification tracking, damage claim submission, inspection workflow, and performance metrics. Currently seems to be built as a limited role; needs expansion.

**2. Super admin dashboard is less operational than currently built.**
The super admin does strategic oversight, not daily execution. If the current admin dashboard is built with "admin does everything," it's misaligned. Admin should have visibility into everything but only execute strategic and adjudication tasks. Operational tasks belong to operators.

**3. Row-level authorisation is essential for operators.**
Lagos operator sees only Lagos data. Abuja operator sees only Abuja data. Not just filtered display — actual authorisation at the database level so operators cannot access other cities' data through URL manipulation or API calls.

**4. Property owner dashboard should be lightweight.**
It should be simple: calendar, bookings, earnings, basic settings. Complex owner dashboards create expectations of self-service that don't match our operational model.

**5. Workflow states should reflect operator/admin separation.**
For example, damage claims: operator submits → admin reviews → operator informed of decision. Two separate roles in the workflow, not one super-admin doing everything.

---

## Questions To Guide Rebuild

Please review the current dashboards against these questions and let me know where corrections are needed:

1. Can Lagos operator perform their day-to-day tasks (inspection, verification, damage claim submission, property onboarding) without super admin involvement?
2. Can super admin oversee platform performance and adjudicate damage claims without needing to perform operational tasks like physical verification?
3. Are city operators properly scoped by city with row-level authorisation preventing cross-city access?
4. Does the property owner dashboard focus on their essential needs (calendar, bookings, earnings) without over-complicating?
5. Are the workflow handoffs between operator and admin (damage claims, property approval, dispute resolution) properly designed with both roles participating?

---

## Next Steps

1. Review current dashboards against this structural document
2. Identify specific corrections needed (list them, don't just rebuild)
3. Propose implementation approach for corrections
4. Estimate additional time and cost if any

**Timeline:** aiming to lock the structural corrections within the next week so remaining development builds on the correct foundation.

Reach out with any clarifying questions.