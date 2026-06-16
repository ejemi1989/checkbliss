# CheckinBliss — Implementation Spec: Notifications + Inspection Cron

For the coding app. Sequenced, verifiable build tasks to wire and finish the operator loop (A + B). Schema-accurate against `0001_schema.sql` (verified: `reservations.stay` is a `daterange` → checkout = `upper(stay)`; operators link to cities via `operator_assignments`; `properties.city`). Build tasks **in order**; each has acceptance criteria.

Files already written (typecheck clean): `lib/notifications.ts`, `app/api/cron/inspections/route.ts`, `supabase/migrations/0003_inspection_schedule.sql`, and the booking route now calls `notifyOwner.newBooking`.

---

## TASK 1 — Apply the schedule migration

**Do:** apply `supabase/migrations/0003_inspection_schedule.sql` (creates `inspection_schedule`).
**Accept:** `inspection_schedule` exists with columns `reservation_id (unique)`, `checkout_at`, `pre_notice_sent_at`, `prompt_sent_at`, `reminder_sent_at`, `escalated_at`, `released_at`, `completed_at`; partial index on open rows; RLS enabled.

---

## TASK 2 — Create a schedule row when a booking confirms

The cron has no input until this exists. In `app/api/bookings/route.ts`, in the confirmed-booking block (step 6, where the owner is notified), insert one `inspection_schedule` row per reservation.

**`checkout_at` must be property-local (WAT, UTC+1) then stored UTC.** Compute from the reservation's checkout date (`upper(stay)`) + `confirmed_checkout_time`:

```ts
// per reservation r, after confirm:
// checkout date = day AFTER the last night = upper(stay); time = confirmed_checkout_time
const checkoutLocal = `${r.check_out}T${r.checkout_time ?? "11:00:00"}+01:00`; // WAT
const checkoutAtUtc = new Date(checkoutLocal).toISOString();

await supabase.from("inspection_schedule").insert({
  reservation_id: r.reservation_id,
  checkout_at: checkoutAtUtc,
}).catch((e) => console.error("schedule insert failed (non-fatal):", e));
```

**Accept:** booking a stay creates exactly one `inspection_schedule` row with a correct UTC `checkout_at`. Best-effort (a failed insert must not fail the booking).

---

## TASK 3 — Fix the operator-city join in the cron

The first draft assumed a property→operator link that does not exist. **Correct relationship:** `properties.city` → `operator_assignments.city` → `operators.whatsapp_e164`. Replace the helper and the schedule query so they use `city`, not any `owner_id` alias.

**Corrected helper:**
```ts
async function operatorPhoneForCity(db, city: string): Promise<string | null> {
  const { data } = await db
    .from("operator_assignments")
    .select("operators!inner(whatsapp_e164)")
    .eq("city", city)
    .limit(1)
    .maybeSingle();
  return (data as any)?.operators?.whatsapp_e164 ?? null;
}
```

**Corrected schedule query** (drop the bad `operator_id:owner_id` alias; select the property's city + name):
```ts
const { data: rows } = await db
  .from("inspection_schedule")
  .select(`
    id, reservation_id, checkout_at,
    pre_notice_sent_at, prompt_sent_at, reminder_sent_at, escalated_at,
    reservations!inner (
      id, status,
      properties!inner ( name, city )
    )
  `)
  .is("completed_at", null)
  .is("released_at", null)
  .order("checkout_at", { ascending: true })
  .limit(200);
```
Then `const property = r.reservations.properties; const unit = property.name; const phone = await operatorPhoneForCity(db, property.city);`

**Accept:** for a seeded reservation in Lagos with a Lagos-assigned operator, the cron resolves that operator's phone; an Abuja operator is never selected for a Lagos property.

---

## TASK 4 — Mark schedule complete when a result arrives

When an operator submits a result (in `lib/whatsapp-handlers.ts`, the CLEAN/DAMAGE/NOSHOW/GUESTPRESENT handlers), after inserting into `inspections`, also stamp the schedule:

```ts
await db.from("inspection_schedule")
  .update({ completed_at: new Date().toISOString() })
  .eq("reservation_id", res.id);
```

**Accept:** once an operator replies with any result, the cron no longer sends reminders/escalation/auto-release for that reservation (the row drops out of the open query).

---

## TASK 5 — Register the Vercel cron

Confirm `vercel.json` runs `/api/cron/inspections` every 15 minutes:
```json
{ "crons": [{ "path": "/api/cron/inspections", "schedule": "*/15 * * * *" }] }
```
**Accept:** the path is present at a 15-min cadence; the handler rejects requests without `Authorization: Bearer <CRON_SECRET>` (403).

---

## TASK 6 — Test in mock mode (no DB, no Meta)

```bash
# mock mode → returns cleanly, processes nothing
curl -s localhost:3000/api/cron/inspections \
  -H "authorization: Bearer $CRON_SECRET"
# expect: {"ok":true,"mock":true,"processed":0}

# wrong/no secret → 403
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/api/cron/inspections
# expect: 403
```
**Accept:** both behaviours confirmed.

---

## TASK 7 — Test against a seeded DB (the real proof)

Seed one confirmed reservation with a **backdated** `checkout_at` and a held deposit, plus a city-assigned operator. Run the cron repeatedly and assert each step fires **exactly once** (idempotency):

| `checkout_at` relative to now | Expected after one run | After a second run |
|---|---|---|
| −1h (just past) | `prompt_sent_at` set, prompt sent | no re-send |
| −5h | prompt + reminder sent | no re-send |
| −49h | + escalated_at set | no re-escalate |
| −8 days | deposit hold released, `deposit_holds.status='expired'`, `released_at` set, row closed | no-op |

**Accept:** each timestamp is set once; the +7d backstop releases the hold and closes the row; running the cron twice changes nothing the second time.

---

## TASK 8 — Update the tracker

Mark in `progress-tracker.md`: feature 13 (Inspection Scheduler) → built+tested; note the notification layer (A) wired into booking confirm. Add `inspection_schedule` to the schema docs.

---

## Build order summary

```
1 migration  →  2 schedule-on-confirm  →  3 fix join  →  4 complete-on-result
   →  5 vercel cron  →  6 mock test  →  7 seeded test (idempotency + backstop)  →  8 tracker
```

## Guardrails (must hold)
- Cron is idempotent — every step gated on its timestamp; re-runs are no-ops.
- `checkout_at` computed in WAT, stored UTC.
- Notifications best-effort — never roll back a booking or abort a cron tick.
- All writes via `createAdmin()`; cron auth via `CRON_SECRET`.
- 7-day backstop always releases the hold (guest never penalised for platform failure).
- Operator resolution strictly via `operator_assignments.city` (city scope, PRD 10.2).
- Mock mode keeps working end to end.

## Out of scope here (separate tasks)
- Admin claim decision UI (features 18/19).
- Damage-photo media handler (`Property-Media-Implementation.md` Pipeline B).
- Meta template registration/approval (account-side; `whatsapp-flows.md` §5).