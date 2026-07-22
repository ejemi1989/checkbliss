# CheckinBliss — WhatsApp Flows (Owners & Operators)

Reference for every WhatsApp trigger, template, and command. For a coding agent + Meta template registration. Grounded in PRD v2.3 §8. Pairs with `whatsapp-bot-build.md` (how to build the webhook) and the bot code in `lib/whatsapp-handlers.ts`.

---

## 0. Shared rules (PRD §8)

- **One thread per person**, keyed by phone (E.164). Owner threads cover all their units; each message names the unit (e.g. "Sunset Dove — Unit 2").
- **Owners & operators work entirely on WhatsApp** for daily tasks (PRD 8.1). Admin = web. Guest = web (WhatsApp optional, §below).
- **Command-based, strict.** Malformed input → "didn't understand / HELP", never a guessed action. AI conversation is Phase 2.
- **Security (8.5):** signature-verified; unknown senders ignored; owner commands authorised to owned units; operator commands authorised to assigned cities; 12-month audit.
- **Outbound business-initiated messages use pre-approved templates** (24-hour window rule). Template names are listed per message below.

---

## 1. OWNER flow

Owners are mostly **notified**; occasionally they **send commands**. They never approve bookings — booking is instant; the calendar + deposit do the trust work.

### 1a. Notifications the system sends (templates to register)

| Trigger | Template | Body (example) |
|---|---|---|
| Guest books their unit | `new_booking` | "New booking: Sunset Dove Unit 2, Sept 15–19, 4 nights, £480. Guest: Adaeze O." |
| 24h before checkout | `pre_checkout_reminder` | "Reminder: Adaeze O. checks out tomorrow from Unit 2 at 11:00. Inspection scheduled." |
| Clean checkout | `post_checkout_clean` | "Checkout clean — Unit 2. No damage reported. Payout on schedule for {date}." |
| Damage reported | `post_checkout_damage` | "Damage reported — Unit 2. Operator filing a claim. Update within 24–48 hours." |
| Claim resolved | `damage_resolution` | "Damage claim resolved — Unit 2. £8 captured for a kettle, added to your next payout." |
| Payout processed | `payout_processed` | "Payout processed: £422 for the week ending {date}." |
| Verification scheduled | `verification_scheduled` | "Monthly verification scheduled for Unit 2 on {date}." |
| Verification failed | `verification_failed` | "Verification flagged issues at Unit 2. Listing temporarily suspended pending remediation." |

### 1b. Commands owners can send (PRD §8.2)

| Command | Example | Action | Tier |
|---|---|---|---|
| `BLOCK <range> <unit>` | `BLOCK 15-20 Sept Sunset Dove Unit 2` | block dates (owned units only) — the only inbound path that mutates availability | Launch |
| `UNBLOCK <range> <unit>` | `UNBLOCK 15-20 Sept Sunset Dove Unit 2` | unblock | Launch |
| `AVAILABILITY <unit> <month>` | `AVAILABILITY Sunset Dove Unit 2 Sept` | query calendar | Launch |
| `BOOKINGS` | `BOOKINGS` | upcoming bookings across all units | Launch |
| `HELP` | `HELP` | list commands | Launch |
| `EARNINGS` | `EARNINGS` | recent + pending payouts | Launch-Supporting |
| `DAMAGE HISTORY <unit>` | `DAMAGE HISTORY Unit 2` | claim history, last 90 days | Launch-Supporting |

**Authorisation:** a `BLOCK`/`UNBLOCK` is accepted only for a listing the sender owns; otherwise "You don't manage a listing called …".

---

## 2. OPERATOR flow

