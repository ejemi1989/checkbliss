# Design System — Version 2 (Phase 2)

**CheckinBliss** · PRD v2.3 §2B, §12.3, §1. Phase 2 extends the V1 editorial language to new verticals and media without changing its foundations. The Plum Guide / Mr Porter direction, typography, and tokens from V1 carry forward unchanged; V2 adds patterns for **Lifestyle**, **Editorial Reels**, and **multi-region**.

---

## 1. What V2 Adds

| Surface | Driver | PRD |
|---|---|---|
| Editorial Reels — video content system | new media type | 12.3 |
| Nightlife — venue cards, table-tier selection | Lifestyle | 2B |
| Experiences — event/slot cards, capacity display | Lifestyle | 2B |
| Concierge — request composer surface | Lifestyle | 2B |
| Loyalty — tier/benefit display | repeat-guest | 12.3 |
| Multi-region — currency & locale surfacing | expansion | 1 |

## 2. Carried Forward Unchanged (from V1)

Typography pairing, the full token set, white-space discipline, magazine grid, large imagery, asymmetry, minimal chrome, editorial control (no UGC, Trustpilot-only reviews), accessibility/motion rules. V2 introduces **no** new base palette or type system — only new component patterns built from the V1 tokens.

## 3. Editorial Reels (PRD 12.3)

A video layer under the same editorial-control principle as imagery (no user-generated content). Design rules:

- Reels are **editorial set pieces**, not social feeds — full-bleed, muted-by-default, serif overlay titles, brass progress indicator.
- They sit within property/experience detail and a curated home rail — never an infinite scroll.
- Same `draft → pending_review → approved` gating as properties; nothing publishes without operator/admin approval.

## 4. Lifestyle Verticals (PRD 2B)

Each vertical reuses the V1 **card → detail → booking-panel** rhythm so the catalogue feels unified:

- **Nightlife** — venue card (name in serif, city · district, ambience indicator), detail with table-tier selection; capacity shown as availability, never as a pressure tactic.
- **Experiences** — event card with date/slot, capacity as "X seats remaining" in the same understated metadata weight as "Late checkout."
- **Concierge** — a quiet request composer, editorial copy, no aggressive CTAs — matching the luxury, low-chrome tone.

## 5. Loyalty (PRD 12.3)

Tier and benefits rendered with restraint — brass tier marker, benefits as editorial list items, points shown as a quiet figure, never gamified badges. Consistent with premium positioning (no mass-market loyalty UI).

## 6. Multi-Region (PRD 1)

As CheckinBliss reaches Port Harcourt, then Ghana/Kenya/South Africa:

- The GBP/USD/EUR display toggle generalises to per-region display currencies via the `regions.display_currency` reference; NGN and other locals remain display-only where applicable.
- City navigation extends to country/region grouping while keeping the navigation-not-filter principle (PRD 6.4).
- Editorial tone is held constant across regions; only inventory and currency change.

## 7. Continuity

V2 is a vocabulary extension, not a redesign. A guest moving from a Lagos stay to an Abuja nightlife table to a 2028 Accra experience sees one consistent editorial brand — the V1 system simply applied to more content types and more regions.updat