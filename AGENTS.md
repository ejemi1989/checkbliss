<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

This project is **Next.js 16 (App Router)**. Notable: `params` and `searchParams` are **async** (`Promise<...>`) in pages — always `await` them. Route Handlers live in `app/api/**/route.ts`. Server Actions are `"use server"` functions in `actions/`.

<!-- END:nextjs-agent-rules -->

# CheckinBliss

Premium instant-booking platform for verified short-stay apartments in **Lagos & Abuja**, built for the African diaspora. Operated by Lyxio Curtis Ltd. Launch target: **September 1, 2026**. Brand: luxury, curated, editorial (Plum Guide + Mr Porter references).

## Read Before Anything Else

Read in this exact order before any implementation:

1. `CheckinBliss_PRD_v2_3.pdf` — the product brief (source of truth for scope)
2. `docs/CheckinBliss-Architecture.md` — stack, folders, schema, data flow, invariants
3. `docs/specs/Design-System-V1.md` — tokens, typography, layout (PRD §3)
4. `docs/phase1/01-Backend-Architecture.md` — Launch-Critical backend
5. `docs/phase1/02-API.md` — endpoint contracts
6. `docs/phase1/03-Database.md` + `04-Schema.md` — data model + DDL
7. `docs/Payment-Flow-V1.md` — charge + deposit-hold flow
8. `docs/specs/WhatsApp-Messaging-V1.md` — bot commands + templates
9. `docs/CheckinBliss-Build-Plan.md` — phased feature sequence
10. `docs/progress-tracker.md` — current build status (update as you go)

## Stack

- **Framework:** Next.js 16 (App Router), TypeScript strict
- **DB + Auth:** Supabase (PostgreSQL + RLS). **Not** Firebase/InsForge.
- **Payments:** Stripe (PaymentIntents + manual-capture deposit holds). **Not** Airwallex.
- **Messaging:** WhatsApp Business (Meta Cloud API) — owner/operator bot.
- **Styling:** Tailwind CSS **v4** (`@theme` tokens in `app/globals.css`). Do **not** downgrade to v3.
- **Validation:** Zod at every server boundary.
- **Jobs:** Vercel Cron -> `CRON_SECRET`-protected route handlers.

## Rules That Never Change

- **Never use hardcoded hex values or raw Tailwind color classes.** Use the `@theme` tokens (`ink`, `bone`, `lagoon`, `brass`, `hairline`, ...) defined in `app/globals.css`.
- **Double-booking is a database invariant.** Never add application-side availability checks as the guard — the GiST `EXCLUDE` constraint on `reservations` is the guard. Never weaken or drop it.
- **Deposits are manual-capture holds, never charges.** Money only moves on an approved damage claim. Never auto-capture a deposit.
- **Card data never touches the server.** Stripe PaymentIntents (server-confirmed with a generated test PaymentMethod; no client Elements yet). Never accept raw PAN/CVV.
- **All writes go through `createAdmin()`** (server-only secret key) in Server Actions / Route Handlers. **Never** write from the browser/anon client.
- **Every mutation re-authorises** — owner owns the property; operator assigned to the city; admin is admin. The invocation surface grants nothing.
- **Webhooks are signature-verified; cron is `CRON_SECRET`-protected.** Unsigned/unknown senders are ignored. WhatsApp parsing is strict — malformed input is rejected, never guessed.
- **Money is integer minor units (GBP pence).** Charges settle in GBP; display only GBP/USD/EUR; **NGN is excluded from display**.
- **Idempotency on payments** — Stripe `idempotency_key` keyed on `booking_group_id` (e.g. `charge-<group>`, `hold-<group>`).
- **Reviews are Trustpilot-only.** Never build on-platform reviews/ratings.
- **Mock mode must always work** — the full booking -> payment -> hold -> confirmation flow runs with no Supabase/Stripe/WhatsApp credentials. Never introduce a hard dependency that breaks mock mode.
- **Late checkout is a service indicator, not a filter** (PRD 6.4). Never add it as a search/sort control.
- Update `docs/progress-tracker.md` after every feature.
- Before any third-party library — load its installed skill first, then read `docs/library-docs.md` for project-specific rules.
- If the same problem persists after one corrective prompt — stop immediately and re-read the PRD + architecture before trying again.

## System Boundaries

