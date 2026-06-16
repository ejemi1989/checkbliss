# CheckinBliss — WhatsApp Bot Technical Documentation

**Version:** 1.0  
**Last updated:** June 2026  
**API:** Meta WhatsApp Cloud API v22.0  

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        META CLOUD API                                │
│                    graph.facebook.com/v22.0                          │
└──────┬───────────────────────────────────────┬──────────────────────┘
       │ ① Inbound (POST)                      │ ② Outbound (POST)
       │ Meta → our webhook                    │ Our server → Meta
       ▼                                        ▼
┌──────────────────────────┐    ┌──────────────────────────────────────┐
│  app/api/webhooks/       │    │  lib/whatsapp.ts                     │
│  whatsapp/route.ts       │    │                                      │
│                          │    │  sendWhatsApp() — text reply (24h)    │
│  GET  → verify challenge │    │  sendWhatsAppTemplate() — templates  │
│  POST → full pipeline    │    │  fetchWhatsAppMedia() — damage photos│
│                          │    │  verifyMetaSignature()               │
└──────┬───────────────────┘    │  parseOwnerCommand()                 │
       │                         │  parseOperatorCommand()              │
       │ ③ Commands              └──────────────────────────────────────┘
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    DUAL-MODE DATA LAYER                              │
│                                                                      │
│  supabaseAdminConfigured === true    │   supabaseAdminConfigured     │
│  → createAdmin() → PostgreSQL        │   === false → mock stores     │
│    (profiles, availability_blocks,   │   (in-memory arrays)          │
│     reservations, damage_claims,     │                               │
│     whatsapp_audit_log, etc.)        │                               │
└──────────────────────────────────────────────────────────────────────┘
```

**Key principle:** The bot is NOT a chatbot framework. It is a strict webhook that receives a message → verifies signature → matches sender → parses ONE command → does ONE database action → sends a templated reply. No AI, no NLP, no conversation memory.

---

## 2. File Structure

| File | Responsibility |
|------|---------------|
| `lib/whatsapp.ts` | Meta API client: outbound `sendWhatsApp`, `sendWhatsAppTemplate`, `fetchWhatsAppMedia`, signature verification, command parsers |
| `app/api/webhooks/whatsapp/route.ts` | Meta webhook endpoint: GET verification, POST inbound pipeline, command handlers, authorization |
| `lib/idempotency.ts` | Message deduplication (Meta redelivers) |
| `lib/supabase.ts` | Supabase clients: `createAdmin()` for writes, `supabaseAdminConfigured` flag |
| `lib/seed-data.ts` | Mock property and reservation data used in mock mode |
| `lib/media.ts` | Damage photo storage (mock in-memory, Supabase Storage in production) |
| `lib/observability.ts` | Structured logging |
| `tests/whatsapp.test.ts` | Unit tests for `lib/whatsapp.ts` (3 tests) |
| `tests/whatsapp-webhook.test.ts` | Integration tests for webhook route (27 tests) |

---

## 3. Inbound Webhook (`app/api/webhooks/whatsapp/route.ts`)

### 3.1 GET — Verification Challenge

Meta calls this once when registering the webhook. Returns the raw `hub.challenge` string on success.

```
GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>

Response: <challenge>          (200)
Response: "Forbidden"          (403 — wrong token or missing mode)
```

**Configuration:** `WHATSAPP_VERIFY_TOKEN` env var or fallback `"checkinbliss-verify-2026"`.

### 3.2 POST — Inbound Message Pipeline

The POST handler executes in strict order:

| Step | Operation | Failure Handling |
|------|-----------|-----------------|
| 1 | Read raw body as text (for HMAC) | — |
| 2 | Verify `X-Hub-Signature-256` via `verifyMetaSignature()` | 401 "Invalid signature" |
| 3 | Parse JSON payload, `extractMessage()` | 200 `{ignored:"no message"}` |
| 4 | Idempotency check: `wasProcessed("whatsapp", msgId)` | 200 `{duplicate:true}` |
| 5 | Match sender: `matchByWhatsApp(db, e164)` | 200 `{ignored:"unknown sender"}` |
| 6 | Audit inbound via `auditWhatsApp()` | — |
| 7 | Parse: `parseOwnerCommand()` / `parseOperatorCommand()` | 200 `{replied:"help"}` |
| 8 | Authenticate: owner owns property / operator covers city | Reply with error, 200 |
| 9 | Execute: DB mutation via `createAdmin()` | Reply with result, 200 |
| 10 | `markProcessed("whatsapp", msgId)` | — |

**Critical:** Always returns 200 once signature passes, so Meta stops retrying. Only 401 on bad signature.

### 3.3 `extractMessage()`

Extracts the first message from a Meta webhook payload:

```
Payload path: entry[0].changes[0].value.messages[0]

