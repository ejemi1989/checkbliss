# Engineering Delivery — Version 2 (Launch-Supporting & Phase 2)

**CheckinBliss** · PRD v2.3 §12.2 (Launch-Supporting), §12.3 (Phase 2), §14. The delivery plan beyond launch: the Tier-2 features due **weeks 2–6 post-launch**, then the 2027+ Phase 2 roadmap. Complements the Launch-Critical response in V1.

---

## 1. Launch-Supporting — Tier 2 (PRD 12.2)

Delivered between launch (Sept 1, 2026) and **6 weeks post-launch**. Enhancements, not launch blockers:

| Feature | PRD | Notes |
|---|---|---|
| Full four-tier late checkout (Late/Extended/Day-of-flight at 10/40/60%) | 6.3 | per-tier owner config; see Late-Checkout-V2 |
| Full owner web dashboard (edit, pricing, deposit/checkout config) | 9.2 | edits via operator editorial approval |
| Full admin dashboard (claim analytics, operator performance, photo gallery) | 7.6 | over the simple launch review |
| Post-booking late-checkout opt-in (24–48h after booking) | 6.7 | upsell email/notification |
| `DAMAGE HISTORY` / `EARNINGS` owner WhatsApp queries | 8.2 | self-service over the bot |
| Operator weekly performance summary via WhatsApp | 8.3 | mirrors web performance view |
| Daily reconciliation job (Airwallex vs internal) | 12.2 | financial assurance at growing volume |
| Sweep job for abandoned checkouts (auto-cancel after intent expiry) | 12.2 | frees stale held inventory |

These require **no schema restructure** — the Launch-Critical schema already carries the necessary columns; Tier-2 adds analytics views and the reconciliation checkpoint table.

## 2. Engagement Ask — Tier-2 Quote (PRD 12.5)

The engineer provides a **separate fixed-cost quote for Launch-Supporting** with a confidence interval, plus a timeline showing delivery between launch and 6 weeks post-launch (PRD 14). The combined timeline pairs this with the mid-August Launch-Critical completion.

## 3. Phase 2 Roadmap — 2027+ (PRD 12.3)

| Feature | PRD | Delivery shape |
|---|---|---|
| Editorial Reels (video content system) | 12.3 | media pipeline: ingest → transcode → CDN |
| Nightlife booking (table reservations) | 2B, 12.3 | slot/capacity inventory vertical |
| Experiences booking (events, restaurants) | 2B, 12.3 | seat-capacity vertical |
| Concierge services | 2B | request/fulfilment workflow |
| "Book together, pay separately" (split payment) | 12.3 | per-payer intents on the booking group |
| AI conversational WhatsApp interface | 12.3 | NLU over the V1 command set |
| Property investment advisory (CheckinBliss Investment Services) | 12.3 | separate bounded context |
| Advanced analytics & reporting | 12.3 | warehouse / materialised views |
| Loyalty programmes & repeat-guest features | 12.3 | points/tier model |

## 4. Geographic Expansion (PRD 1)

| Stage | Markets | Delivery dependency |
|---|---|---|
| Phase 2 | **Port Harcourt** | additional operator network; existing city-scope model |
| 2028 | **Ghana, Kenya, South Africa** | per-country payout rails + display currencies; `regions` reference |

The operator city-scope (`operator_assignments`) and the source-of-truth/double-booking invariants generalise to new regions without rework.

## 5. Architectural Continuity (PRD 12.4 boundaries)

Phase 2 still honours the V1 out-of-scope boundaries where they remain policy:
- **No on-platform reviews** — Trustpilot only, permanently (PRD 13.2).
- **No user-generated content** — editorial control extends to Reels and Lifestyle.
- Smart-lock integration, automated dynamic pricing, native mobile apps, and loyalty were V1-excluded (PRD 12.4); loyalty and (potentially) native apps become Phase 2 candidates, the others remain deferred unless re-scoped.

## 6. Delivery Sequencing (recommended)

1. **Weeks 2–6:** Tier-2 (full dashboards, four-tier checkout, reconciliation, sweep) — hardens the launched product.
2. **2027 H1:** split payment + AI conversational bot — highest-leverage UX wins on the existing Stays base.
3. **2027 H2:** Lifestyle verticals (Nightlife, Experiences, Concierge) + Reels — the generalised booking core.
4. **2027–2028:** Investment Services, advanced analytics, loyalty, multi-region.

## 7. Support & Capacity (PRD 14)

Post-launch support scales with volume: founder-admin at launch scale → dedicated ops as claim volume and verticals grow. The reconciliation and analytics layers provide the financial and operational assurance needed before opening new regions.