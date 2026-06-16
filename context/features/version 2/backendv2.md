# Phase 2 — Backend Architecture

**CheckinBliss** · derived from PRD v2.3 §2B, §1, §12.3. Phase 2 is the post-launch evolution (2027+): the **Lifestyle** module, geographic expansion, and the capabilities explicitly deferred from V1. It builds on the Phase 1 backend without replacing it.

---

## 1. What Phase 2 Adds (PRD 12.3 + 2B)

| Capability | PRD |
|---|---|
| **Lifestyle module** — Nightlife (clubs, lounges, table bookings), Experiences (festivals, curated dining, beach houses), Concierge | 2B |
| Editorial Reels — video content system | 12.3 |
| Nightlife booking — table reservations | 12.3 |
| Experiences booking — events, restaurants | 12.3 |
| "Book together, pay separately" — split payment (deferred from v2.1) | 12.3 |
| AI conversational WhatsApp interface (V1 is command-based) | 12.3, 8 |
| Property investment advisory — CheckinBliss Investment Services | 12.3 |
| Advanced analytics & reporting | 12.3 |
| Loyalty programmes & repeat-guest features | 12.3 |
| **Geographic expansion** — Port Harcourt (Phase 2); Ghana, Kenya, South Africa (2028) | 1 |

## 2. System Shape (evolution, not rewrite)

Phase 1's spine — Next.js on Vercel, Supabase source of truth, Airwallex payments, WhatsApp ops — is retained. Phase 2 introduces **bookable inventory types beyond Stays**, which generalises the booking engine, plus a media pipeline and a conversational layer.

```
        ┌───────────────── Vercel (Next.js) ─────────────────┐
        │  Stays  │  Nightlife  │  Experiences  │  Concierge  │   ← unified booking core
        └────┬────────────┬────────────┬─────────────┬────────┘
             ▼            ▼            ▼             ▼
        Supabase    Media pipeline   Airwallex    AI/LLM layer
      (multi-city,  (Reels: ingest,  (+ split     (NLU over the
       multi-vert)   transcode, CDN)  payments)    WhatsApp bot)
```

## 3. Generalised Booking Core

The Phase 1 `reservations` model is specialised to apartment stays. Phase 2 abstracts it to a **bookable resource** with type-specific availability:

- **Stays** — date-range exclusion (unchanged).
- **Nightlife** — time-slot + table-capacity inventory (a club table on a given night), not date ranges.
- **Experiences** — fixed-capacity event slots (a festival, a dining seating).
- **Concierge** — request/fulfilment workflow rather than fixed inventory.

The atomicity guarantee generalises: a mixed cart (stay + a table booking + an experience) confirms wholly or rolls back wholly. Split payment (below) layers onto this.

## 4. Split Payment — "Book together, pay separately" (PRD 12.3)

Deferred from v2.1 "due to complexity." The architecture: a booking group splits into **per-payer payment intents**, each guest paying their share via their own Airwallex hosted-fields session. The group confirms only when **all** shares authorise; if any share lapses past its expiry, the group's reservations release. Deposit holds split per payer or fall to a nominated lead guest. This sits on top of the Phase 1 atomic-group model — the group is the unit of confirmation, now with N payment intents instead of one.

## 5. AI Conversational WhatsApp Layer (PRD 8 → 12.3)

V1 is strictly command-based (`BLOCK`, `CLEAN`, …). Phase 2 adds a natural-language understanding layer **in front of** the existing strict parser: the LLM maps free text to the same validated command set, and anything ambiguous still falls through to strict confirmation rather than guessing. The security model (signature verification, sender matching, audit) is unchanged — the AI never bypasses authorisation or the fail-closed principle.

## 6. Media Pipeline — Editorial Reels (PRD 12.3)

A new ingest → transcode → CDN path for editorial video, kept under the same editorial-control principle as imagery (no user-generated content). Storage in Supabase Storage (or external object store) with signed delivery; metadata in a `reels` table linked to properties/experiences.

## 7. CheckinBliss Investment Services (PRD 12.3)

A distinct service line (property investment advisory) — architecturally a separate bounded context with its own data and access model, surfaced through the same brand shell but not coupled to the booking core.

## 8. Multi-Region Expansion (PRD 1)

- **Port Harcourt** (Phase 2) and **Ghana / Kenya / South Africa** (2028) extend the existing `city`-scoped model. Operator row-level scoping (`operator_assignments`) already generalises to new cities/countries.
- New regions imply additional **payout rails** beyond the NGN layer (per-country partners), additional **display currencies**, and per-region operator networks. The source-of-truth and double-booking invariants are unchanged.

## 9. Analytics & Loyalty (PRD 12.3)

- **Advanced analytics** — a reporting layer (warehouse/materialised views) over bookings, occupancy, claim patterns, operator performance, and revenue by city/vertical.
- **Loyalty & repeat-guest** — a points/benefits model keyed to the guest profile; explicitly out of scope for V1 (12.4) and introduced here.

## 10. Continuity with Phase 1

Phase 2 preserves every Phase 1 invariant: internal calendar as source of truth, double-booking as a DB constraint, deposits as holds, PCI-DSS avoidance via hosted fields, role/surface separation, and fail-closed bot parsing. Nothing in Phase 2 relaxes these.