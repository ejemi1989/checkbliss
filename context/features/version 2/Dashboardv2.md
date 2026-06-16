# Dashboards — Version 2 (Full)

**CheckinBliss** · PRD v2.3 §9.2, §7.6 (Launch-Supporting), with Phase 2 analytics. The expansion from minimal launch dashboards to full functionality, weeks 2–6 post-launch and beyond. Surface separation and owner-grouping rules from V1 are unchanged.

---

## 1. Owner — Full Web Dashboard (PRD 9.2)

Within weeks 2–6 post-launch, the minimal owner dashboard expands to full functionality:

- **Edit property details** (subject to operator editorial approval).
- **Upload photos** for review.
- **Set and adjust pricing** per listing.
- **Configure late checkout** availability and pricing per listing (the full four-tier structure — see Late-Checkout-V2).
- **Configure security deposit** amount per listing (within tier guidance).
- **View damage claim history** per listing.
- **Consolidated performance metrics** across listings.

The V1 read-only listing view becomes editable, but edits still pass through **operator editorial approval** — the curated-inventory principle (PRD §1) is preserved even when owners self-serve.

## 2. Admin — Full Dashboard with Analytics (PRD 7.6)

Once volume grows (Year 2 onwards), the simple claim review expands:

- **Damage claim history per property** — frequency, average claim size.
- **Operator damage claim history** — surfaces over-reporting patterns.
- **Guest claim history** — surfaces pattern abuse.
- **Photo gallery viewer** with annotation tools.
- **Bulk action capabilities.**

The three core actions are unchanged in both phases — **Approve · Adjust · Reject** — V2 simply adds the analytics and tooling around them. (Adjust example from the PRD: operator estimates ₦20,000, admin reviews photos and adjusts to ₦15,000.)

## 3. Owner WhatsApp — Query Commands (PRD 12.2)

Launch-Supporting adds owner self-service queries over WhatsApp:
- `DAMAGE HISTORY <listing>` — claim history for a unit (last 90 days).
- `EARNINGS` — recent and pending payouts.

These complement, not replace, the web earnings statement.

## 4. Operator WhatsApp — Performance Summary (PRD 12.2)

Operators receive a **weekly performance dashboard summary** via WhatsApp: properties verified, quality scores, inspections completed — mirroring the web performance view for field convenience.

## 5. Phase 2 Analytics & Reporting (PRD 12.3)

Advanced analytics (Phase 2) layers a reporting surface over the operational data:
- Occupancy and revenue by city and **vertical** (Stays / Nightlife / Experiences).
- Claim and operator patterns at scale.
- Supply-side growth against targets per region.

Delivered as materialised views / a warehouse layer over operational tables — read models, not new write paths.

## 6. Multi-Region (PRD 1)

As regions are added (Port Harcourt; Ghana/Kenya/South Africa, 2028), the operator city-scope model generalises directly — operators remain scoped to assigned cities/regions, and admin overview rolls up per region. No change to the authorisation model.

## 7. Continuity

| Concern | V1 | V2 |
|---|---|---|
| Owner listing | read-only | editable (operator-approved) |
| Owner config (price/deposit/checkout) | operator-managed | owner self-serve within guidance |
| Admin claim review | simple, 3 buttons | + analytics, gallery, bulk actions |
| Operator scope | city row-level | unchanged, generalises to regions |
| Surface separation | guest/owner/operator/admin | unchanged |
| Owner grouping & consolidated payouts | yes | unchanged |

V2 adds depth and self-service; it relaxes none of the V1 separation or editorial-control guarantees.