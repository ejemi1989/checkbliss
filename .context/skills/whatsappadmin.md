# CheckinBliss — WhatsApp CRM (Admin)

Specification for the admin-facing WhatsApp CRM layer. Based on [wacrm.tech](https://wacrm.tech) — an open-source, MIT-licensed WhatsApp CRM template built on the official Meta Cloud API and Supabase (our existing stack). Fork, brand, and self-host on top of the existing CheckinBliss infrastructure.

Source: https://github.com/ArnasDon/wacrm
Docs: https://wacrm.tech/docs
Deploy: https://wacrm.tech/docs/deployment-hostinger

---

## 0. Why this fits CheckinBliss

| WaCRM capability | CheckinBliss admin need |
|---|---|
| Shared inbox | Admin sees all owner + operator WhatsApp threads in one place |
| Contact hub | Owners, operators, and guests as CRM contacts with tags |
| Sales pipelines | Property onboarding pipeline (prospect → invited → verified → live) |
| Broadcast campaigns | Owner/operator announcements, policy updates, platform news |
| No-code automations | Escalation flows, overdue-inspection alerts, damage-claim nudges |
| AI reply assistant | Admin drafts replies to complex owner/operator questions |
| Real-time analytics | Response times, inspection completion rates, damage claim volume |
| Templates in-app | Register + manage the 11 CheckinBliss WhatsApp templates |
| Members + roles | Admin + junior ops team access |

**Critical alignment:** WaCRM uses the official Meta Cloud API (same as our existing bot), stores data in Supabase (our existing DB), and is MIT-licensed (fork and brand). No new infrastructure — it slots into what already exists.

---

## 1. Shared Inbox

**What it does (WaCRM):** every WhatsApp conversation in one place; assign threads to agents; team replies; internal notes; real-time updates; no two agents replying to the same thread.

**CheckinBliss use:**
- Admin sees **all inbound owner and operator threads** (the same threads the bot handles) in one dashboard.
- Threads the bot handles automatically (BLOCK, CLEAN, DAMAGE, etc.) appear as read/resolved; threads the bot couldn't handle (gibberish, escalations, new owner onboarding) stay open for a human to pick up.
- Assign a damage-claim conversation to a specific ops team member.
- Leave internal notes on an owner thread ("this owner has two disputed claims — flag if they BLOCK again").
- Deep-link from a damage claim in the admin dashboard to the owner's WhatsApp thread.

**Connection to existing implementation:**
- The bot webhook (`/api/webhooks/whatsapp`) already processes inbound messages. WaCRM's inbox sits **alongside** the bot — both consume the same `messages` webhook subscription.
- Route: Meta sends inbound → your webhook processes it (bot logic first) → WaCRM also receives the event (second subscription, or fan-out in the webhook handler) → thread appears in the CRM inbox.
- Messages the bot auto-resolves (CLEAN → "Confirmed clean") are marked resolved in the inbox automatically.
- Messages the bot can't handle (unknown command, escalation, new registration) stay open for admin.

**Key features (from docs):**
- Assign threads to specific agents or round-robin.
- Internal notes (team-only, not sent to the contact).
- Unread indicators; urgent threads never slip through.
- Real-time updates — two agents never reply to the same thread simultaneously.

---

## 2. Contact Hub

**What it does (WaCRM):** tags, custom fields, notes, automatic deduplication, CSV import.

**CheckinBliss use:**
- **Owners** as contacts: tagged `owner`, custom fields for city (`Lagos` / `Abuja`), number of units, bank details reference, verification status.
- **Operators** as contacts: tagged `operator`, custom field for assigned city, inspection completion rate.
- **Guests** (optional): tagged `guest`, linked to booking reference, dispute status.
- Import existing owner/operator list from the Supabase `owners` + `operators` tables via CSV export.
- Automatic deduplication on phone number (E.164) — matches our existing sender-matching logic.

**Connection to existing implementation:**
- Supabase `owners` and `operators` tables are the source of truth for phone numbers.
- WaCRM contact records sync with these tables (import on setup; ongoing: new registrations create a contact automatically via automation — see §6).
- Custom field: `supabase_owner_id` / `supabase_operator_id` — links the CRM contact to the platform DB record for deep-linking.

---

## 3. Sales Pipelines (Property Onboarding)

**What it does (WaCRM):** kanban deal boards, drag-drop stages, deal value totals, linked contacts.

**CheckinBliss use — two pipelines:**

**Pipeline A — Property Onboarding:**
```
Prospect → Invited → Photography Scheduled → Inspection Passed → Live
```
- Each deal = one property.
- Linked to the owner contact.
- Deal value = projected monthly revenue (nightly rate × estimated occupancy).
- Cards show: property name, city, owner name, days in stage.

**Pipeline B — Operator Recruitment:**
```
Identified → Contacted → Interviewed → Onboarded → Active
```
- Each deal = one operator candidate.
- Linked to the operator contact.

**Connection to existing implementation:**
- Property `status` in Supabase (`draft → pending_review → approved → suspended`) maps to Pipeline A stages.
- When a property moves to `approved` in Supabase (via curation queue), the pipeline card is dragged to Live — or automated (§6).

---

## 4. Broadcast Campaigns

**What it does (WaCRM):** send Meta-approved templates to segmented lists; track delivery, reads, replies in real time; 4-step wizard.

**CheckinBliss use:**
- **Owner announcements:** platform updates, new feature launches, payout schedule changes. Segment by city (Lagos only / Abuja only / all).
- **Operator bulletins:** inspection procedure updates, new property assignments, monthly performance recaps.
- **Seasonal campaigns:** "Summer availability — block your dates now" to all owners before a peak period.
- **Damage policy updates:** send the updated damage-claim process to all operators after a policy change.

**Templates to broadcast (from `whatsapp-flows.md`):** any of the 11 registered templates (`new_booking`, `pre_checkout_reminder`, etc.) can be broadcast-triggered from here instead of programmatically.

**Connection to existing implementation:**
- Broadcasts use the same `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN` as the bot.
- Segmented lists built from the Contact Hub tags (`owner:lagos`, `operator:abuja`, etc.).
- Track delivery receipts in the CRM; reconcile against `audit_log` in Supabase for a full paper trail.

---

## 5. Templates Manager

**What it does (WaCRM):** build, submit, edit, and delete WhatsApp message templates in-app with real-time Meta approval status. Templates created elsewhere sync in.

**CheckinBliss use — manage all 11 registered templates from one screen:**

| Template name | Role | When |
|---|---|---|
| `new_booking` | Owner | Guest books |
| `pre_checkout_reminder` | Owner | 24h before checkout |
| `post_checkout_clean` | Owner | Clean inspection |
| `post_checkout_damage` | Owner | Damage reported |
| `damage_resolution` | Owner | Admin decides claim |
| `payout_processed` | Owner | Payout sent |
| `verification_scheduled` | Owner | Monthly verification |
| `verification_failed` | Owner | Verification issues |
| `pre_checkout_confirm` | Operator | 24h before checkout |
| `inspection_prompt` | Operator | At checkout |
| `inspection_reminder` | Operator | +4h no reply |

**Connection to existing implementation:**
- Templates already registered in Meta (per `whatsapp-flows.md` §5) — they sync into WaCRM automatically.
- Any new template (e.g. for guest WhatsApp, V2 features) can be submitted for Meta approval directly from WaCRM without touching the dashboard.
- Template approval status visible in real time — no more manually checking Meta Business Manager.

---

## 6. No-Code Automations

**What it does (WaCRM):** event-driven flows — triggers (new message, keyword, tag change, schedule), conditions, actions (send template, add tag, create deal, webhook), wait steps, per-run logs.

**CheckinBliss automations to build:**

| Automation | Trigger | Action |
|---|---|---|
| New owner registration | Contact created with tag `owner` | Send welcome template; create a deal in Pipeline A (Prospect stage) |
| Inspection overdue | Schedule: check daily | If `inspection_schedule.escalated_at` is set and no result: send a nudge to the operator; notify admin |
| Damage claim unresolved | Schedule: check daily | If `damage_claims.admin_decision = pending` for >48h: alert admin in inbox |
| Verification due | Schedule: monthly | Find all properties due for monthly verification; send `verification_scheduled` to owner + assign to operator |
| Owner BLOCK confirmation | Keyword: `BLOCK` | After bot processes: log a note on the owner contact "Blocked dates [range]" |
| New operator assigned to city | Tag change: `operator:lagos` added | Send welcome + city-specific operator brief |
| Property goes live | Deal moved to "Live" stage | Send owner a "You're live on CheckinBliss" broadcast |

**Connection to existing implementation:**
- The **webhook action** in WaCRM automations can call your internal API (e.g. `POST /api/admin/alerts`) to trigger actions in the CheckinBliss Supabase DB.
- The existing bot still handles the core command/inspection loop — WaCRM automations handle the CRM/admin layer on top.

---

## 7. AI Reply Assistant

**What it does (WaCRM):** bring-your-own OpenAI or Anthropic key; drafts replies from inbox; optional auto-reply bot with human handoff; knowledge base from your own docs.

**CheckinBliss use:**
- Admin uses the AI to **draft replies** to complex owner/operator questions the bot couldn't handle ("Why hasn't my payout arrived?", "Can I change the deposit amount?").
- Knowledge base populated with: CheckinBliss platform policies, payout schedule, verification process, damage claim procedure, owner FAQ.
- Auto-reply for out-of-hours: basic owner questions answered from the knowledge base; hands off to human for anything it can't resolve.
- **Bring your own Anthropic key** (you already use Claude) — no per-seat AI fee.

**Connection to existing implementation:**
- The existing bot handles structured commands (BLOCK, CLEAN, DAMAGE, etc.) — the AI assistant handles unstructured owner/operator prose that falls outside the strict parser.
- This is exactly the V2 AI conversational layer from `User-Flow-V2.md` Flow 4, but delivered now via WaCRM without building it from scratch.

---

## 8. Real-Time Analytics

**What it does (WaCRM):** active conversations, new contacts, open deal value, conversations over time, average first-response time by weekday, activity feed.

**CheckinBliss use:**
- Active owner + operator conversations.
- Inspection completion rate (this week vs last week).
- Open damage claims + total value at risk.
- Average response time to owner messages.
- Broadcast delivery rates.
- Pipeline: properties in each onboarding stage, projected revenue when live.

**Connection to existing implementation:**
- WaCRM analytics cover the WhatsApp layer.
- Cross-reference with Supabase `audit_log` + `inspection_schedule` + `damage_claims` for the full operational picture.
- No additional build — these are WaCRM out-of-the-box metrics.

---

## 9. Members & Roles

**What it does (WaCRM):** invite teammates, role-based access, ownership transfer.

**CheckinBliss use:**
- **Admin (founder):** full access — inbox, pipelines, broadcasts, automations, analytics, settings.
- **Ops team member:** inbox + contacts only — can reply to threads, add notes, can't send broadcasts or change automations.
- **Read-only analyst:** analytics + pipelines only — no messaging access.

---

## 10. Integration with the existing bot

This is the key architectural decision — WaCRM and the bot coexist on the **same WhatsApp number and same webhook**.

### How they share the webhook

Meta allows only **one webhook URL per WhatsApp Business Account**. Your existing bot webhook (`/api/webhooks/whatsapp`) is that URL. To feed WaCRM simultaneously:

**Option A — Fan-out in the existing webhook (recommended):**
```ts
// app/api/webhooks/whatsapp/route.ts — after bot processing
await handleInbound(msg);            // existing bot logic

// fan out to WaCRM's webhook URL
await fetch(process.env.WACRM_WEBHOOK_URL!, {
  method: "POST",
  headers: { "content-type": "application/json", "x-wacrm-secret": process.env.WACRM_SECRET! },
  body: raw,
}).catch((e) => console.error("wacrm fan-out failed (non-fatal):", e));
```
- Bot processes first (command parsing, DB mutations, send replies).
- WaCRM receives a copy to update the inbox, contact, and audit trail.
- Fan-out failure is non-fatal — bot still works.

**Option B — WaCRM as the primary webhook, bot as a downstream handler:**
- Register WaCRM's URL as the Meta webhook.
- WaCRM forwards to your bot via its public API (`/api/webhooks/whatsapp`).
- Simpler for WaCRM, but your bot depends on WaCRM being up.
- Not recommended — the bot is more critical than the CRM.

**Recommendation: Option A.** The bot is the critical path; WaCRM is the admin layer.

### What the bot handles vs what WaCRM handles

| Message type | Bot handles | WaCRM handles |
|---|---|---|
| Strict commands (BLOCK, CLEAN, DAMAGE, etc.) | ✅ fully | Inbox shows as auto-resolved |
| Damage photos | ✅ fetches + stores | Inbox shows the thread; admin can view |
| Unknown commands | ✅ replies "HELP" | Inbox stays open for human follow-up |
| New owner/operator registrations | ❌ not handled | WaCRM creates contact + opens pipeline deal |
| Complex owner queries ("why no payout?") | ❌ not handled | AI assistant drafts a reply |
| Admin broadcasts | ❌ not in scope | WaCRM sends via campaign |
| Template management | ❌ not in scope | WaCRM manages |

---

## 11. Setup checklist

### Phase 1 — Fork + configure
- [ ] Fork https://github.com/ArnasDon/wacrm
- [ ] Follow https://wacrm.tech/docs/getting-started (local setup, ~15 min)
- [ ] Supabase setup: https://wacrm.tech/docs/supabase-setup — **use a separate Supabase project for WaCRM** or carefully namespace tables to avoid collision with CheckinBliss schema
- [ ] Connect to the same `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN` (shared credentials)
- [ ] Set `WACRM_WEBHOOK_URL` in CheckinBliss `.env.local`; add the fan-out to the webhook route
- [ ] Paste your Anthropic API key in WaCRM AI settings (bring-your-own-key)

### Phase 2 — Data + templates
- [ ] Import owners + operators from Supabase CSV export into WaCRM Contact Hub (tagged `owner` / `operator`, custom field `supabase_id`)
- [ ] Sync the 11 existing templates — they should auto-populate from Meta once connected
- [ ] Add custom fields: `city`, `units_count`, `supabase_id`, `verification_status` for owners; `city`, `supabase_id` for operators

### Phase 3 — Pipelines + automations
- [ ] Create Pipeline A (Property Onboarding) with 5 stages
- [ ] Create Pipeline B (Operator Recruitment) with 5 stages
- [ ] Build the 7 automations from §6
- [ ] Populate the AI knowledge base with: platform policies, payout schedule, verification process, damage claim procedure, owner FAQ

### Phase 4 — Team
- [ ] Invite ops team members with role-appropriate access
- [ ] Test the full loop: receive an owner message → bot processes → CRM inbox shows resolved → unknown message → stays open → AI drafts reply → human sends

---

## 12. Hard rules

- The **bot is the critical path** — WaCRM is the admin layer on top. Bot failure must never depend on WaCRM being up.
- The fan-out to WaCRM is **non-fatal** — a WaCRM outage or slow response must not affect message processing.
- **Same phone number** — owners and operators continue messaging the same CheckinBliss number; they never know WaCRM exists.
- **Bot-handled commands are auto-resolved in the CRM inbox** — don't create manual work for things the bot already does.
- WaCRM uses its **own Supabase project** (or a clearly namespaced schema) — never let WaCRM migrations touch the CheckinBliss `reservations`, `properties`, `owners`, `operators`, or `deposit_holds` tables.
- Audit trail: WaCRM has its own logs; the CheckinBliss `audit_log` remains the authoritative record for all financial and booking events.

---

## 13. Links

| Resource | URL |
|---|---|
| WaCRM homepage | https://wacrm.tech |
| GitHub repo (MIT) | https://github.com/ArnasDon/wacrm |
| Getting started | https://wacrm.tech/docs/getting-started |
| Supabase setup | https://wacrm.tech/docs/supabase-setup |
| WhatsApp setup | https://wacrm.tech/docs/whatsapp-setup |
| Environment variables | https://wacrm.tech/docs/environment-variables |
| Inbox docs | https://wacrm.tech/docs/inbox |
| Contacts docs | https://wacrm.tech/docs/contacts |
| Pipelines docs | https://wacrm.tech/docs/pipelines |
| Templates docs | https://wacrm.tech/docs/templates |
| Broadcasts docs | https://wacrm.tech/docs/broadcasts |
| Automations docs | https://wacrm.tech/docs/automations |
| AI assistant docs | https://wacrm.tech/docs/ai-assistant |
| Members docs | https://wacrm.tech/docs/members |
| Public API docs | https://wacrm.tech/docs/public-api |
| Architecture | https://wacrm.tech/docs/architecture |
| Deploy on Hostinger | https://wacrm.tech/docs/deployment-hostinger |