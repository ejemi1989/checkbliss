# Engineering Delivery — Version 1 (Launch-Critical)

**CheckinBliss** · PRD v2.3 §12.5, §14. What the PRD formally **requests back from the lead engineer** for the Launch-Critical tier, and the build's position against each ask. Launch target: **public launch September 1, 2026**; Launch-Critical complete by **mid-August 2026** (2 weeks of testing before launch).

---

## 1. Engagement Asks (PRD 12.5 / 14)

The engineer is asked to provide:

1. **Fixed-cost quote — Launch-Critical** (§12.1) with confidence interval.
2. **Fixed-cost quote — Launch-Supporting** (§12.2) with confidence interval. *(see V2)*
3. **Combined timeline** — Launch-Critical complete by mid-August 2026; Launch-Supporting between launch (Sept 1) and 6 weeks post-launch.
4. **Hosting infrastructure recommendation** (AWS / GCP / Vercel / Railway / other) with estimated monthly costs.
5. **Technology stack confirmation** (backend framework, frontend framework, deployment approach).
6. **NGN payout integration approach** for the chosen partner (Africhange or Yolat, confirmed before integration).
7. **Pre-launch testing plan** — end-to-end booking, payment, deposit hold, inspection, damage claim.
8. **Honest identification** of any Launch-Critical features that should move to Launch-Supporting given the timeline, with rationale.
9. **Post-launch support model** and ongoing engineering capacity.
10. **Two references** from prior production builds, ideally marketplace or payment-heavy platforms.

## 2. Stack Confirmation (ask 5)

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js 16 (App Router) | server-rendered editorial UX; one deployable |
| Backend | Next.js Route Handlers (Node) | no separate API server; co-located with frontend |
| Database | Supabase (PostgreSQL) | GiST exclusion constraint for double-booking; RLS |
| Styling | Tailwind CSS v4 | token-driven design system (§3) |
| Payments | Airwallex | hosted fields (no PCI scope), manual-capture holds |
| Messaging | WhatsApp Business (Meta Cloud API) | owner/operator field ops |
| Validation | Zod | request validation at every API edge |

## 3. Hosting Recommendation (ask 4)

**Vercel** for the Next.js app + Cron, **Supabase** managed Postgres.

| Item | Indicative monthly |
|---|---|
| Vercel (Pro, incl. Cron) | ~$20 + usage |
| Supabase (Pro) | ~$25 + usage |
| WhatsApp Business API | per-conversation pricing (Meta) |
| Airwallex | per-transaction fees (no fixed monthly) |
| Email (transactional) | ~$15–30 |

*Indicative only — to be firmed with traffic projections. Alternative: AWS/GCP if procurement requires, at higher ops overhead.*

## 4. NGN Payout Approach (ask 6)

Africhange **or** Yolat — partner confirmed **before** integration (PRD 2D). Funds collect in GBP to the platform Airwallex account; the payout layer handles the GBP→NGN leg, **consolidated per owner per period** (PRD 9.3). Integration is gated on partner selection and is a Launch-Critical dependency.

## 5. Pre-Launch Testing Plan (ask 7)

End-to-end coverage of the five critical workflows:

1. **Booking** — single + multi-city atomic; 14-day rule; double-booking rejection (concurrent attempts).
2. **Payment** — charge auto-capture; Apple/Google Pay; idempotency on retry; failure → group cancel + dates released.
3. **Deposit hold** — manual-capture authorise; clean release; 7-day backstop release.
4. **Inspection** — pre-notice, prompt, CLEAN/DAMAGE/NOSHOW/GUESTPRESENT, 4h reminder, 48h escalation.
5. **Damage claim** — operator report + photos → admin Approve/Adjust/Reject → partial/full capture → guest 7-day dispute.

The build's **mock mode** (no Supabase/Airwallex/WhatsApp credentials needed) lets all five be exercised before live credentials exist.

## 6. Features That Could Move to Launch-Supporting (ask 8)

Honest candidates to defer if the mid-August date is at risk, with rationale:

| Candidate | Rationale to defer |
|---|---|
| Post-booking late-checkout opt-in email | Pure upsell; Extended is selectable at booking. Already Tier-2 in PRD 12.2. |
| Full reconciliation job | At ~30 properties, manual/daily DB checks suffice short-term. Already Tier-2. |
| Owner `EARNINGS` / `DAMAGE HISTORY` WhatsApp queries | Web dashboard covers these at launch. Already Tier-2. |
| Multi-currency display polish (USD/EUR) | GBP-only display would still allow launch; FX display is cosmetic. |

None of the **safety-critical** items (atomic booking, deposit holds, inspection/damage, signature-verified webhooks) are deferrable.

## 7. Post-Launch Support Model (ask 9)

- Founder-as-admin handles the ~1–3 claims/month and direct-DB admin tasks at launch scale (PRD 12.1 / 7.6).
- On-call for payment/webhook incidents; audit log + reconciliation (Tier-2) for financial assurance.
- Ongoing capacity sized to deliver Launch-Supporting within 6 weeks post-launch.

## 8. References (ask 10)

Two prior production builds, ideally marketplace or payment-heavy — to be supplied with the quote.