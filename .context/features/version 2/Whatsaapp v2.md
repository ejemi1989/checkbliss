# WhatsApp Messaging — Version 2 (AI Conversational)

**CheckinBliss** · PRD v2.3 §12.3 (Phase 2). V1 is strictly command-based; V2 adds an **AI conversational interface** in front of it. The command set, notification copy, security model, and audit rules from V1 are all retained — the AI is a natural-language layer over the same validated commands, never a replacement for them.

---

## 1. What V2 Adds (PRD 12.3)

> "AI conversational WhatsApp interface (V1 is command-based)" — PRD §12.3, Phase 2.

A natural-language understanding (NLU) layer that lets owners and operators write freely instead of memorising command syntax, while every action still resolves to a V1-validated command.

## 2. Architecture — NLU in Front of the Strict Parser

```
 inbound message
      │
      ▼
 signature + sender check (V1, unchanged)
      │
      ▼
 NLU layer ── maps free text ─▶ candidate V1 command
      │                              │
      │  confident & unambiguous ────┘──▶ execute (same path as V1)
      │
      └─ ambiguous / low confidence ──▶ strict confirmation prompt
                                         ("Block 15–20 Sept for Sunset Dove Unit 2 — yes?")
```

- The AI **maps to the existing command set** (`BLOCK`, `UNBLOCK`, `AVAILABILITY`, `CLEAN`, `DAMAGE`, …) — it never invents new privileged actions.
- **Fail-closed preserved (PRD 8.5):** anything ambiguous falls through to an explicit confirmation rather than guessing. The V1 "malformed requests rejected, not guessed" principle becomes "ambiguous requests confirmed, not guessed."

## 3. Examples

| Owner writes | Resolves to |
|---|---|
| "block the 15th to the 20th of September for unit 2 at sunset dove" | `BLOCK 15-20 Sept Sunset Dove Unit 2` → confirm → execute |
| "how's unit 2 looking next month" | `AVAILABILITY Sunset Dove Unit 2 [next month]` |
| "what have I earned recently" | `EARNINGS` |

| Operator writes | Resolves to |
|---|---|
| "all good here, no issues" | `CLEAN` → confirm → release hold |
| "kettle's broken, handle snapped, about 15k naira" + photos | `DAMAGE` + estimate + media → admin review |
| "I can't make it, send Bola instead" | `REASSIGN Bola` |

## 4. Retained from V1 (unchanged)

- **All notification copy** (new booking, pre/post-checkout, payout, verification, damage resolution).
- **Security model** — signature verification, sender matching, per-role authorisation scope, 12-month audit retention.
- **One thread per owner** with per-unit identification.
- **Template messages** for business-initiated outbound (WhatsApp policy).
- **Media handling** for operator photo uploads.

## 5. Guardrails

- The AI operates **only after** the V1 sender/signature checks pass — it never sees unauthenticated traffic.
- It cannot escalate privilege: an owner's free text can only resolve to owner commands scoped to owned properties; an operator's only to assigned cities.
- Every AI-resolved action is written to the **same audit log** with the original free text and the resolved command, for traceability.
- Destructive or financial actions (block dates, report damage) always require an explicit confirmation step.

## 6. Continuity

V2 is a usability layer, not a new control plane. If the AI layer is unavailable, the V1 command syntax still works verbatim — the conversational interface degrades gracefully to the launch behaviour.