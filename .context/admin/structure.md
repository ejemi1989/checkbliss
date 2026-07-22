CheckinBliss Operational Structure — Dashboard Implementation Brief
Purpose
This document clarifies CheckinBliss’s operational structure so the dashboards accurately reflect how the platform actually operates. Please read this before further dashboard development.
Overview: We Are Not A Freelancer Marketplace
CheckinBliss is a curated marketplace with an embedded operational partner network. This is fundamentally different from platforms like Airbnb (open marketplace) or freelance networks (transactional relationships).
Our structure has four distinct roles:

Super Admin (Platform) — strategic oversight, financial control, final adjudication
City Operators (Lagos, Abuja) — embedded operational partners running each city
Property Owners — inventory suppliers with limited platform interaction
Guests — customers using the marketplace

Each role has distinct responsibilities, permissions, and dashboard needs.

Role 1: City Operator (Lagos, Abuja)
Not a freelancer. Not a customer support agent. An operational partner.
City operators are compensated through revenue share (5-7% of city revenue) and have substantial autonomy within their city. They are the CheckinBliss operational presence on the ground.
Day-to-Day Responsibilities

Sourcing new property owners for their city
Conducting physical property inspections before listing approval
Photographing properties (or coordinating photography)
Onboarding property owners including WhatsApp channel setup
Monthly re-verification of all properties in their city (with photographic documentation)
Post-checkout inspections with CLEAN/DAMAGE/NOSHOW/GUESTPRESENT reporting
Submitting damage claims with photos and cost estimates
First-line issue resolution during guest stays
Maintaining quality standards across their city inventory
Coordinating with local vendors (photographers, cleaners if needed)

Dashboard Requirements

Property inventory view for their assigned city only
Property status tracker (draft, pending review, approved, live, suspended)
Verification history log per property (with photos and notes)
Inspection queue showing upcoming checkouts requiring inspection
Damage claim submission interface with photo upload
Owner directory for their city with contact information
Bookings view for their city with guest details for stays in progress
Basic performance metrics (properties verified, inspections completed, quality scores)
Onboarding workflow for new properties

What They Should NOT Have Access To

Other cities’ data
Platform-wide financial data
Other operators’ performance
Guest personal financial information (payment details)
Owner banking details
Platform strategic settings

Authorization Principle: Row-level access scoped to their assigned city. If an operator is assigned to multiple cities, they see only their assigned cities.

Role 2: Super Admin (Platform)
Strategic oversight and financial control, not daily operations.
Day-to-Day Responsibilities

Platform-wide performance monitoring
Damage claim final review and adjudication (approve, adjust, reject)
Dispute resolution when guests dispute a damage claim
Financial reconciliation across all cities
Payout approval and management
Operator management (creating operators, assigning cities, reviewing performance)
Property suspension decisions across the platform
Platform-wide policy settings and standards
Investor and partner communications
Expansion planning for new cities and markets

Dashboard Requirements

Platform-wide overview with aggregate metrics
All cities visible with drill-down to individual city performance
Damage claim review queue (with all evidence, history, and action buttons)
Financial reconciliation views (payments received, payouts made, reserves held)
Operator management (create, assign, review performance)
User management (guests, owners, operators)
Platform-wide search across properties, bookings, users
Reports and analytics
Audit logs for sensitive actions
Platform configuration settings

What Super Admin Does NOT Do Daily

Physical property inspections
Damage claim initial reporting
Owner communication for individual bookings
New property sourcing

Super Admin is escalation and oversight. Operators handle operational work.

Role 3: Property Owner
Inventory supplier with limited platform interaction.
Responsibilities

Providing property for CheckinBliss to list
Maintaining property to CheckinBliss standards
Blocking dates when property is unavailable (via WhatsApp with operator)
Receiving guests according to platform protocols
Responding to their city operator for any issues

Dashboard Requirements

Their properties view (usually 1-5 properties)
Booking calendar showing occupancy
Upcoming bookings with guest names and dates
Payout history and pending payouts
Simple earnings view
Basic profile settings

What They Should NOT Have

Direct communication with guests (mediated by platform)
Ability to set pricing (operator manages this)
Ability to modify property details (operator submits changes for approval)
Damage claim initiation (operators initiate; owners can view resolutions)

Primary interaction channel: WhatsApp with their city operator. The web dashboard is secondary.

Role 4: Guest
Standard marketplace user.
Needs

Public browsing (no login required for discovery)
Booking flow with payment
Guest account with booking history, profile, active bookings
Damage claim viewer (if a claim is filed against their stay)
Basic communication with platform for issues


Structural Implications For Dashboard Development
Most important rebuilds needed:

City Operator Dashboard is more substantial than currently built
Operators run their city. Needs proper inventory management, verification tracking, damage claim submission, inspection workflow, and performance metrics.
Super Admin Dashboard is less operational than currently built
Focus on strategic oversight and adjudication. Operational tasks belong to operators.
Row-level authorization is essential for operators
Lagos operator sees only Lagos data, etc. Must be enforced at the database level.
Property Owner Dashboard should be lightweight
Keep it simple to avoid creating false expectations of full self-service.
Workflow states should reflect operator/admin separation
Example: Damage claims → Operator submits → Admin reviews → Operator informed.


Questions To Guide Rebuild
Please review the current dashboards against these questions:

Can Lagos operator perform their day-to-day tasks (inspection, verification, damage claim submission, property onboarding) without super admin involvement?
Can super admin oversee platform performance and adjudicate damage claims without performing operational tasks like physical verification?
Are city operators properly scoped by city with row-level authorization preventing cross-city access?
Does the property owner dashboard focus only on essential needs (calendar, bookings, earnings) without over-complicating?
Are the workflow handoffs between operator and admin (damage claims, property approval, dispute resolution) properly designed with both roles participating?


Next Steps

Review current dashboards against this structural document
Identify specific corrections needed (list them)
Propose implementation approach for corrections
Estimate additional time and cost (if any)

Timeline: Aim to lock the structural corrections within the next week so remaining development builds on the correct foundation.
Reach out with any clarifying questions.