Operators are the verification layer. Their whole job is a checkout-time conversation driven by the inspection scheduler (cron, keyed to each booking's `confirmed_checkout_time` — 11:00, or 18:00 if extended).

### 2a. The driven sequence (PRD §7.3–7.9)

| When | System sends (template) | Operator replies |
|---|---|---|
| 24h before checkout | `pre_checkout_confirm` — "Checkout tomorrow — Unit 2, guest Adaeze O., 11:00. Confirm you're available." | `YES` / `REASSIGN <rep>` |
| At checkout time | `inspection_prompt` — "Guest checked out — Unit 2. Inspect within 4 hours. Reply CLEAN, DAMAGE, NOSHOW, or GUESTPRESENT." | one of the four |
| +4h, no reply | `inspection_reminder` | — |
| +48h, still none | (escalate to admin; flag overdue) | — |
| +7 days, never completed | (auto-release the deposit hold — guest never penalised, §7.9) | — |

### 2b. What each reply does (PRD §7.5)

| Reply | Action |
|---|---|
| `YES` | confirm availability for the checkout |
| `REASSIGN <rep>` | reassign the inspection to a local rep |
| `CLEAN` | release the deposit hold automatically; notify owner; **guest gets nothing** (no friction). ~95% of cases |
| `DAMAGE` | bot: "send up to 5 photos + estimate in NGN" → creates a `damage_claims` row → routes to admin |
| `NOSHOW` | log + escalate to admin |
| `GUESTPRESENT` | log + escalate to admin |

**Authorisation:** operator commands act only on properties in the operator's **assigned cities** (`operator_assignments`, PRD 10.2). A Lagos operator cannot act on an Abuja property.

### 2c. Damage photo sub-flow

After `DAMAGE`, the operator sends image messages in the thread → the **media handler** fetches each from Meta's media API and stores it in the **private** `damage-photos` bucket → appends keys to `damage_claims.photos` (max 5). See `Property-Media-Implementation.md` Pipeline B.

---

## 3. The two roles connected (one booking's life)

```
Guest books (web)
   │
   ├─▶ OWNER  ── new_booking (WhatsApp)
   │
   │   [stay happens]
   │
   ├─▶ cron prompts OPERATOR at checkout (WhatsApp)
   │        │
   │        ├─ CLEAN ───▶ deposit released ───▶ OWNER: post_checkout_clean
   │        │
   │        └─ DAMAGE ──▶ photos + estimate ──▶ ADMIN decides (web)
   │                                              ├─▶ OWNER: damage_resolution
   │                                              └─▶ GUEST: claim + 7-day dispute (web/email)
   │
   └─▶ (later) OWNER: payout_processed
```

The **owner bookends** the flow (told at booking, told at resolution); the **operator does the middle action**; they never talk to each other — the system relays between them.

---

## 4. Guests on WhatsApp (optional, secondary — PRD §8.1)

Guests live on the **web**; email is their primary channel. WhatsApp notifications are **opt-in** and secondary:

| Trigger | Template | Notes |
|---|---|---|
| Booking confirmation | `guest_booking_confirmation` | optional |
| Pre-arrival (24h before) | `guest_pre_arrival` | directions, contact, checkout time |
| Late-checkout offer (24–48h after booking) | `guest_late_checkout_offer` | Launch-Supporting upsell |
| Post-checkout feedback prompt | `guest_feedback` | 24h after checkout (also email) |
| Damage claim notice | `guest_damage_notice` | with dispute link + 7-day deadline |

Do **not** make WhatsApp the guest's primary channel; it's an add-on to the web/email experience.

---

## 5. Template registration checklist (Meta)

Register and get approved before going live (utility templates approve fast):

**Owner:** `new_booking`, `pre_checkout_reminder`, `post_checkout_clean`, `post_checkout_damage`, `damage_resolution`, `payout_processed`, `verification_scheduled`, `verification_failed`
**Operator:** `pre_checkout_confirm`, `inspection_prompt`, `inspection_reminder`
**Guest (optional):** `guest_booking_confirmation`, `guest_pre_arrival`, `guest_late_checkout_offer`, `guest_feedback`, `guest_damage_notice`

Each is a **utility** template (transactional), not marketing. Variables fill in order via `sendWhatsApp(toE164, templateName, [params])`.

---

## 6. Hard rules (must not break)

- Owner commands authorised to **owned units**; operator commands to **assigned cities**.
- Strict parse — malformed → HELP nudge, never a guessed mutation.
- Unknown sender → ignore silently.
- `CLEAN` releases the hold; `DAMAGE` opens a claim + requests photos; `NOSHOW`/`GUESTPRESENT` escalate.
- 7-day auto-release runs regardless, so a guest is never penalised for an operator/platform failure.
- Outbound = approved templates only (24-hour rule).
- Audit every inbound + outbound message (12-month retention).
- Owners never approve bookings — booking is instant.