# Post-Checkout Feedback — Version 2 (Phase 2)

**CheckinBliss** · PRD v2.3 §13 + §12.3. Phase 2 keeps the V1 feedback flow and the **Trustpilot-only** review policy exactly as launched, and adds analytics, loyalty linkage, and multi-vertical feedback. The core principle — no on-platform reviews — is **not** relaxed.

---

## 1. Unchanged Core (PRD 13)

- 24h-post-checkout GOOD/BAD email, identical copy and branching (GOOD → Trustpilot, BAD → private follow-up + verification history).
- **All reviews remain on Trustpilot only** (PRD 13.2). No on-platform review widget is ever introduced — this protects the premium, curated brand and prevents manipulation.
- Aggregate Trustpilot rating displayed platform-wide.

## 2. What V2 Adds

| Addition | Driver | PRD |
|---|---|---|
| Feedback analytics in the admin dashboard | advanced analytics | 12.3 |
| Multi-vertical feedback (Nightlife, Experiences) | Lifestyle | 2B, 12.3 |
| Loyalty linkage on positive sentiment | loyalty programme | 12.3 |

## 3. Feedback Analytics (PRD 12.3)

The BAD-path data, previously logged per property, becomes a reporting surface:
- BAD-response rate per property, per operator, per city/region.
- Recurring-issue clustering to surface systemic problems early.
- Correlation with verification history and damage-claim patterns.

Delivered as read models over the existing feedback log — no change to the guest-facing flow.

## 4. Multi-Vertical Feedback (PRD 2B)

As Lifestyle launches, the same GOOD/BAD pattern extends to **Nightlife** (table booking) and **Experiences** (event/slot) — 24h after the event. GOOD still routes to Trustpilot; BAD still routes privately to the relevant operator/venue and that vertical's quality record. The pattern is identical; only the subject changes.

## 5. Loyalty Linkage (PRD 12.3)

A guest who leaves feedback (either branch) may earn loyalty points — **never** contingent on leaving a *positive* review (which would corrupt Trustpilot integrity). Points reward engagement, not sentiment; the Trustpilot redirect remains a neutral invitation, not a paid incentive.

## 6. Multi-Region (PRD 1)

Feedback flows generalise per region with localised copy and the region's Trustpilot presence. Analytics roll up per region for the admin overview.

## 7. Continuity

| Concern | V1 | V2 |
|---|---|---|
| GOOD/BAD email | yes | unchanged |
| Reviews | Trustpilot only | unchanged — never on-platform |
| BAD follow-up | admin + operator, verification history | + analytics clustering |
| Verticals | Stays | + Nightlife, Experiences |
| Loyalty | — | engagement points (never sentiment-gated) |

V2 deepens insight and extends reach without ever compromising the Trustpilot-only, no-manipulation review stance.