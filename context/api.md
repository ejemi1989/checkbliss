# Phase 1 — API Specification

**CheckinBliss** · PRD v2.3. Route Handlers (Next.js, Node runtime). Money in GBP minor units; dates ISO `YYYY-MM-DD`. Every body validated (Zod) before side effects.

---

## 1. Endpoint Surface

### Guest / storefront (web)
| Method | Path | Purpose | Tier | PRD |
|---|---|---|---|---|
| `GET` | `/api/properties` | List approved properties; `?city=Lagos\|Abuja` | Critical | 12.1 |
| `GET` | `/api/properties/:slug` | Detail incl. checkout options & deposit | Critical | 6.6 |
| `GET` | `/api/properties/:slug/availability` | Booked + blocked ranges (no PII) | Critical | 4.1 |
| `POST` | `/api/bookings` | Atomic multi-city booking + charge + hold | Critical | 4.3, 5 |
| `GET` | `/api/bookings/:reference` | Confirmation / lookup | Critical | 4.5 |
| `POST` | `/api/claims/:id/dispute` | Guest dispute within 7-day window | Critical | 7.7 |

### Inbound webhooks
| Method | Path | Purpose | Tier | PRD |
|---|---|---|---|---|
| `GET` | `/api/webhooks/whatsapp` | Meta verification challenge | Critical | 8.6 |
| `POST` | `/api/webhooks/whatsapp` | Owner/operator commands + photo media | Critical | 8.2–8.6 |
| `POST` | `/api/webhooks/airwallex` | PaymentIntent status events | Critical | 5.6 |

### Admin (web dashboard)
| Method | Path | Purpose | Tier | PRD |
|---|---|---|---|---|
| `GET` | `/api/admin/claims` | Pending claim queue | Critical (simple) → Supporting (analytics) | 7.6 |
| `POST` | `/api/admin/claims/:id/decision` | Approve / Adjust / Reject | Critical | 7.6 |
| `POST` | `/api/admin/properties/:id/suspend` | Suspend listing platform-wide | Critical | 11.1 |
| `POST` | `/api/admin/operators` | Create operator, assign cities | Critical | 11.1 |

### Cron (CRON_SECRET-protected)
| Method | Path | Cadence | Tier | PRD |
|---|---|---|---|---|
| `GET` | `/api/cron/inspections` | 15 min | Critical | 7.9, 5.3 |
| `GET` | `/api/cron/feedback` | hourly | Critical | 13.1 |
| `GET` | `/api/cron/reconcile` | daily | Supporting | 12.2 |
| `GET` | `/api/cron/sweep` | 15 min | Supporting | 12.2 |

---

## 2. `POST /api/bookings`

### Request
```jsonc
{
  "guest": { "name": "Adaeze O.", "email": "...", "phone": "+44...", "guests": 2 },
  "items": [                                   // 1–5 stays ("book your full homecoming")
    { "property_id": "...", "check_in": "2026-09-15",
      "check_out": "2026-09-19", "extended_checkout": true }
  ]
}
```

### Sequence
1. Validate shape + **14-day rule (4.2)** at the edge.
2. **`book_stays()`** atomic transaction (4.3): lock rows, re-check 14-day + blocks, compute extended fee (40% — 6.1), insert reservations. Any overlap → rollback, **no charge**.
3. Booking charge — Airwallex PaymentIntent, **automatic** capture (5.1).
4. Deposit hold — PaymentIntent, **manual** capture (5.1 / 5.6).
5. Confirm group against the intent.
6. Persist `deposit_holds` rows with 7-day backstop `expires_at` (5.3).
7. Owner WhatsApp notification fires (4.5 / 8.2).
8. Audit.

