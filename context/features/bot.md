# CheckinBliss — WhatsApp Bot Build Guide

A single spec for building the owner/operator WhatsApp bot. For a coding agent. The sending + parsing logic already exists in `lib/whatsapp.ts` — this guide is about the **webhook handler**, the **Meta setup**, and the **test path**.

---

## 1. Mental model (read first)

The bot is **NOT** a chatbot framework, NOT Twilio, NOT conversational AI. At launch it is:

> a webhook that receives a message → verifies the signature → matches the sender → parses ONE strict command → does ONE database action → sends a templated reply.

No AI, no conversation memory, no NLP. Commands are exact strings (`BLOCK 15-20 Sept Unit 2`, `CLEAN`). Malformed input is **rejected, never guessed** (PRD 8.5). (AI conversational parsing is Phase 2 — see `User-Flow-V2.md` Flow 4.)

Two HTTP directions, both via **Meta WhatsApp Cloud API** (`graph.facebook.com/v21.0`):
- **Inbound:** Meta POSTs to your webhook when someone messages your number.
- **Outbound:** you POST to Meta's `/messages` endpoint (template messages). Already implemented as `sendWhatsApp()`.

---

## 2. What already exists (`lib/whatsapp.ts`) — do not rewrite

- `whatsappConfigured` — false when no token → **mock mode** (sends logged, not dispatched).
- `verifyMetaSignature(rawBody, signatureHeader)` — HMAC `X-Hub-Signature-256`, timing-safe, rejects unsigned.
- `sendWhatsApp(toE164, template, params)` — outbound template send (mock-aware).
- `parseOwnerCommand(body)` → `OwnerCommand | null` — `BLOCK` / `UNBLOCK` (with date-range parsing) / `AVAILABILITY` / `BOOKINGS` / `HELP`.
- `parseOperatorCommand(body)` → `OperatorCommand | null` — `CLEAN` / `DAMAGE` / `NOSHOW` / `GUESTPRESENT` / `YES` / `REASSIGN <rep>`.

**The job is to write the webhook route that wires these together with the database.**

---

## 3. Build order (do NOT start with Meta)

1. **Logic in mock mode** — build the webhook handler; test it by POSTing a sample Meta payload (Section 6) with `curl`. Prove `BLOCK`/`UNBLOCK`/`CLEAN`/`DAMAGE` mutate the DB correctly. No Meta account needed.
2. **Meta test number** — deploy the webhook to a public HTTPS URL (Vercel preview, or `ngrok` for local). Register the webhook in the Meta app. Message it from your own phone.
3. **Production** — verified business number, approved templates, real owners/operators registered.

Logic first (cheap, fast, no external dependency) → plumbing (Meta) → production (verification + templates). Starting with Meta means debugging credentials before you know your handler works.

---

## 4. Meta setup checklist (one-time, account side — not code)

> Start business verification EARLY; it can take days.

- [ ] Create a **Meta Business** account + a **Meta App** at developers.facebook.com.
- [ ] Add the **WhatsApp** product to the app (gives a sandbox test number to start).
- [ ] Verify a real number as your **WhatsApp Business** number (needs business verification).
- [ ] Collect into env (`.env.local`):
  - `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_ACCESS_TOKEN` (use a long-lived/system-user token for production)
  - `WHATSAPP_APP_SECRET` (for signature verification)
  - `WHATSAPP_VERIFY_TOKEN` (any random string you choose)
- [ ] In the app's WhatsApp config, set the **Webhook callback URL** = `https://<your-domain>/api/webhooks/whatsapp` and the **Verify Token** = your `WHATSAPP_VERIFY_TOKEN`; subscribe to the `messages` field.
- [ ] **Register message templates** (Meta approves them — utility templates approve fast). You cannot send a free-form business-initiated message outside the 24-hour service window. Templates needed:
  - `new_booking`, `pre_checkout_reminder`, `inspection_prompt`, `post_checkout_clean`, `post_checkout_damage`, `damage_resolution`, `payout_processed`, `verification_scheduled`, `verification_failed` (see `specs/WhatsApp-Messaging-V1.md` for copy).

---

## 5. The webhook handler — `app/api/webhooks/whatsapp/route.ts`

### 5a. GET — verification challenge (Meta calls this once)

```ts
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}
```

### 5b. POST — inbound messages (the real work, IN THIS ORDER)