- `app/` — pages and route handlers only. No business logic; delegate to `lib/`.
- `actions/` — Server Actions for internal, form-driven mutations only (claim decision, dispute, owner edits).
- `components/` — UI only. No DB calls. Data passed via props from Server Components. Client state is minimal (currency toggle, in-progress form).
- `lib/` — domain logic + third-party clients (`supabase.ts`, `stripe.ts`, `whatsapp.ts`), `currency.ts`, `types.ts`, `data.ts`.
- `supabase/` — migrations (schema, RLS, `book_stays()`), seed data. The source of truth.

## Supabase Client Pattern

Three clients in `lib/supabase.ts` — never mix them:

- `createBrowser()` — publishable/anon key; read-only storefront, governed by RLS.
- `createServer()` — cookie-aware; Server Components & signed-in handlers, governed by RLS.
- `createAdmin()` — **secret/service-role key, server-only, bypasses RLS.** Every write uses this.

Supports new (`sb_publishable_...` / `sb_secret_...`) and legacy (`anon` / `service_role`) key names. Runtime flags (`supabaseConfigured`, `supabaseAdminConfigured`) drive mock mode.

## Data Access Pattern

- **Server Actions** (`actions/*.ts`, `"use server"`) — internal form-driven mutations. Zod-validate -> `assertRole` -> `createAdmin()` write -> audit -> `revalidatePath`.
- **Route Handlers** (`app/api/**/route.ts`) — external callers, webhooks, cron, and the idempotent booking endpoint.
- **Reads** — Server Components query at request time (`force-dynamic` for inventory/availability). No client-side fetching of business data; no browser storage of business data.

## Booking Invariant (the core flow)

`POST /api/bookings`: Zod + 14-day check -> `book_stays()` atomic RPC (overlap -> rollback, no charge) -> Stripe charge (auto-capture) + deposit hold (manual-capture) -> `confirm_booking_group()` -> persist `deposit_holds` (7-day expiry) -> owner WhatsApp -> audit. Payment failure after reserve -> compensating group cancel (dates freed, nothing charged). **The server orchestrates; the database owns non-overlap and Stripe owns money movement.**

## Environment

All credentials in `.env.example`; the app runs in mock mode with none set. Keys: Supabase (URL + publishable + secret), Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PK`), WhatsApp (`WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, phone number id, access token), `CRON_SECRET`, `ADMIN_DASH_KEY`. Never hardcode or commit keys.

## Project Skills

These skills are installed at `.agents/skills/` for project-specific use:

| Skill | File | Use Case |
|-------|------|----------|
| `test-engineer` | `.agents/skills/test-engineer/SKILL.md` | Test strategy, writing tests, coverage analysis |
| `code-reviewer` | `.agents/skills/code-reviewer/SKILL.md` | Pre-merge code review across 5 dimensions |
| `security-auditor` | `.agents/skills/security-auditor/SKILL.md` | Vulnerability detection, threat modeling |
| `web-performance-auditor` | `.agents/skills/web-performance-auditor/SKILL.md` | Core Web Vitals, bundle size, rendering perf |

Load one when the task matches its description. Each enforces a structured output format and verification gate.

## Debugging

The `ce-debug` skill is installed and should be loaded for any bug investigation. Before fixing, write a failing test:

1. **Reproduce** — run `npm test` to see current state, then write a test that proves the bug exists
2. **Trace** — use `npm run typecheck` and `npm run lint` first; most issues are caught there
3. **Fix** — make the test pass, verify with `npm run build`

### Commands

| Command | Purpose |
|---------|---------|
| `npm test` | Run all tests (vitest) |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint across .ts/.tsx |
| `npm run build` | Full Next.js build (catches missing exports, async patterns, route errors) |

### Common Failure Patterns (this project)

- **Zod v4** — `ZodError` uses `.issues` not `.errors`. If you see `.errors` in a stack trace, that's the bug.
- **Mock mode not returning data** — check the `supabaseConfigured` / `supabaseAdminConfigured` booleans in `lib/supabase.ts`. If a function throws instead of falling back, it's using one of the three clients incorrectly.
- **API route returning 500** — likely a missing `await` on `params`/`searchParams`, or a Zod `parse()` (returns data) vs `safeParse()` (returns result) mismatch.
- **Booking overlap not detected** — mock mode uses in-memory check; verify the `book_stays()` RPC in Supabase is the production guard, not app logic.
- **Stripe call failing** — mock mode triggers when `STRIPE_SECRET_KEY` is unset; if it's set but wrong, mock mode won't engage and real API will reject. Unset the env var to force mock mode.
- **Dashboard button does nothing** — check the Server Action import path (`actions/*.ts`, not `lib/`). Actions use `"use server"` directive and must be imported directly, not passed through client components incorrectly.