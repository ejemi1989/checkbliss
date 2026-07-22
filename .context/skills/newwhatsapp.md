# CheckinBliss WhatsApp CRM (Admin)

A purpose-built CRM admin layer for the CheckinBliss WhatsApp bot. NOT a generic CRM — every feature is chosen specifically because it fits the existing `lib/whatsapp-handlers.ts` and `app/api/webhooks/whatsapp/route.ts` implementation without conflicting with it.

Route: `app/admin/crm` — accessible only to admin (`ADMIN_DASH_KEY`).
Data: reads the existing CheckinBliss Supabase tables (`owners`, `operators`, `audit_log`, `damage_claims`, `reservations`, `inspection_schedule`). No new schema required for core features.

---

## Why a purpose-built CRM, not WaCRM

WaCRM is a general-purpose WhatsApp CRM. CheckinBliss's bot is an **operations automation system** — it processes financial commands (releasing deposit holds, filing damage claims) over WhatsApp. The fit-check (`WaCRM-Fit-Check.md`) confirmed three hard conflicts with WaCRM:

1. **Webhook URL clash** — WaCRM wants to own the Meta webhook; our bot must own it.
2. **Schema collision** — WaCRM's migrations would run against our existing tables.
3. **Duplicate replies** — WaCRM's auto-replies would fire alongside our bot's replies.

The right answer for CheckinBliss is a **thin admin CRM layer built directly on top of the existing bot** — reading the same `audit_log`, `owners`, `operators`, and `damage_claims` tables the bot already writes to. No second webhook, no second Supabase project, no duplicate replies.

---

## Feature selection (only what fits)

| Feature | Included | Reason |
|---|---|---|
| Conversation inbox | ✅ | Core — see all owner/operator threads |
| Thread status (resolved/open) | ✅ | Bot-handled = resolved; unknown = open |
| Internal notes on threads | ✅ | Admin context on owners/operators |
| Owner/operator contacts | ✅ | Reads existing `owners`/`operators` tables |
| Contact tags & status | ✅ | Owner status, city, verification state |
| Damage claim queue | ✅ | Core admin workflow — already in schema |
| Inspection status board | ✅ | Reads `inspection_schedule` — already built |
| Broadcast (template sends) | ✅ | Admin sends to owners/operators via existing `sendWhatsApp` |
| Audit log viewer | ✅ | Reads existing `audit_log` table |
| Analytics (volumes, response times) | ✅ | Derived from `audit_log` |
| Keyword auto-replies | ❌ | Conflicts with bot's strict parser |
| AI auto-reply (global) | ❌ | Would double-reply to CLEAN/DAMAGE/BLOCK |
| Button/flow conversations | ❌ | Owners/operators use strict text commands |
| Sales pipeline for guests | ❌ | Guests book on the web, not WhatsApp |
| Second webhook registration | ❌ | Bot owns the webhook — never split it |

---

## 1. Conversation Inbox

**What it is:** a live view of every WhatsApp thread the bot has seen — one row per owner/operator contact, showing their last message, who they are, and whether the thread is resolved or open.

**How it works with the existing bot:**
The bot writes every inbound message to `audit_log` (`action: "whatsapp.in"`, `subject: { from, text, message_id }`). The CRM inbox reads that table — no second webhook needed.

**Thread status logic:**
- **Resolved** — the bot sent a successful reply (`audit_log` action `"whatsapp.out"` follows the `"whatsapp.in"` within the same `wamid` chain). BLOCK/CLEAN/DAMAGE all auto-resolve.
- **Open** — the bot replied "Sorry, I didn't understand" OR the message had no bot reply at all (e.g. a freeform question like "when does my payout arrive?"). Admin needs to follow up.
- **Escalated** — `inspection_schedule.escalated_at` is set OR `damage_claims.admin_decision = 'pending'` for >48h.