```ts
import { verifyMetaSignature, sendWhatsApp,
         parseOwnerCommand, parseOperatorCommand } from "@/lib/whatsapp";
import { createAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  // 1. RAW body first — signature is computed over the exact bytes
  const raw = await req.text();

  // 2. Verify signature — reject anything unsigned (never trust the body otherwise)
  if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new Response("bad signature", { status: 401 });
  }

  const payload = JSON.parse(raw);
  const msg = extractMessage(payload); // sender E.164 + text + message id (Section 6)
  if (!msg) return Response.json({ ignored: true }); // status updates etc. — ack with 200

  const db = createAdmin();

  // 3. Idempotency — Meta REDELIVERS. Ignore already-processed message ids.
  if (await alreadyProcessed(db, "whatsapp", msg.id)) {
    return Response.json({ duplicate: true });
  }

  // 4. Match sender to a registered owner/operator. Unknown → ignore (do not reply).
  const person = await matchByWhatsApp(db, msg.from); // profiles.whatsapp_e164
  if (!person) { await markProcessed(db, "whatsapp", msg.id); return Response.json({ ignored: true }); }

  // 5. Parse + authorize + execute, by role
  if (person.role === "owner") {
    const cmd = parseOwnerCommand(msg.text);
    if (!cmd) { await reply(person, "Sorry, I didn't understand. Send HELP for commands."); }
    else await handleOwner(db, person, cmd, reply);
  } else if (person.role === "operator") {
    const cmd = parseOperatorCommand(msg.text);
    if (!cmd) { await reply(person, "Reply CLEAN, DAMAGE, NOSHOW, or GUESTPRESENT."); }
    else await handleOperator(db, person, cmd, reply);
  }

  // 6. Audit + mark processed
  await audit(db, "whatsapp.in", { from: msg.from, text: msg.text });
  await markProcessed(db, "whatsapp", msg.id);

  return Response.json({ ok: true }); // ALWAYS 200 once signature passes, so Meta stops retrying
}
```

### 5c. Command handlers (authorize, then mutate)

```ts
async function handleOwner(db, owner, cmd, reply) {
  switch (cmd.kind) {
    case "BLOCK":
    case "UNBLOCK": {
      const property = await findOwnedProperty(db, owner.id, cmd.listing); // AUTHORIZE: owner owns it
      if (!property) return reply(owner, `You don't manage a listing called "${cmd.listing}".`);
      if (cmd.kind === "BLOCK") await insertBlock(db, property.id, cmd.from, cmd.to);
      else await removeBlock(db, property.id, cmd.from, cmd.to);
      return reply(owner, `${cmd.kind === "BLOCK" ? "Blocked" : "Unblocked"} ${cmd.from}–${cmd.to} for ${property.name}.`);
    }
    case "AVAILABILITY": /* read + reply */ break;
    case "BOOKINGS":     /* read + reply */ break;
    case "HELP":         return reply(owner, "Commands: BLOCK / UNBLOCK <dates> <unit>, AVAILABILITY <unit> <month>, BOOKINGS.");
  }
}

async function handleOperator(db, op, cmd, reply) {
  const reservation = await currentInspectionFor(db, op.id); // the stay this operator is inspecting now
  if (!reservation) return reply(op, "No inspection is currently assigned to you.");
  // AUTHORIZE: operator must be assigned to the property's city (operator_assignments)
  if (!await operatorCoversCity(db, op.id, reservation.city)) return reply(op, "That property isn't in your assigned city.");

  switch (cmd.kind) {
    case "YES":          /* confirm availability for the checkout */ break;
    case "REASSIGN":     /* reassign to cmd.rep */ break;
    case "CLEAN":        await releaseHoldFor(db, reservation); return reply(op, `Confirmed clean — deposit released for ${reservation.propertyName}.`);
    case "DAMAGE":       await openDamageClaim(db, reservation, op.id); return reply(op, "Send up to 5 photos and an estimated cost.");
    case "NOSHOW":
    case "GUESTPRESENT": await escalateToAdmin(db, reservation, cmd.kind); return reply(op, "Logged and sent to admin.");
  }
}
```

`reply` = `(person, text) => sendWhatsApp(person.whatsapp_e164, <template>, [text])` + `audit("whatsapp.out")`. In mock mode this just logs.

---

## 6. Sample inbound payload (test against this — no Meta needed)

Meta's webhook body for a text message. Your `extractMessage()` digs out sender + text + id:

```jsonc
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WABA_ID",
    "changes": [{
      "field": "messages",
      "value": {
        "messaging_product": "whatsapp",
        "metadata": { "phone_number_id": "PHONE_ID" },
        "contacts": [{ "wa_id": "447700900123" }],
        "messages": [{
          "from": "447700900123",
          "id": "wamid.ABC123",
          "timestamp": "1718000000",
          "type": "text",
          "text": { "body": "BLOCK 15-20 Sept Sunset Dove Unit 2" }
        }]
      }
    }]
  }]
}
```

```ts
function extractMessage(payload: any) {
  const m = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!m || m.type !== "text") return null;       // ignore status updates, media-only, etc.
  return { from: `+${m.from}`, text: m.text.body, id: m.id };
}
```

**Local test (mock mode):** sign the body yourself and POST it.
```bash
BODY='{ ...payload above... }'
SIG="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WHATSAPP_APP_SECRET" | sed 's/^.* //')"
curl -X POST localhost:3000/api/webhooks/whatsapp \
  -H "x-hub-signature-256: $SIG" -H "content-type: application/json" -d "$BODY"