### Success (201)
```jsonc
{
  "booking_group_id": "...",
  "reservations": [
    { "reservation_id":"...", "property_name":"Lagoon View Loft",
      "check_in":"2026-09-15", "check_out":"2026-09-19",
      "total_minor": 96000, "deposit_minor": 10000, "checkout_time":"18:00:00" }
  ],
  "charge_total_minor": 96000,
  "deposit_hold_minor": 10000,
  "currency": "GBP",
  "deposit": { "note": "Pre-authorisation hold — not a charge. Released within 7 days of a clean checkout." }
}
```

### Error contract
| Code | HTTP | Message |
|---|---|---|
| `ADVANCE_14_DAYS` | 422 | Bookings open 14+ days ahead. |
| `INVALID_RANGE` | 422 | Check-out must be after check-in. |
| `DATES_UNAVAILABLE` | 409 | Just taken — nothing charged. |
| `DATES_BLOCKED` | 409 | Unavailable — nothing charged. |
| `PROPERTY_NOT_BOOKABLE` | 404 | Not currently bookable. |
| payment fails | 502 | Dates released, nothing charged. |

**Idempotency (12.1):** Airwallex `request_id` = `charge-<group>` / `hold-<group>`.

---

## 3. Deposit Lifecycle (service calls → Airwallex)

| Operation | Airwallex | Trigger | PRD |
|---|---|---|---|
| Create hold | PaymentIntent `capture_method: manual` | booking | 5.1 |
| Release | `/payment_intents/:id/cancel` | clean checkout / 7-day backstop | 5.4A, 5.3 |
| Partial capture | `/payment_intents/:id/capture` (amount) | approved minor claim | 5.4B |
| Full capture + invoice | full capture + separate charge | major damage | 5.4C |

---

## 4. WhatsApp Webhook (`/api/webhooks/whatsapp`)

**Security (8.5):** `X-Hub-Signature-256` HMAC (timing-safe); sender must match a registered owner/operator; unknown senders ignored; strict parse (malformed → rejected); 12-month audit retention.

**Owner commands (8.2):** `BLOCK <range> <listing>`, `UNBLOCK <range> <listing>`, `AVAILABILITY <listing> <month>`, `BOOKINGS`, `HELP` (Critical); `EARNINGS`, `DAMAGE HISTORY <listing>` (Supporting). `BLOCK`/`UNBLOCK` are the only inbound availability mutations (4.4).

**Operator commands (8.3):** `YES`, `REASSIGN <rep>`, `CLEAN`, `DAMAGE` (+ up to 5 photos & estimate), `NOSHOW`, `GUESTPRESENT`.

**Operator state machine (7.5):** `CLEAN` → auto-release hold, notify owner, no guest notice. `DAMAGE` → create `damage_claims`, enter admin review. `NOSHOW`/`GUESTPRESENT` → route to admin.

---

## 5. Admin Claim Decision (`POST /api/admin/claims/:id/decision`)

Body: `{ "decision": "approve" | "adjust" | "reject", "amount_minor"?: number }`.
- **approve** → capture full estimate from hold.
- **adjust** → capture `amount_minor`; remainder released.
- **reject** → release full hold.

On approve/adjust: guest notified with photos + **7-day dispute window (7.7)**. No dispute → finalise. Dispute → back to admin review.

---

## 6. Cron Contracts

- **`/api/cron/inspections`** — off `confirmed_checkout_time` (11:00/18:00, 7.2): 24h pre-notice, checkout-time prompt, +4h reminder, +48h escalation, +7-day auto-release (7.9 / 5.3).
- **`/api/cron/feedback`** — 24h post-checkout Trustpilot email; GOOD → review page, BAD → captured + notifies admin/operator (13.1).
- **`/api/cron/reconcile`** (Supporting) — Airwallex vs internal records (12.2).
- **`/api/cron/sweep`** (Supporting) — cancel abandoned checkouts after intent expiry (12.2).

---

## 7. Payment Methods (4.6)
Card (Visa/Mastercard/Amex via hosted fields), Apple Pay, Google Pay. **No BNPL.** Display currencies GBP/USD/EUR; charges settle GBP; NGN excluded from display (12.1).