# State Architecture — Version 1 (Launch)

**CheckinBliss** · PRD v2.3 · Next.js 16 App Router. This document describes **where state lives, who owns it, and how it flows** — the database as source of truth, server vs client state, URL state, external system state machines, and caching/revalidation.

> **Guiding principle (PRD 4.1):** the **internal calendar is the single source of truth.** Almost all meaningful state is server state in PostgreSQL; client state is deliberately minimal. The architecture pushes state *down* to the database and *out* to URL params, keeping the React client thin.

---

## 1. The Five State Layers

| Layer | Owns | Lifetime | Example |
|---|---|---|---|
| **1. Source-of-truth (DB)** | all durable business state | permanent | reservations, holds, inspections, claims |
| **2. Server-render (RSC)** | derived read state for a request | per request | property list, detail, availability |
| **3. URL / search params** | navigational & shareable state | per navigation | `?city=Lagos`, selected slug |
| **4. Client (React)** | ephemeral UI state only | per session/tab | currency toggle, booking-flow step |
| **5. External system state** | payment / messaging / inspection lifecycles | per entity | Airwallex intent, WhatsApp thread, inspection state machine |

The deliberate bias: **layers 1–3 carry almost everything; layer 4 is kept tiny.** No global client store, no Redux/Zustand, no client cache of business data.

## 2. Layer 1 — Source of Truth (PostgreSQL)

All durable state lives in Supabase and is governed by status enums that *are* the state machines:

- **`reservations.status`:** `pending_payment → confirmed → completed`; `→ cancelled`.
- **`deposit_holds.status`:** `held → released | partially_captured | fully_captured | expired`.
- **`damage_claims.admin_decision`:** `pending → approved | adjusted | rejected`; dispute `none → open → accepted | resolved`.
- **`properties.status`:** `draft → pending_review → approved → suspended`.
- **availability:** materialised as `reservations` + `calendar_blocks` ranges, protected by GiST exclusion constraints.

Because the **DB owns non-overlap and the 14-day rule as invariants**, no client or server cache can ever hold authoritative availability — the database is asked at decision time.

## 3. Layer 2 — Server-Rendered Read State (RSC)

Reads are React Server Components that query at request time. Pages that depend on live availability/inventory are explicitly dynamic:

```ts
export const dynamic = "force-dynamic";   // storefront, detail, booking
```

There is **no client-side data fetching for business reads** — the server renders the current truth and ships HTML. This eliminates client/server state drift for inventory and pricing.

## 4. Layer 3 — URL / Search-Param State

Navigational state lives in the URL so it is shareable, back-button-correct, and server-readable:

- **City browse:** `/?city=Lagos` — read server-side via `searchParams` (navigation, **not** a client filter — PRD 6.4).
- **Property selection:** the route param `/stays/[slug]`, `/book/[slug]`.
- **Confirmation:** `/confirmation/[reference]`.

Search params are awaited in Server Components (`searchParams: Promise<…>` in Next 16) and drive the query — the URL *is* the state.

## 5. Layer 4 — Client State (kept minimal)

Only genuinely ephemeral UI state is client-side, via small React contexts/`useState` — never browser storage, never a global business store.

### 5.1 Currency display (implemented)
`CurrencyProvider` (`components/currency.tsx`) holds the selected display currency (GBP/USD/EUR) in React context. It is **display-only** (PRD 12.1) — it never affects what is charged (always GBP), so it is safe as pure client state with no server persistence.

```tsx
const [cur, setCur] = useState<Cur>("GBP");   // ephemeral, per tab
```

### 5.2 Booking flow steps
The 3-step booking flow (dates & guest → checkout option → payment) holds its in-progress selections in component `useState` until submit. This state is **transient by design** — it is not authoritative until `POST /api/bookings` writes a reservation. If the tab closes, nothing is lost that mattered, because no dates are reserved until the atomic booking call succeeds.

### 5.3 What is deliberately NOT client state
Availability, prices, booking status, deposit status — all server-owned. The client never caches them; it re-reads from the server. This is the anti-drift stance.

## 6. Layer 5 — External System State Machines

State that lives in external services, mirrored (not owned) in our DB:

| External state | Lives in | Mirrored as | Transitions driven by |
|---|---|---|---|
| Payment intent (charge) | Airwallex | `reservations.payment_intent_id` + status | booking API, Airwallex webhook |
| Deposit hold | Airwallex | `deposit_holds.status` | booking, inspection result, admin decision, 7-day cron |
| WhatsApp conversation | Meta (24h window) | `whatsapp_audit_log` + parsed commands | inbound webhook, outbound templates |
| Inspection lifecycle | our cron + operator replies | `inspections.*_at` timestamps | scheduler (15-min) + operator WhatsApp |

The **inspection lifecycle** is the most explicit state machine: `scheduled → pre-notice sent → prompt sent → (operator replies CLEAN/DAMAGE/NOSHOW/GUESTPRESENT) → reminder (+4h) → escalation (+48h) → auto-release (+7d)`. State is the set of timestamp columns; the cron advances it idempotently (each tick acts only on rows whose timestamps show the next step is due).

## 7. Caching & Revalidation

- **Dynamic by default** for inventory/availability/booking surfaces (`force-dynamic`) — correctness over cache.
- **Static/edge-cacheable** for brand/marketing content where staleness is harmless.
- **No client cache** of business data; the server is re-queried.
- Idempotency (Airwallex `request_id` keyed on booking group) means even a retried mutation converges to one consistent state — important because the client cannot be trusted to know whether its previous attempt succeeded.

## 8. Consistency Model

- **Strong consistency where it matters:** booking/availability is a single ACID transaction with DB-enforced invariants — never eventually-consistent.
- **Mirrored consistency for externals:** Airwallex/WhatsApp state is reconciled via webhooks and (Tier-2) a daily reconciliation job; the DB is the authoritative mirror.
- **No optimistic client updates** for money or availability — the client waits for the server's authoritative result and shows guest-safe messaging ("nothing was charged") on failure.

## 9. Summary Invariants

1. The **database is the single source of truth** (PRD 4.1); caches and clients are never authoritative.
2. **Client state is ephemeral and tiny** — currency display + in-progress form only.
3. **Navigational state lives in the URL**, server-readable and shareable.
4. **External state is mirrored, not owned**, and reconciled by webhooks + cron.
5. **Strong consistency for booking/money**; no optimistic updates on those paths.