**UI layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ CheckinBliss CRM — Inbox          [All] [Open] [Escalated]  │
├──────────────┬──────────────────────────────────────────────┤
│ Tolu Adeyemi │ CLEAN                          2m  ✓ resolved│
│ owner · Lagos│                                              │
├──────────────┼──────────────────────────────────────────────┤
│ Bola Okonkwo │ "when does my payout arrive?"  5m  ● open   │
│ owner · Abuja│                                              │
├──────────────┼──────────────────────────────────────────────┤
│ Chidi Eze    │ DAMAGE — awaiting admin        1h  ▲ escalate│
│ operator · LG│                                              │
└──────────────┴──────────────────────────────────────────────┘
```

**Data source:**
```ts
// Read from audit_log — no new tables
select * from audit_log
where action in ('whatsapp.in', 'whatsapp.out')
order by created_at desc;
```

---

## 2. Thread Detail + Internal Notes

**What it is:** clicking a thread shows the full message history for that contact (from `audit_log`), plus an internal-notes panel admin can write to.

**Notes schema (one new table, small):**
```sql
-- 0005_crm_notes.sql
create table crm_notes (
  id uuid primary key default gen_random_uuid(),
  contact_e164 text not null,        -- the owner/operator phone number
  note text not null,
  created_by text not null,          -- admin identifier
  created_at timestamptz not null default now()
);
```

**What admin can do:**
- Read the full inbound/outbound thread chronologically.
- Add a note ("Owner has 2 disputed claims — flag next BLOCK"), visible only in the CRM.
- Mark a thread as resolved manually (when admin has replied via WhatsApp directly).
- **Cannot send a WhatsApp message from the CRM inbox** — sends go via the existing `sendWhatsApp()` function, not a new interface. This prevents the CRM from becoming a parallel send path that bypasses audit.

---

## 3. Owner & Operator Contacts

**What it is:** a contact directory that reads directly from the existing `owners` and `operators` tables — no duplicate storage.

**Owner contact card:**
```
Tolu Adeyemi                    [owner]  [Lagos]  [verified]
+44 7700 900123
Units: Sunset Dove Unit 1, Sunset Dove Unit 2
Last message: 2 min ago — CLEAN (resolved)
Notes: 2 damage claims filed, 0 upheld.
```

**Operator contact card:**
```
Chidi Eze                       [operator]  [Lagos]
+234 801 234 5678
Assigned city: Lagos
Inspections completed this month: 14
Last message: 1 hour ago — DAMAGE (escalated)
```

**Filters:**
- By role (owner / operator)
- By city (Lagos / Abuja)
- By status (active / suspended)
- By last-message date

**Data source:** `owners` + `operators` + `operator_assignments` + `audit_log` — all existing tables, zero new schema.

---

## 4. Damage Claim Queue

**What it is:** the primary admin action surface — every open damage claim in one queue, with the WhatsApp thread context alongside it.

**This is the most important CRM feature** because it directly connects to money: admin approves/adjusts/rejects → Stripe captures or releases the deposit hold.

**Queue layout:**
```
┌────────────────────────────────────────────────────────────────┐
│ Damage Claims                          [Pending] [Resolved]    │
├───────────────┬────────────────────────────────────────────────┤
│ Sunset Dove 2 │ Operator: Chidi Eze                           │
│ Lagos         │ Reported: 2h ago                              │
│ £100 hold     │ Estimate: ₦15,000                             │
│               │ Photos: 3 of 5                                 │
│               │ [View photos] [Approve] [Adjust] [Reject]     │
├───────────────┼────────────────────────────────────────────────┤
│ Palm Nest     │ Operator: Amara Obi                           │
│ Abuja         │ Reported: 5h ago                              │
│ £80 hold      │ Estimate: ₦8,000                              │
│               │ Photos: 5 of 5 — complete                     │
│               │ [View photos] [Approve] [Adjust] [Reject]     │
└───────────────┴────────────────────────────────────────────────┘
```

**Actions wire to existing code:**
```ts
// These already exist in the damage-claims admin handler
Approve  → captureFromHold(intentId, estimateMinor)   // full capture
Adjust   → captureFromHold(intentId, adjustedMinor)   // partial + release remainder
Reject   → releaseHold(intentId)                      // full release
```

**Data source:** `damage_claims` + `deposit_holds` + `reservations` + `properties` — all existing tables.

**Photos:** served via signed URLs from the private `damage-photos` Supabase bucket (already specced in `Property-Media-Implementation.md` Pipeline B).

---

## 5. Inspection Status Board

**What it is:** a live board showing where every active reservation is in the inspection flow — keyed off `inspection_schedule` (already built).

**Board columns:**
```
Pre-notice due  │  Prompt due  │  Awaiting reply  │  Reminder sent  │  Escalated  │  Complete
─────────────── │  ──────────  │  ──────────────  │  ─────────────  │  ─────────  │  ────────
Palm Nest       │  Sunset Dove │  Lagoon View     │  Maitama Garden │  Eko Pearl  │  5 today
checkout tom.   │  checkout now│  +2h no reply    │  +6h no reply   │  +48h       │
```

**What admin can see per card:**
- Property name + city
- Guest name
- Checkout time (property-local WAT)
- Operator assigned
- Time since last cron action
- Link to the operator's WhatsApp thread in the inbox (§1)

**Escalated tab:** shows all reservations where the operator hasn't replied in 48h — admin can reach out directly to the operator via WhatsApp from here.

**Data source:** `inspection_schedule` + `reservations` + `properties` + `operators` — all existing tables.

---

## 6. Broadcast (Admin → Owners/Operators)

**What it is:** admin sends a pre-approved template to a segment of owners or operators. Not a general broadcast tool — scoped strictly to the 11 CheckinBliss registered templates.

**Use cases:**
- Platform update to all Lagos owners.
- Inspection procedure change to all operators.
- "Block your dates for Christmas" seasonal reminder to all owners.
- Payout schedule change to all owners.

**Segment options:**
- All owners
- Owners in Lagos / Abuja
- All operators
- Operators in Lagos / Abuja
- Specific owner/operator by phone

**Template picker:** shows only the 11 registered templates from `whatsapp-flows.md`:
```
new_booking · pre_checkout_reminder · post_checkout_clean
post_checkout_damage · damage_resolution · payout_processed
verification_scheduled · verification_failed
pre_checkout_confirm · inspection_prompt · inspection_reminder
```

**Sends via existing `sendWhatsApp()`** — not a new send path. Every send is audited to `audit_log` exactly as the bot's sends are.

**No delivery tracking at launch** — add read-receipt tracking as Launch-Supporting once the core is stable.

---

## 7. Audit Log Viewer

**What it is:** a searchable, filterable view of the existing `audit_log` table — the authoritative record of every financial and operational event.

**Why it's in the CRM:** the `audit_log` already captures every WhatsApp inbound/outbound, every calendar block, every inspection result, every deposit action, every damage claim decision. Right now there's no admin UI to see it — the data exists, it just has no screen.

**Filter options:**
- By action type (`whatsapp.in`, `whatsapp.out`, `calendar.block`, `inspection.clean`, `inspection.damage`, `dispute.raised`, `stripe.event`, etc.)
- By actor (owner phone, operator phone, `system:cron`, `stripe:webhook`)
- By date range
- By property / reservation ID

**Export:** CSV for compliance and dispute resolution.

**Data source:** `audit_log` — no new schema.

---

## 8. Analytics

**What it is:** a simple dashboard of operational metrics derived from `audit_log` and the operational tables.

**Metrics:**
```
Today                    This week             This month
─────────────────────    ──────────────────    ──────────────────
New bookings: 3          Inspections: 14       Damage claims: 2
Owner messages: 8        Clean rate: 92%       Holds at risk: £180
Open threads: 2          Avg response: 18m     Resolved: 1
```

**Charts:**
- Inbound messages per day (7/30/90 days) — from `audit_log`.
- Inspection outcomes (CLEAN vs DAMAGE vs NOSHOW) — from `inspections`.
- Damage claim resolution time — from `damage_claims`.
- Bot auto-resolve rate (resolved without admin) — from `audit_log` action pairs.

**Data source:** `audit_log` + `inspections` + `damage_claims` + `inspection_schedule`. No new schema.

---

## How it connects to the existing webhook

The existing webhook stays **exactly as built**. The CRM is a **read layer**, not a new processing path:

```
Meta → POST /api/webhooks/whatsapp (existing, unchanged)
         │
         ├─ verifyMetaSignature      (existing)
         ├─ extractMessage           (existing)
         ├─ handleInbound            (existing)
         │    ├─ BLOCK/UNBLOCK → calendar_blocks
         │    ├─ CLEAN → releaseHold → deposit_holds
         │    ├─ DAMAGE → damage_claims (CRM queue reads this)
         │    └─ audit_log (CRM inbox reads this)
         │
         └─ Response.json({ ok: true })  (existing)

