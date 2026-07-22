# CheckinBliss — Reliability & Improvements (Non-Functional Requirements)

The PRD and existing docs specify **feature scope**. This document specifies what they don't: **what happens when a step fails**, and the gaps between "feature-complete" and "production-grade." Written for an AI coding agent. Read alongside `CheckinBliss-Architecture.md`, `User-Flow-V1.md`, `code-standards.md`.

**Core principle:** undefined failure behaviour is how a premium product feels cheap. Every flow that moves money or notifies a person must have a defined behaviour under partial failure.

---

## 0. Priority Summary

| # | Item | Why | Priority |
|---|---|---|---|
| 1 | Airwallex webhook + payment reconciliation | Money correctness; DB must defer to Airwallex truth | **LAUNCH BLOCKER** |
| 2 | Magic-link booking lookup + deposit status view | Guest's only way back in; core trust promise | **LAUNCH BLOCKER** |
| 3 | Observability (errors, logs, metrics, alerts) | Cannot operate a payment system blind | **LAUNCH BLOCKER** |
| 4 | Idempotent webhook/cron + notification outbox | Prevents double-releases & silent owner blackouts | **LAUNCH BLOCKER** |
| 5 | Critical-cron heartbeats | 7-day auto-release silently failing breaks the core promise | High |
| 6 | Rate limiting + abuse protection on `/api/bookings` | Endpoint creates payment intents | High |
| 7 | Email as a product surface | Premium touchpoints; the diaspora relationship is the email trail | High |
| 8 | Timezone / i18n correctness | Global users; "18:00 in whose time?" | High |
| 9 | Cold-start / empty-state UX | Matters most when inventory is thinnest (launch) | Medium |
| 10 | Accessibility audit | Global premium audience; legal + UX | Medium |
| 11 | Backups, data retention, GDPR/NDPR | Legal; guest PII + payment data | Medium |
| 12 | Load/concurrency testing on the booking race | Validate the GiST invariant under real contention | Medium |

---

## 1. LAUNCH BLOCKER — Payment reconciliation (money correctness)

**Problem:** the booking flow does charge → hold → confirm synchronously, and trusts its own DB for payment state. If the server dies between charge and confirm, or Airwallex later reports a charge failed/reversed, the DB and the money desync. The Airwallex webhook handler is not written.

**Required:**
- `POST /api/webhooks/airwallex` — verify signature; parse PaymentIntent events (`authorized`, `succeeded`, `failed`, `cancelled`, `capture_*`).
- **Airwallex is the source of truth for payment state**, not the DB. On each event, reconcile the matching reservation/`deposit_hold` by `payment_intent_id`.
- **Idempotent:** persist a `processed_events(event_id)` ledger; ignore duplicates (Airwallex redelivers).
- **Daily reconciliation job** (`/api/cron/reconcile`): diff Airwallex transactions vs internal records; write `reconciliation_runs` with discrepancies; alert on any mismatch.
- **Orphan sweep:** reservations stuck in `pending_payment` past intent expiry → cancel + free dates (`/api/cron/sweep`).

**Failure behaviour:** if confirm never runs after a successful charge, the webhook reconciles the reservation to `confirmed`. If a charge fails after reserve, the group cancels and dates free. No state is ever inferred only from the synchronous path.

---

## 2. LAUNCH BLOCKER — Guest re-entry & deposit visibility

**Problem:** a guest books with an email, sees one confirmation page, then has no way back in — can't view their booking, check deposit status, or start the dispute the system promises. No accounts exist.

**Required (no full auth needed):**
- **Magic-link lookup:** `POST /api/bookings/lookup` (email) → signed, expiring link → `/booking/[token]` showing booking + live deposit status.
- **Deposit status surface:** held → releasing → released (with the release date), or "claim filed — respond by {date}". This directly delivers the "held, not charged, released in 7 days" promise the brand is built on.
- **Dispute entry point** lives here (Flow 8), not buried in an email.

**Failure behaviour:** lost email is recoverable via lookup; token expiry returns a re-request screen, never a dead end.

---

## 3. LAUNCH BLOCKER — Observability

**Problem:** no error tracking, structured logging, metrics, or alerting. A 2am booking failure is invisible until a guest complains.

**Required:**
- **Error tracking** (e.g. Sentry) on all route handlers, Server Actions, and crons.
- **Structured logs** with the `[context]` prefix already in `code-standards.md`, shipped somewhere queryable.
- **Key metrics:** booking success/failure rate, payment success rate, hold release latency, webhook processing lag, cron run status.
- **Alerts:** payment failure spike, webhook backlog, any reconciliation discrepancy, any critical cron missing a run.

**Failure behaviour:** every money-path failure raises an alert with enough context to act, before the guest notices.

---

## 4. LAUNCH BLOCKER — Idempotency & notification outbox

**Problem (a) duplicate inbound:** Meta redelivers webhooks; Vercel cron can double-fire. A single operator `CLEAN` could release a hold twice; a booking notification could fire repeatedly.
**Problem (b) lost side effects:** if the owner WhatsApp send throws after a booking confirms, the booking is valid but the owner never hears — and you don't want to roll back a paid booking because a notification failed.

**Required:**
- **Inbound idempotency:** `processed_events(source, event_id)` ledger checked first in every webhook/cron handler.
- **Outbox pattern:** side effects (owner notification, guest email, audit) written to an `outbox` table inside the booking transaction, then dispatched by a worker/cron with retries + backoff. Decouples correctness of the booking from delivery of its notifications.
- **Dead-letter:** sends that exhaust retries land in a DLQ with an admin alert.

