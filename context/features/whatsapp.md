# WhatsApp Messaging — Version 1 (Launch)

**CheckinBliss** · PRD v2.3 §8. The launch bot is **command-based** with structured prompts (AI conversational interface is Phase 2). Three roles — owners, operators, and optionally guests — each with its own command set and notification copy. One thread per owner (PRD 8.2).

---

## 1. Design Principle — Right Tool per Role (PRD 8.1)

| Role | On WhatsApp | On web |
|---|---|---|
| Owner | notifications, simple actions (block dates, query status) | minimal dashboard |
| Operator | inspection prompts, report results, upload photos | review/curation dashboard |
| Admin | — | review damage claims, decide outcomes |
| Guest | optional notifications | book, manage, dispute |

## 2. Owner Commands (PRD 8.2)

| Command | Action |
|---|---|
| `BLOCK [range] [listing]` | Block dates on a specific unit, e.g. `BLOCK 15-20 Sept Sunset Dove Unit 2` |
| `UNBLOCK [range] [listing]` | Unblock previously blocked dates |
| `AVAILABILITY [listing] [month]` | Query availability calendar |
| `BOOKINGS` | List upcoming bookings across all units |
| `EARNINGS` | Recent & pending payouts *(Launch-Supporting)* |
| `DAMAGE HISTORY [listing]` | Claim history, last 90 days *(Launch-Supporting)* |
| `HELP` | List available commands |

**One thread per owner, not per listing** — each notification names the specific unit (e.g. "Sunset Dove · Unit 2").

## 3. Owner Notifications — Automated Copy (PRD 8.2)

| Trigger | Message |
|---|---|
| New booking | "New booking: Sunset Dove Unit 2, Sept 15–19, 4 nights, £480 total. Guest: Adaeze O." |
| Pre-checkout (24h) | "Reminder: Adaeze O. checking out tomorrow from Sunset Dove Unit 2 at 11:00 AM. Inspection scheduled." |
| Post-checkout clean | "Checkout clean — Sunset Dove Unit 2. No damage reported. Payout on schedule for [date]." |
| Post-checkout damage | "Damage reported — Sunset Dove Unit 2. Operator filing claim. Update within 24–48 hours." |
| Damage resolution | "Damage claim resolved — Sunset Dove Unit 2. £8 captured for kettle, added to next payout." |
| Payout processed | "Payout processed: £422 to your account for the week ending [date]. Statement available in dashboard." |
| Verification scheduled | "Monthly verification scheduled for Sunset Dove Unit 2 on [date]. Operator will visit between [time] and [time]." |
| Verification failed | "Verification flagged issues at Sunset Dove Unit 2. Listing temporarily suspended pending remediation. Operator will contact you." |

## 4. Operator Workflow & Copy (PRD 8.3 / 7.3–7.4)

**Pre-checkout confirmation (24h before):**
> "Checkout tomorrow — Sunset Dove Unit 2. Guest: Adaeze O. Check-out time: 11:00. Inspection window: 11:00–15:00. Please confirm you'll be available."
> Operator replies: `YES` or `REASSIGN [name of local rep]`

**Inspection prompt (at checkout time):**
> "Guest has checked out: Sunset Dove Unit 2. Please conduct your inspection within the next 4 hours. Reply `CLEAN`, `DAMAGE`, `NOSHOW`, or `GUESTPRESENT`."

**Damage report submission:**
> Operator: `DAMAGE`
> Bot: "Damage reported for Sunset Dove Unit 2. Please send: photos (up to 5), brief description, estimated cost in NGN."
> Operator: [uploads photos] "Electric kettle broken, handle snapped off. Replacement cost ₦15,000."
> Bot: "Received. Submitted to admin review. Update within 24 hours."

**Clean path acknowledgement:**
> "Confirmed clean for Sunset Dove Unit 2. Releasing deposit hold of £150. Verification logged. Thank you."

**Other operator notifications:** new property assigned for verification (monthly), verification-overdue reminder, weekly performance summary *(Launch-Supporting)*.

## 5. Guest Notifications — Optional Opt-in (PRD 8.4)

Guests interact primarily on web; WhatsApp notifications are optional:
- Booking confirmation.
- Pre-arrival reminder (24h before) with property contact + arrival instructions.
- Late checkout offer (24–48h after booking).
- Post-checkout feedback prompt (24h after checkout).
- Damage claim notification (if applicable).

## 6. Guest Damage Notification (PRD 7.7)

> "Your recent stay at Sunset Dove Unit 2 — a damage claim has been submitted by the property inspector. Photos and details are in your CheckinBliss account. Claim: electric kettle replacement, £8 (₦15,000). This amount will be captured from your security deposit hold; the remaining £92 will be released. You have 7 days to dispute. Reply `DISPUTE` or contact support."

## 7. Security (PRD 8.5)

- Inbound webhook **signature verification** (Meta `X-Hub-Signature-256`).
- Sender phone number must match a registered owner/operator — **unknown senders ignored**.
- Owner `BLOCK`/`UNBLOCK` authorised only against properties owned by the sender.
- Operator inspection commands authorised only against properties in the operator's assigned cities.
- **Strict command parsing — malformed requests rejected, not guessed.**
- Audit log of all bot interactions retained **12 months**.

## 8. Backend (PRD 8.6)

Meta Cloud API integration; webhook receiver with signature verification; outbound sender; media handler for operator photo uploads; strict command parser; **template message library** (required by WhatsApp policy for business-initiated outbound).