```

---

## 7. Command grammar (what owners/operators type)

**Owner:**
| Command | Example | Action |
|---|---|---|
| `BLOCK <range> <unit>` | `BLOCK 15-20 Sept Sunset Dove Unit 2` | block dates (owned units only) |
| `UNBLOCK <range> <unit>` | `UNBLOCK 15-20 Sept Sunset Dove Unit 2` | unblock |
| `AVAILABILITY <unit> <month>` | `AVAILABILITY Sunset Dove Unit 2 Sept` | read |
| `BOOKINGS` | `BOOKINGS` | list upcoming |
| `HELP` | `HELP` | list commands |

**Operator:** `YES` · `REASSIGN <rep>` · `CLEAN` · `DAMAGE` · `NOSHOW` · `GUESTPRESENT`

Date range format: `D-D Mon` or `D-D Mon YYYY` (bare month assumes the next occurrence). `parseDateRange` returns ISO with an **exclusive** upper bound for `daterange` semantics.

---

## 8. Hard rules (must not break)

- **Verify signature before trusting the body.** Compute HMAC over the **raw** bytes (read `req.text()` before `JSON.parse`).
- **Always return 200 once the signature passes** (even for ignored messages) so Meta stops retrying; only return 401 for a bad signature.
- **Idempotent:** dedupe on Meta's `message.id`; Meta redelivers.
- **Unknown sender → ignore**, don't reply (don't leak that the number is a CheckinBliss bot).
- **Strict parse:** `null` from the parser → a "didn't understand / HELP" reply, never a guessed action.
- **Authorize every mutation:** owner owns the property; operator assigned to the city.
- **All writes via `createAdmin()`**; audit every inbound + outbound message.
- **Outbound business-initiated messages must be approved templates** (24-hour window rule).
- **Works in mock mode** — the whole loop runs and is testable with no Meta credentials.

---

## 9. Definition of done

- [ ] GET verification challenge passes Meta's check
- [ ] POST rejects an unsigned/mis-signed body (401)
- [ ] Duplicate `message.id` is a no-op
- [ ] Unknown sender ignored silently
- [ ] `BLOCK`/`UNBLOCK` mutate `availability_blocks` for owned units only; reject others
- [ ] `CLEAN` releases the deposit hold; `DAMAGE` opens a claim + requests photos; `NOSHOW`/`GUESTPRESENT` escalate
- [ ] Malformed text → HELP reply, no mutation
- [ ] Every inbound + outbound logged to `whatsapp_audit_log`
- [ ] Entire flow tested via curl in mock mode before any Meta credentials exist

---

## 10. One paragraph to hand your coding agent

> Build `app/api/webhooks/whatsapp/route.ts` for the Meta WhatsApp Cloud API. GET does the verify-token challenge. POST, in order: read the raw body, verify `X-Hub-Signature-256` via `verifyMetaSignature` (401 if invalid), `extractMessage()` the sender E.164 + text + id, dedupe on the message id (Meta redelivers), match the sender against `profiles.whatsapp_e164` (ignore unknown), parse with `parseOwnerCommand`/`parseOperatorCommand` from `lib/whatsapp.ts`, authorize (owner owns the listing / operator assigned to the city), execute the DB mutation via `createAdmin()`, send a templated reply via `sendWhatsApp`, and audit inbound + outbound. Always return 200 once the signature passes. Must run and be fully testable in mock mode (no Meta credentials) using a sample payload over curl. Do not add an AI/NLP layer — strict command parsing only.