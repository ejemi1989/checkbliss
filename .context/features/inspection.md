# CheckinBliss — Inspection Flow

The operator's checkout-time conversation, driven entirely by a cron scheduler — not by a person starting it. Grounded in PRD §7.3–7.9. Pairs with `whatsapp-bot-build.md`, `whatsapp-flows.md`, `IMPL-notifications-cron.md`.

---

## 1. The trigger: a cron, not a person

Nobody manually starts an inspection. `app/api/cron/inspections` runs every 15 minutes and checks every reservation's `confirmed_checkout_time` (11:00 standard, or 18:00 if the guest paid for extended checkout). It compares "now" against that checkout time and fires the right message at the right offset. The operator never initiates — they only respond.

---

## 2. The five-step sequence

| Offset | What fires | Operator's reply |
|---|---|---|
| **−24h** | Pre-checkout confirm — "Checkout tomorrow — Unit 2, guest Adaeze O., 11:00. Confirm you're available." | `YES` or `REASSIGN <name>` |
| **T0** (at checkout) | Inspection prompt — "Guest checked out — Unit 2. Inspect within 4 hours. Reply CLEAN, DAMAGE, NOSHOW, or GUESTPRESENT." | one of those four |
| **+4h** | Reminder, if no reply yet | — |
| **+48h** | Escalates to admin as overdue | — |
| **+7 days** | Auto-releases the deposit hold, regardless | — |

The **+7 days** step is a backstop, not a normal path. If an operator never responds — sick, phone off, anything — the guest's deposit still releases on day 7. The guest is never penalised for an operational failure on CheckinBliss's side (PRD §7.9 / §5.3).

---

## 3. What each reply does

| Reply | Action |
|---|---|
| `YES` | confirms availability for tomorrow's checkout |
| `REASSIGN <name>` | hands the inspection to a named local rep |
| `CLEAN` | deposit hold released immediately via Airwallex; owner told "checkout clean, payout on schedule"; **guest hears nothing** — no friction. ~95% of cases. |
| `DAMAGE` | bot asks for up to 5 photos + a cost estimate in NGN; photos fetched from WhatsApp and stored privately; a damage claim opens and routes to admin |
| `NOSHOW` | logged and escalated straight to admin — not auto-resolved |
| `GUESTPRESENT` | logged and escalated straight to admin — not auto-resolved |

---

## 4. Authorization

An operator can only act on properties in their **assigned city** (`operator_assignments.city`) — a Lagos operator cannot trigger an inspection action on an Abuja property, even by accident. This is checked on every reply, not just at login, and is part of the bot's security model (PRD §8.5).

---

## 5. The damage sub-flow

```
operator: DAMAGE
   → bot: "send up to 5 photos + estimate in NGN"
   → operator sends image messages
   → each fetched from Meta's media API, stored in a PRIVATE bucket
   → appended to the claim (max 5)
   → operator sends description + estimate
   → claim routes to ADMIN (web)
        → Approve  → capture the estimate from the hold
        → Adjust   → capture a different amount, release the remainder
        → Reject   → release the whole hold
   → guest notified with photos + a 7-day dispute window
```

---

## 6. Deposit lifecycle (cross-cutting)

```
booking confirmed → [held]
  ├─ CLEAN ─────────────────▶ released         → [released]
  ├─ +7 days, no result ─────▶ auto-release     → [expired]
  ├─ admin Approve/Adjust ───▶ partial capture  → [partially_captured] (remainder returned)
  └─ admin Approve (major) ──▶ full capture     → [fully_captured]
```

---

## 7. One booking's life, end to end

```
Guest books (web)
   │
   ├─▶ OWNER notified (WhatsApp): new booking
   │
   │   [stay happens — schedule row created at booking-confirm]
   │
   ├─▶ cron: −24h pre-checkout confirm  → OPERATOR: YES / REASSIGN
   ├─▶ cron: T0 inspection prompt       → OPERATOR: CLEAN / DAMAGE / NOSHOW / GUESTPRESENT
   │        │
   │        ├─ CLEAN  ──▶ deposit released ──▶ OWNER: "clean, payout on schedule"
   │        │
   │        └─ DAMAGE ──▶ photos + estimate ──▶ ADMIN decides (web)
   │                                              ├─▶ OWNER: damage resolution
   │                                              └─▶ GUEST: claim + 7-day dispute
   │
   ├─▶ cron: +4h reminder (if silent)
   ├─▶ cron: +48h escalate to admin (if still silent)
   └─▶ cron: +7d auto-release the hold regardless (backstop)
```

---

## 8. Build status (honest)

| Piece | Status |
|---|---|
| Bot reply handling (CLEAN/DAMAGE/NOSHOW/GUESTPRESENT → DB actions) | ✅ built, mock-tested |
| Damage-photo media handler | ✅ built, mock-tested |
| Inspection cron (−24h/T0/+4h/+48h/+7d sequencing) | ✅ built, typechecked; 403/200 verified in mock mode |
| `inspection_schedule` row created on booking-confirm | ❌ **not wired** — without this the cron has nothing to act on |
| Admin claim decision UI (Approve/Adjust/Reject) | ❌ not built |
| Live run against a seeded database (idempotency proof) | ❌ not done |

**The gap that matters most:** the cron is real code that runs correctly, but nothing yet *creates* the `inspection_schedule` row at the moment a booking confirms. Until that one connector is wired (Task 2 in `IMPL-notifications-cron.md`), the scheduler finds zero reservations to process — the flow above is fully designed and mostly coded, but not yet closed end to end.

---

## 9. Hard rules (must not break)

- Cron-driven, never operator-initiated.
- Every step idempotent — gated on its own timestamp; re-runs are no-ops.
- 7-day auto-release always fires, regardless of operator responsiveness.
- Operator actions scoped strictly to assigned cities.
- `CLEAN` produces zero guest-facing friction.
- `DAMAGE` always requires photos + estimate before reaching admin.
- Admin is the only role that can capture or release a hold after the initial CLEAN/DAMAGE branch.