**Failure behaviour:** duplicate deliveries are no-ops; a failed notification retries without affecting the booking; nothing is silently dropped.

---

## 5. Critical-cron heartbeats

**Problem:** the 7-day deposit auto-release is a cron. If it silently fails, deposits never release — breaking the core promise for every guest, discovered only via complaints.

**Required:** each critical cron writes a heartbeat (last-run timestamp); an external check (or a watcher cron) alerts if `inspections` / `reconcile` / `feedback` hasn't run within its expected window.

---

## 6. Rate limiting & abuse protection

**Problem:** `/api/bookings` creates payment intents and is unauthenticated. Open to hammering (Airwallex auth-attempt costs), availability probing, enumeration.

**Required:**
- Rate limit per IP / per email on `/api/bookings` and `/api/bookings/lookup`.
- Bot protection on the payment step (Turnstile/hCaptcha or Airwallex's risk tooling).
- Property/availability endpoints throttled against enumeration.
- WhatsApp webhook already rejects unknown senders — keep that as the model.

---

## 7. Email as a product surface

**Problem:** email is currently one budget line, not a designed surface. For diaspora guests booking months ahead, the email trail *is* the relationship.

**Required (transactional, branded):**
- Booking confirmation (with magic-link to booking).
- Deposit-release notice ("your £100 hold has been released").
- Damage-claim notice + dispute link + deadline.
- Pre-arrival ("your stay is tomorrow — directions, contact, checkout time").
- Post-checkout Trustpilot feedback (Flow 9).
- Payment receipt / statement.

All idempotent via the outbox (item 4).

---

## 8. Timezone & internationalisation

**Problem:** users are global; properties are in WAT (Lagos/Abuja). "Checkout at 18:00" is ambiguous across the guest's timezone vs the property's. Currency display exists; date/time localisation does not.

**Required:**
- Store all timestamps UTC; render in **property-local time** for operational events (checkout, inspection) and clearly label timezone in guest-facing copy.
- The inspection scheduler must key off property-local checkout time, converted to UTC for the cron comparison.
- Locale-aware date formatting in guest emails/UI.
- (Later) copy i18n if non-English markets open in Phase 2.

---

## 9. Cold-start / empty-state UX

**Problem:** at launch with ~30 properties, thin availability is the norm. "No stays for your dates in Lagos" is the most common early result and is currently undefined.

**Required:**
- Empty-result state with alternatives (nearby dates, other neighbourhood, Abuja).
- "Notify me when available" capture (waitlist) — turns a dead end into a lead.
- Never render a blank grid; always a designed empty state.

---

## 10. Accessibility audit

**Problem:** beyond focus rings, a11y is unaddressed for a global premium audience.

**Required:** keyboard nav across booking flow; labelled inputs; sufficient contrast (verify lagoon/brass on bone meets WCAG AA); screen-reader pass on the booking and payment steps; `prefers-reduced-motion` already honoured — extend the discipline.

---

## 11. Data protection, backups, retention

**Problem:** guest PII + payment references + 12-month WhatsApp logs, with no stated backup/retention/erasure policy. UK (GDPR) + Nigeria (NDPR) both apply.

**Required:**
- Supabase point-in-time recovery enabled; tested restore.
- Retention policy per table (e.g. WhatsApp audit 12 months per PRD; PII minimisation).
- **Right-to-erasure** path for guests (GDPR/NDPR) that preserves financial-record obligations.
- No PII in logs or error reports.

---

## 12. Load & concurrency testing

**Problem:** the GiST exclusion constraint is the entire double-booking guarantee. It must be proven under real concurrent contention, not just unit-tested.

**Required:** a concurrency test firing N simultaneous bookings for the same dates → exactly one succeeds, the rest get a clean 409, **zero double charges**. Run it in CI.

---

## 13. Smaller wins (fast-follow)

- **Optimistic-free payment UX with clear pending states** — "authorising…" never a spinner that lies.
- **Retry-safe client submit** — disable the button + idempotency key already cover this; surface "we're confirming, don't refresh."
- **Structured audit viewer** for admin (the data exists; give it a screen).
- **Webhook signature rotation** runbook (Meta + Airwallex secrets).
- **Feature flags** for the Tier-2 / Phase-2 rollout so launch scope stays clean.
- **Status page** for owners/operators when WhatsApp or payments degrade.
- **Per-property photography pipeline** — the duotone placeholders are a launch crutch; real images are the premium signal.

---

## 14. What to write next (the real meta-gap)

The PRD has no **non-functional requirements** section — no reliability targets, failure semantics, recovery procedures, or SLOs. This document is the start of it. Before launch, define:

- **SLOs:** booking success rate target, payment reconciliation lag target, notification delivery target.
- **Failure semantics per flow:** already begun above — finish for every flow in `User-Flow-V1.md`.
- **Runbooks:** webhook down, payment provider outage, WhatsApp blackout, cron failure, reconciliation mismatch.
- **On-call / escalation** at launch scale (founder + one engineer).

---

## Recommended one-sprint scope (pre-September 1)

**Non-negotiable four:**
1. Airwallex webhook + reconciliation (item 1)
2. Magic-link lookup + deposit status (item 2)
3. Observability + critical-cron heartbeats (items 3, 5)
4. Idempotent webhook/cron + notification outbox (item 4)

**Fast-follow:** rate limiting (6), email surface (7), timezones (8), cold-start UX (9).
**Then:** a11y (10), data protection (11), load testing (12).

Everything above is additive to the existing architecture and changes none of its invariants (DB owns non-overlap, Airwallex owns money, hosted fields keep PCI scope out, fail-closed bot parsing). It hardens the paths around them.