Returns: { from: "+447700900123", text: "HELP", id: "wamid.ABC123", type: "text" }
Returns: null if no messages (status updates, deliveries, reads)
```

Supports `text` and `image` message types. Ignores all others.

---

## 4. Outbound Messaging (`lib/whatsapp.ts`)

### 4.1 `sendWhatsApp(phone, message)` → `Promise<boolean>`

Sends a plain text message. Works only within the 24-hour customer service window (reply to inbound).

```typescript
await sendWhatsApp("+447700900100", "✓ Blocked 15-20 Sept for Sunset Dove.");
```

- Mock mode: logs `[mock whatsapp] to +44...: message` and returns `true`
- Real: POST to `graph.facebook.com/v22.0/{phone_id}/messages`

### 4.2 `sendWhatsAppTemplate(phone, template, params)`

Sends a business-initiated template message. Works outside the 24-hour window.

```typescript
await sendWhatsAppTemplate("+447700900100", "new_booking", [
  "Sunset Dove", "Adaeze O.", "2026-09-15", "2026-09-19", "£480"
]);
```

- Mock mode: logs and returns `{mock: true}`
- Real: POSTs with `type: "template"`, body parameters mapped from `params` array

### 4.3 `fetchWhatsAppMedia(mediaId)` → `{ bytes, mime }`

Two-step media download for damage photos:
1. `GET /{mediaId}` → `{url, mime_type}`
2. `GET {url}` with Bearer token → file bytes

Mock mode returns a tiny JPEG placeholder (`[0xff, 0xd8, 0xff]`).

### 4.4 `verifyMetaSignature(rawBody, header)`

HMAC-SHA256 verification using `WHATSAPP_APP_SECRET`. Uses `crypto.timingSafeEqual` for constant-time comparison. Returns `true` (skip) when `WHATSAPP_APP_SECRET` is unset (mock mode).

---

## 5. Command Grammar

### 5.1 Owner Commands

| Command | Syntax | Example | Action |
|---------|--------|---------|--------|
| `HELP` | `HELP` | `HELP` | List commands |
| `BLOCK` | `BLOCK <range> <unit>` | `BLOCK 15-20 Sept Sunset Dove` | Block dates (owned units only) |
| `UNBLOCK` | `UNBLOCK <range> <unit>` | `UNBLOCK 15-20 Sept Sunset Dove` | Unblock dates |
| `AVAILABILITY` | `AVAILABILITY <unit> <month>` | `AVAILABILITY Sunset Dove Sept` | Query calendar |
| `BOOKINGS` | `BOOKINGS` | `BOOKINGS` | Upcoming bookings |

**Date range format:** `D-D Mon` or `D-D Mon YYYY`  
- Bare month assumes the next occurrence (e.g., "15-20 Jan" in November → next January)  
- Hyphen or en-dash accepted

**Partial commands** return usage instructions instead of the generic "Sorry, I didn't understand":
- `AVAILABILITY` alone → `"AVAILABILITY <unit> <month>"`  
- `BLOCK` alone → `"BLOCK <dates> <unit>"`  
- `AVAILABILITY Sunset Dove` (no month) → usage hint

### 5.2 Operator Commands

| Command | Syntax | Action |
|---------|--------|--------|
| `YES` | `YES` | Confirm availability for checkout |
| `REASSIGN` | `REASSIGN <rep>` | Reassign inspection |
| `CLEAN` | `CLEAN` | Release deposit hold |
| `DAMAGE` | `DAMAGE` | Open claim + request photos |
| `NOSHOW` | `NOSHOW` | Escalate to admin |
| `GUESTPRESENT` | `GUESTPRESENT` | Escalate to admin |

All commands are **case-insensitive**.

### 5.3 DAMAGE Photo Sub-Flow

```
Operator: DAMAGE
Bot:      "Damage noted. Send up to 5 photos. Reply DONE when finished."