CRM admin routes (NEW — read only):
app/admin/crm/inbox          → reads audit_log
app/admin/crm/contacts       → reads owners + operators
app/admin/crm/claims         → reads damage_claims + deposit_holds
app/admin/crm/inspections    → reads inspection_schedule
app/admin/crm/broadcast      → calls sendWhatsApp() (existing lib)
app/admin/crm/audit          → reads audit_log
app/admin/crm/analytics      → aggregates audit_log + operational tables
```

**No fan-out. No second webhook. No second Supabase project. No schema collision.**

---

## Schema additions (minimal)

The CRM needs **one new table** and **one small addition** to an existing one:

```sql
-- 0005_crm.sql

-- Internal admin notes on owner/operator threads
create table crm_notes (
  id uuid primary key default gen_random_uuid(),
  contact_e164 text not null,
  note text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);
create index crm_notes_contact_idx on crm_notes (contact_e164, created_at desc);
alter table crm_notes enable row level security;

-- Thread status override (when admin manually resolves a thread)
create table crm_thread_status (
  contact_e164 text primary key,
  status text not null default 'open',  -- open | resolved | escalated
  updated_at timestamptz not null default now(),
  updated_by text not null
);
alter table crm_thread_status enable row level security;
```

Everything else — inbox messages, contacts, damage claims, inspection board, analytics — reads from tables the bot already writes to.

---

## Build order for your coding agent

```
1. app/admin/crm/layout.tsx          → admin auth guard (ADMIN_DASH_KEY)
2. app/admin/crm/inbox/page.tsx      → read audit_log, show threads
3. app/admin/crm/inbox/[e164]/       → thread detail + crm_notes
4. app/admin/crm/contacts/page.tsx   → owners + operators list + filters
5. app/admin/crm/claims/page.tsx     → damage_claims queue + approve/adjust/reject
6. app/admin/crm/inspections/page.tsx → inspection_schedule board
7. app/admin/crm/broadcast/page.tsx  → template picker + segment + send via sendWhatsApp()
8. app/admin/crm/audit/page.tsx      → audit_log viewer + filters + CSV export
9. app/admin/crm/analytics/page.tsx  → metrics + charts from audit_log
10. 0005_crm.sql                     → apply the two new tables
```

**All pages are Server Components** reading Supabase directly via `createServer()`. No client-side data fetching of business data. Consistent with `Server-Action-Architecture-V1.md`.

---

## One paragraph for your coding agent

> Build the CheckinBliss WhatsApp CRM as a set of admin-only Server Component pages under `app/admin/crm/`. The CRM is a **read layer on top of the existing bot** — it reads `audit_log` (for the inbox and analytics), `owners`/`operators` (for contacts), `damage_claims`/`deposit_holds` (for the claim queue), and `inspection_schedule` (for the inspection board). The only write paths are: (1) `crm_notes` inserts (admin internal notes), (2) damage claim decisions (approve/adjust/reject → `captureFromHold`/`releaseHold` from `lib/stripe.ts`, already built), and (3) broadcast sends via the existing `sendWhatsApp()` from `lib/whatsapp.ts`. The existing webhook at `app/api/webhooks/whatsapp/route.ts` is **completely unchanged** — the CRM never registers a second webhook, never sends via a new path, and never conflicts with the bot's strict command parsing. Add one migration (`0005_crm.sql`) for `crm_notes` and `crm_thread_status` only. All other data comes from existing tables. Auth via `ADMIN_DASH_KEY` on the layout. Build in order: inbox → contacts → claims → inspection board → broadcast → audit viewer → analytics.