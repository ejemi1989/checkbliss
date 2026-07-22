# Phase 2 — API Specification

**CheckinBliss** · PRD v2.3 §2B, §12.3. New and extended endpoints layered onto the Phase 1 surface. Same conventions: Route Handlers, Zod validation, GBP minor units, ISO dates, audit on every mutation. All Phase 1 endpoints remain unchanged.

---

## 1. New Endpoint Surface

### Lifestyle — Nightlife (PRD 2B, 12.3)
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/nightlife` | Browse venues (clubs, lounges) |
| `GET` | `/api/nightlife/:slug` | Venue detail + table inventory |
| `GET` | `/api/nightlife/:slug/availability` | Table slots for a date/night |
| `POST` | `/api/nightlife/bookings` | Reserve a table (time-slot + capacity) |

### Lifestyle — Experiences (PRD 2B, 12.3)
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/experiences` | Festivals, curated dining, beach houses |
| `GET` | `/api/experiences/:slug` | Detail + capacity slots |
| `POST` | `/api/experiences/bookings` | Book a fixed-capacity slot |

### Lifestyle — Concierge (PRD 2B)
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/concierge/requests` | Submit a concierge request |
| `GET` | `/api/concierge/requests/:id` | Track fulfilment status |

### Unified / mixed cart + split payment (PRD 12.3)
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/cart/checkout` | Mixed cart (stay + table + experience), atomic |
| `POST` | `/api/cart/:group/split` | Open "pay separately" — create per-payer intents |
| `POST` | `/api/cart/:group/split/:payer/pay` | A payer authorises their share |
| `GET` | `/api/cart/:group/split/status` | Per-payer authorisation state |

### Editorial Reels (PRD 12.3)
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/reels` | Editorial video feed |
| `POST` | `/api/admin/reels` | Upload → ingest/transcode (editorial-controlled) |

### Loyalty (PRD 12.3)
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/loyalty/me` | Points balance & tier |
| `GET` | `/api/loyalty/benefits` | Available benefits |

### Investment Services (PRD 12.3)
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/investment/opportunities` | Advisory listings |
| `POST` | `/api/investment/enquiries` | Submit an advisory enquiry |

### Analytics (PRD 12.3)
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/analytics/overview` | Occupancy, revenue by city/vertical |
| `GET` | `/api/admin/analytics/operators` | Operator performance & claim patterns |

### Extended WhatsApp webhook (PRD 12.3)
`POST /api/webhooks/whatsapp` gains an **NLU pre-parser**: free text → validated command set; ambiguous input falls through to strict confirmation. Signature/sender/audit rules unchanged.

---

## 2. `POST /api/cart/checkout` (mixed, atomic)

Generalises `POST /api/bookings` to multiple verticals in one transaction.

```jsonc
{
  "guest": { "name": "...", "email": "...", "phone": "+44...", "guests": 2 },
  "items": [
    { "type": "stay",       "property_id": "...", "check_in": "...", "check_out": "...", "extended_checkout": true },
    { "type": "nightlife",  "venue_id": "...", "night": "2026-12-31", "table_tier": "vip", "party": 6 },
    { "type": "experience", "experience_id": "...", "slot_id": "...", "seats": 2 }
  ],
  "payment": { "mode": "single" }            // or "split"
}
```

Resolution: each item is validated against its **type-specific availability** (date-range for stays, time-slot+capacity for nightlife, fixed-capacity slot for experiences). All confirm together or the whole cart rolls back — the Phase 1 atomicity guarantee, generalised.

## 3. Split Payment Flow (PRD 12.3)

1. `POST /api/cart/checkout` with `payment.mode: "split"` reserves the group (`pending_payment`) and returns payer slots.
2. `POST /api/cart/:group/split` creates a **per-payer Airwallex intent** (each payer pays their share via their own hosted-fields session).
3. Each payer calls `…/split/:payer/pay`.
4. Group confirms **only when all shares authorise**; any lapsed share past expiry releases the group's reservations (sweep job).
5. Deposit hold(s) split per payer, or fall to a nominated lead guest.

`GET …/split/status` exposes per-payer state for the UI.

## 4. Nightlife / Experiences Availability

Unlike Stays (date-range exclusion), these use **slot inventory**:
- **Nightlife:** `(venue, night, table_tier)` with a remaining-capacity counter; booking decrements atomically.
- **Experiences:** `(experience, slot)` with a seat count; overbooking prevented by a capacity check inside the booking transaction.

## 5. Continuity

Every Phase 1 contract (`/api/bookings`, deposit lifecycle, inspection webhook, admin claim decision, cron jobs) is unchanged and still governs the Stays vertical. Phase 2 endpoints reuse the same payment, deposit, audit, and authorisation machinery.