Operator: [sends image 1]
Bot:      "✓ Photo 1 of 5 received. 4 remaining."

Operator: [sends image 2] ... [image 5]
Bot:      "Maximum 5 photos reached. Reply DONE to finalise."

Operator: DONE
Bot:      "✓ Claim filed with 5 photos. Admin will review within 24–48 hours."
```

Max 5 photos per claim (PRD §8.3). Photos are stored in the `damage-photos` Supabase Storage bucket.

---

## 6. Authorization Model

### 6.1 Owner Authorization

- Matched via `profiles.whatsapp_e164` (or `MOCK_PROFILES` in mock mode)
- `BLOCK`/`UNBLOCK`: only accepted for properties where `owner_id` matches (mock: checks `properties` array)
- `AVAILABILITY`/`BOOKINGS`: only shows properties the owner owns

### 6.2 Operator Authorization

- Must have an active inspection assigned (`inspections.operator_id = op.id AND result IS NULL`)
- Must be assigned to the property's city (`operator_assignments` table)

---

## 7. Data Flow for Each Command

### BLOCK
```
inbound → parse → authorize (owner → properties.owner_id) → 
  INSERT availability_blocks (property_id, starts, ends, source="whatsapp")
```

### UNBLOCK
```
inbound → parse → authorize → 
  DELETE FROM availability_blocks WHERE property_id AND starts AND ends
```

### AVAILABILITY
```
inbound → parse → authorize → 
  SELECT FROM reservations WHERE property_id AND status != 'cancelled' → format reply
