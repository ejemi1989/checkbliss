# Server Action Architecture — Version 1 (Launch)

**CheckinBliss** · PRD v2.3 · Next.js 16 App Router. This document describes the **server-side mutation architecture** — how writes execute on the server, when a Next.js **Server Action** (`"use server"`) is used versus a **Route Handler** (`app/api/*`), and the invariants every mutation must uphold.

> **Current build note.** The implemented launch paths (booking, WhatsApp webhook, cron, admin) use **Route Handlers**. Server Actions are the recommended mechanism for the **internal, form-driven** mutations (admin claim decisions, owner edits) and are documented here as the structured pattern. Both run on the same Node server, share the same secret-key admin client, and uphold the same invariants — the choice is about invocation surface, not trust model.

---

## 1. Two Server Mechanisms, One Trust Model

| Mechanism | Invoked by | Best for | Used for in V1 |
|---|---|---|---|
| **Server Action** (`"use server"`) | a component calling the function directly (form/button) | internal, authenticated, form-driven mutations | admin claim decision, operator/owner edits, dispute submission |
| **Route Handler** (`app/api/*`) | HTTP request (fetch, webhook, cron) | external callers, webhooks, idempotent public endpoints, scheduled jobs | `POST /api/bookings`, WhatsApp webhook, Airwallex webhook, cron |

**Decision rule:** if the caller is **the CheckinBliss UI itself** and the action is a form/button submit, use a **Server Action**. If the caller is **external** (a guest's payment retry, Meta's webhook, Vercel Cron, a third party) or needs an addressable URL / idempotency key, use a **Route Handler**.

## 2. Shared Foundations (every mutation, both mechanisms)

1. **Validate first (Zod).** Every input is parsed and validated before any side effect — defence in depth, never trust the client.
2. **Secret-key admin client.** All writes run through the server-only Supabase admin client (`createAdmin`), never the browser/anon client. RLS still protects every read path; writes are deliberately funnelled server-side.
3. **Authorise explicitly.** The mechanism does not grant authority — each action re-checks the actor's role and scope (owner owns the property; operator assigned to the city; admin is admin).
4. **Audit.** Sensitive mutations append to `audit_log` (bookings, suspensions, refunds, damage decisions — PRD 8.5 / 11.1).
5. **Fail closed.** On validation/authorisation failure the action returns a typed error and performs no partial write.

## 3. Server Actions in V1

### 3.1 Admin claim decision (form-driven, internal)

```ts
// app/admin/claims/actions.ts
"use server";
import { z } from "zod";
import { createAdmin } from "@/lib/supabase";
import { captureFromHold, releaseHold } from "@/lib/airwallex";

const Decision = z.object({
  claimId: z.string().uuid(),
  decision: z.enum(["approve", "adjust", "reject"]),
  amountMinor: z.number().int().positive().optional(),
});

export async function decideClaim(input: z.infer<typeof Decision>) {
  const { claimId, decision, amountMinor } = Decision.parse(input);
  const db = createAdmin();

  // authorise: caller must be admin (checked via session/role)
  await assertAdmin();

  const claim = await loadClaim(db, claimId);            // + deposit hold
  if (decision === "reject") {
    await releaseHold(claim.hold.intentId);
  } else {
    const amount = decision === "approve" ? claim.estimateMinor : amountMinor!;
    await captureFromHold(claim.hold.intentId, amount);  // remainder auto-returned
  }
  await recordDecision(db, claimId, decision, amountMinor); // sets 7-day dispute window
  await audit(db, "claim.decision", { claimId, decision });
  return { ok: true };
}
```

Invoked directly from the admin UI's Approve/Adjust/Reject buttons — no `fetch`, no public URL, progressive-enhancement friendly.

### 3.2 Other V1 Server-Action candidates

- **Guest dispute submission** (within the 7-day window, PRD 7.7).
- **Owner property edits** (Launch-Supporting; subject to operator editorial approval).
- **Operator verification logging** from the web review surface.

These are all internal, authenticated, form-driven — the Server-Action sweet spot.

## 4. Route Handlers in V1 (and why not Server Actions)

| Path | Why a Route Handler, not a Server Action |
|---|---|
| `POST /api/bookings` | needs an **idempotency-keyed**, addressable endpoint; called from the booking flow and retried on network failure; carries the atomic charge+hold sequence |
| `POST /api/webhooks/whatsapp` | **external** caller (Meta); requires raw-body **HMAC signature verification** — Server Actions don't expose raw request bodies cleanly |
| `POST /api/webhooks/airwallex` | external payment events; signature-verified |
| `GET /api/cron/*` | invoked by **Vercel Cron** with a `CRON_SECRET` bearer — a scheduled HTTP caller, not a UI |

Webhooks and cron are inherently external HTTP callers, so they **must** be Route Handlers. The booking endpoint stays a Route Handler because idempotency, retry semantics, and the multi-step payment orchestration are cleaner as an addressable POST.

## 5. The Booking Mutation (reference flow)

Whether expressed as a Route Handler (current) or wrapped by a thin Server Action that forwards to it, the booking mutation always:

1. Zod-validates guest + 1–5 items; checks the **14-day rule** at the edge.
2. Calls **`book_stays()`** — the atomic, multi-city DB transaction (the double-booking invariant lives in Postgres, not here).
3. Creates the Airwallex **charge** (auto-capture) + **deposit hold** (manual-capture), idempotency-keyed on the booking group.
4. Confirms the group, persists `deposit_holds`, fires the owner WhatsApp notice, audits.
5. On payment failure after reservation: **compensating cancel** so dates free and nothing is charged.

The server mechanism never owns the safety guarantees — the **database** owns non-overlap, and **Airwallex** owns money movement. The action orchestrates; it does not enforce.

## 6. Error & Result Contract

Server Actions return typed results (`{ ok: true } | { ok: false, code, message }`) consumed directly by the calling component; Route Handlers return the equivalent as HTTP status + JSON (PRD-aligned codes: 409 dates unavailable, 422 14-day/validation, 502 payment). Both surface guest-safe messages ("nothing was charged") and never leak internal detail.

## 7. Security Invariants (summary)

- No mutation runs on the anon/browser client — **admin client, server-only**, always.
- Every action **re-authorises**; the invocation surface grants nothing.
- External callers (webhooks) are **signature-verified**; cron is **secret-protected**.
- Validation precedes side effects; failures are atomic (no partial writes).
- Sensitive actions are **audited**.

These hold identically across Server Actions and Route Handlers — the trust model is uniform; only the entry point differs.