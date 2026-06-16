# Post-Checkout Feedback — Version 1 (Launch)

**CheckinBliss** · PRD v2.3 §13. A lightweight feedback loop 24 hours after checkout, **separate** from the inspection workflow (§7) and the damage-claim flow. Reviews live on **Trustpilot only** — never on-platform.

---

## 1. Feedback Email Flow (PRD 13.1)

24 hours after checkout the guest receives an automated email:

> **Subject:** "How was your stay at [Property Name]?"
> **Body:** "We'd love to hear about your experience. Was it Good or Bad?"
> **[ GOOD ]   [ BAD ]**
> "Thank you for choosing CheckinBliss."

Branching:

- **GOOD** → thank-you message; **redirect to the Trustpilot review page** (channel positive sentiment to the public review platform).
- **BAD** → in-app text area for detailed feedback; submission **notifies admin and the city operator**; follow-up within 24 hours; the issue is **logged against the property's verification history**.

## 2. No On-Platform Reviews (PRD 13.2)

- **All reviews live on Trustpilot only.**
- Maintains the premium, curated brand.
- Prevents review manipulation.
- The **aggregate Trustpilot rating** is displayed on the platform (e.g. "4.8 on Trustpilot" in the header and booking panel) — but no per-property on-platform review widget exists.

## 3. Why This Design

The GOOD/BAD split is a quality gate: happy guests amplify CheckinBliss publicly on Trustpilot, while unhappy guests are routed **privately** to the team and operator for fast resolution and feed the property's verification record — protecting both the guest experience and the curated-inventory standard (PRD §1).

## 4. Relationship to Other Flows

| Flow | Timing | Purpose | Channel |
|---|---|---|---|
| Inspection (§7) | at checkout | operator damage check | WhatsApp (operator) |
| Damage claim (§7) | post-inspection | capture/release deposit | web + WhatsApp |
| **Feedback (§13)** | **24h after checkout** | **guest sentiment + Trustpilot** | **email (+ optional WhatsApp)** |

These are independent: a clean inspection and a BAD feedback response can coexist (e.g. no damage, but the guest disliked something), and the BAD path drives operational follow-up without touching the deposit.

## 5. Guest WhatsApp (optional, PRD 8.4)

For guests opted into WhatsApp, the post-checkout feedback prompt may also arrive there — but email is the primary channel.

## 6. Backend

- Scheduled job (`/api/cron/feedback`, hourly) sends the email 24h after each `confirmed`/`completed` checkout.
- GOOD → redirect link to Trustpilot.
- BAD → capture free-text, notify admin + city operator, append to the property's verification history.
- Aggregate Trustpilot rating cached for display on the storefront.