```

### BOOKINGS
```
inbound → parse → 
  SELECT FROM reservations IN (owner's property_ids) WHERE status != 'cancelled' → format reply
```

### CLEAN
```
inbound → parse → authorize (operator → inspection → city) → 
  UPDATE deposit_holds SET status='released', released_at=NOW()
```

### DAMAGE
```
inbound → parse → authorize → 
  INSERT damage_claims (reservation_id, operator_id, description) → 
  activate photo flow state
```

### NOSHOW / GUESTPRESENT
```
inbound → parse → authorize → 
  UPDATE inspections SET result='noshow'|'guestpresent', escalated_at=NOW()
```

---

## 8. Idempotency (`lib/idempotency.ts`)

Meta **redelivers** webhooks. Every inbound message is deduplicated on Meta's `message.id`:

```
wasProcessed("whatsapp", msg.id) → skip (return 200, no action)
                                  → process → markProcessed("whatsapp", msg.id)
```

Current implementation uses in-memory `mockLedger[]`. Production intent: `processed_events` table.

---

## 9. Audit Trail

Every inbound and outbound message is logged:

- **Mock mode:** `mockAuditLog[]` in-memory array
- **Production:** `whatsapp_audit_log` table

| Column | Description |
|--------|-------------|
| `direction` | `"in"` or `"out"` |
| `wa_phone` | E.164 phone number |
| `profile_id` | UUID of matched profile |
| `body` | Message text |
| `parsed_command` | Recognized command kind (e.g., `"BLOCK"`, `"CLEAN"`) |
| `accepted` | Whether the command was authorized and executed |

---

## 10. Mock Mode

The entire system runs with zero credentials:

| Component | Without credentials | With credentials |
|-----------|-------------------|-----------------|
| `verifyMetaSignature` | Returns `true` (skip) | HMAC verification |
| `sendWhatsApp` | Logs to console | POSTs to Meta API |
| `sendWhatsAppTemplate` | Logs and returns `{mock:true}` | POSTs template |
| `fetchWhatsAppMedia` | Returns tiny JPEG placeholder | Downloads from Meta |
| `createAdmin()` | Throws → `db` set to `null` | Returns Supabase client |
| Database mutations | In-memory mock arrays | PostgreSQL |
| Sender matching | `MOCK_PROFILES` | `profiles` table |

---

## 11. Mock Profiles

5 registered senders for development/testing:

| Phone | Name | Role | City | Properties |
|-------|------|------|------|------------|
| `+447700900100` | Adaora Mensah | owner | — | PR001, PR003 |
| `+447700900200` | Tunde Ogunlade | operator | Lagos | — |
| `+447700900300` | Funke Adeyemi | operator | Abuja | — |
| `+16505551234` | Sheena Nelson | owner | — | PR002, PR005 |
| `+447535434252` | You | owner | — | PR001–PR006 |

---

## 12. Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `WHATSAPP_ACCESS_TOKEN` | For production | Meta permanent system user token |
| `WHATSAPP_PHONE_NUMBER_ID` | For production | Phone number ID from Meta app |
| `WHATSAPP_BUSINESS_ID` | Optional | Business account ID (not used in code) |
| `WHATSAPP_APP_SECRET` | For production | Signature verification secret |
| `WHATSAPP_VERIFY_TOKEN` | For production | Webhook verification challenge token (default: `checkinbliss-verify-2026`) |

---

## 13. Tests

### Unit Tests (`tests/whatsapp.test.ts`) — 3 tests
- Template generation (`newBooking`, `preCheckout`)
- Mock mode send

### Integration Tests (`tests/whatsapp-webhook.test.ts`) — 27 tests

| Category | Tests |
|----------|-------|
| GET verification | Valid token returns challenge, bad token → 403, missing challenge → 403 |
| POST security | Bad signature → 401, correct signature → 200 |
| POST idempotency | Duplicate message ID → no-op, status payloads ignored |
| POST sender | Unknown → silent ignore, malformed → HELP |
| Owner commands | HELP, BLOCK (owned + rejected), UNBLOCK, AVAILABILITY (valid + unknown), BOOKINGS |
| Operator commands | YES, REASSIGN, CLEAN, DAMAGE, NOSHOW, GUESTPRESENT |
| Photo flow | DAMAGE → images → DONE finalize; DONE without flow warns; image without flow warns |

**Run:** `npm test` — all 30 tests pass in under 1 second.

---

## 14. Deployment

- **GitHub:** `https://github.com/ejemi1989/checkbliss`
- **Vercel:** `https://checkbliss.vercel.app`
- **Webhook URL:** `https://checkbliss.vercel.app/api/webhooks/whatsapp`
- **Verify token:** `checkinbliss-verify-2026`
- **WhatsApp Business number:** `+1 555-667-4718`
- **Meta App ID:** `102290129340398`
- **Phone Number ID:** `1111655325371653`

Vercel auto-deploys on every push to `main`. Environment variables set via `vercel env add`.

---

## 15. Testing with curl

```bash
# GET verification
curl "https://checkbliss.vercel.app/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=checkinbliss-verify-2026&hub.challenge=TEST123"
# → TEST123 (HTTP 200)

# POST a HELP command
curl -s -X POST https://checkbliss.vercel.app/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account","entry":[{"id":"102290129340398","changes":[{"field":"messages","value":{"messaging_product":"whatsapp","metadata":{"display_phone_number":"15556674718","phone_number_id":"1111655325371653"},"contacts":[{"wa_id":"447535434252"}],"messages":[{"from":"447535434252","id":"wamid.TEST001","timestamp":"1718000000","type":"text","text":{"body":"HELP"}}]}}]}]}'
# → {"ok":true}
```

---

## 16. Cost Analysis

### 16.1 Development Cost

| Component | Hours | Notes |
|-----------|-------|-------|
| `lib/whatsapp.ts` (API client, parsers, templates) | 12h | Signature verification, 2 command parsers, 9 templates, media fetch, template send |
| `app/api/webhooks/whatsapp/route.ts` (webhook handler) | 18h | 10-step POST pipeline, dual-mode DB/mock, 5 owner commands, 6 operator commands, photo flow, audit |
| `lib/idempotency.ts` | 2h | Deduplication ledger |
| Tests (30 tests) | 8h | 3 unit + 27 integration, all mock-mode testable |
| Meta App setup & webhook verification | 4h | Business account, phone number, token, webhook registration |
| Documentation | 2h | Technical docs, cost analysis |
| **Total** | **~46 hours** | Equivalent to ~6 developer days |

**Market rate equivalent:** $3,500–$7,000 (at $75–$150/hr)  
**Actual cost:** $0 (AI-assisted implementation)

### 16.2 Meta WhatsApp Cloud API Pricing

Meta uses **conversation-based pricing** — you pay per 24-hour conversation window, not per message.

| Conversation Type | Rate (USD) | Our Usage |
|-------------------|------------|-----------|
| **Service** (user-initiated) | $0.0088–$0.0147 | Owner/operator commands — the user texts the bot first |
| **Utility** (business-initiated) | $0.0044–$0.0119 | Bot-initiated templates (booking confirmations, reminders) |
| **Marketing** | $0.0147–$0.0744 | Not used at launch |

**First 1,000 service conversations per month are FREE** (per WABA).

**Estimated monthly cost by scale:**

| Scale | Bookings/mo | Owner msgs | Operator msgs | Template sends | Monthly Cost |
|-------|-------------|------------|---------------|----------------|-------------|
| Launch (0–20 bookings) | 20 | ~40 | ~20 | ~80 | **$0.00** (free tier) |
| Growing (20–100 bookings) | 80 | ~160 | ~80 | ~320 | **$0.00** (free tier) |
| Scaling (100–500 bookings) | 300 | ~600 | ~300 | ~1,200 | **~$8–$15** |
| Established (500–2,000 bookings) | 1,000 | ~2,000 | ~1,000 | ~4,000 | **~$30–$60** |

**Key:** 1 booking triggers approximately:
- 2 owner notifications (new_booking, post_checkout_clean/damage)
- 3 operator messages (pre_checkout_confirm, inspection_prompt, response)
- = ~5 bot-initiated template sends per booking

**Cost per booking:** < $0.02 at any scale.

### 16.3 Infrastructure Costs

| Service | Plan | Monthly Cost | Limits |
|---------|------|-------------|--------|
| **Vercel** | Hobby | $0 | 100GB bandwidth, 6,000 build minutes |
| **Vercel** (at 2,000+ bookings) | Pro | $20 | 1TB bandwidth, faster builds |
| **Supabase** | Free | $0 | 500MB DB, 2 projects, 50,000 monthly active users |
| **Supabase** (at scale) | Pro | $25 | 8GB DB, 100,000 MAU |
| **GitHub** | Free | $0 | Unlimited public repos |
| **Total (launch)** | | **$0/mo** | |

### 16.4 Total Cost Summary

| Phase | Monthly Cost | Annual Cost |
|-------|-------------|-------------|
| **Launch** (0–100 bookings/mo) | **$0.00** | $0 |
| **Growth** (100–500 bookings/mo) | **$0–$15** | $0–$180 |
| **Scale** (500–2,000 bookings/mo) | **$30–$60** | $360–$720 |
| **Enterprise** (2,000+ bookings/mo) | **$105–$185** | $1,260–$2,220 |

### 16.5 One-Time Costs

| Item | Cost | Notes |
|------|------|-------|
| Meta Business Verification | $0 | Required; takes 2–7 days |
| WhatsApp Business number | $0 | Included with Meta App |
| Domain (checkbliss.vercel.app) | $0 | Vercel subdomain |
| Custom domain (optional) | $10–$20/yr | e.g., checkbliss.com |

### 16.6 What Costs Nothing

- All inbound commands (BLOCK, UNBLOCK, CLEAN, DAMAGE, etc.) — service conversation, within free tier for months
- Webhook hosting (Vercel free tier)
- Database (Supabase free tier)
- Signature verification, idempotency, audit logging
- Mock mode testing (zero Meta credentials needed)
- CI/CD (GitHub + Vercel auto-deploy)

### 16.7 What Would Increase Cost

| Trigger | Cost Impact |
|---------|------------|
| Adding conversational AI (Phase 2) | More messages per conversation, potential NLP API costs |
| Guest WhatsApp notifications (secondary channel) | Additional outbound templates per booking |
| Multi-language templates | Register + approve per language per template |
| High-res damage photo storage (Supabase Storage) | Storage + bandwidth over free tier ($0.06/GB) |

