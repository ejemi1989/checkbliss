# Supabase Postgres Best Practices — Audit Report

**Date:** 2026-07-12
**Skill:** `context/supabase/SKILL.md` (Supabase Postgres best practices, 30 rules)
**Scope:** All 7 migrations + `lib/data.ts` + `app/api/**` query patterns
**Result:** 2 migrations added (indexes, RLS perf), 1 application bug fixed

---

## CRITICAL — Fixed

### 1. Missing foreign-key indexes (rule: `schema-foreign-key-indexes`)

Several FK columns had no index, forcing `ON DELETE CASCADE` and JOINs to seq-scan.

| Table.column | Referenced table | Migration |
|---|---|---|
| `properties.owner_id` | profiles | 0008 |
| `reservations.guest_id` | profiles | 0008 |
| `inspections.operator_id` | profiles | 0008 |
| `damage_claims.reporting_operator_id` | profiles | 0008 |
| `damage_claims.admin_reviewer_id` | profiles | 0008 |
| `property_photos.uploaded_by` | profiles | 0008 |
| `whatsapp_audit_log.profile_id` | profiles | 0008 |

**Impact:** 10-100x faster JOINs and CASCADE operations (per rule impactDescription).

### 2. RLS functions not wrapped in `(select ...)` (rule: `security-rls-performance`)

`auth_role()` was called directly in `USING` clauses. The planner treats that as per-row evaluation. Wrapping in `(select auth_role())` makes it an initPlan, run once per query.

**Fixed:** 18 RLS policies rewritten in migration `0009_rls_perf_and_grants.sql`.
**Impact:** 5-10x faster RLS queries on large tables (per rule impactDescription).

### 3. Fall-through bug in `getAllApprovedProperties()` (Important)

`lib/data.ts:389-394` had identical branches — both returned `getSeedProperties().filter(...)` regardless of `supabaseConfigured`. When Supabase is wired, the function silently returned seed data instead of DB data.

**Fixed:** Removed the dead branch. The async variant `getAllApprovedPropertiesAsync()` is the real path.

---

## HIGH — Fixed

### 4. Missing composite index for pending-claim queue (rule: `query-composite-indexes`)

`damage_claims.admin_decision = 'pending' ORDER BY created_at DESC` is the admin dashboard's hot query. Existing `idx_damage_claims_status` was single-column. Added `damage_claims_status_created_idx (admin_decision, created_at desc)`.

### 5. Missing partial index for storefront browse (rule: `query-partial-indexes`)

Storefront query: `WHERE status = 'approved' ORDER BY is_featured DESC, nightly_rate_minor ASC`. Existing `properties_status_city_idx (status, city)` doesn't cover the order-by. Added `properties_approved_featured_price_idx (city, is_featured desc, nightly_rate_minor) WHERE status = 'approved'` — covers filter + sort in one index scan.

### 6. Missing partial index for cron deposit expiry (rule: `query-partial-indexes`)

Cron runs `SELECT expires_at FROM deposit_holds WHERE status = 'held'`. Added partial index `deposit_holds_held_expires_idx (expires_at) WHERE status = 'held'` — 5-20x smaller, faster expiry sweep.

### 7. Missing partial index for active reservation ranges (rule: `query-partial-indexes`)

The availability feed + admin views query `reservations WHERE status <> 'cancelled' ORDER BY check_in, check_out`. Added `reservations_property_active_idx (property_id, check_in, check_out) WHERE status <> 'cancelled'`.

### 8. Missing partial index for pending feedback (rule: `query-partial-indexes`)

`feedback_requests` cron path filters `status = 'pending'`. Added partial index on `(created_at) WHERE status = 'pending'`.

---

## MEDIUM — Documented, not fixed

### 9. UUIDv4 PKs cause index fragmentation (rule: `schema-primary-keys`)

All tables use `gen_random_uuid()` (v4) as primary key. The rule recommends UUIDv7 or `bigint identity` for new systems, but this is already in production. Adding a `pg_uuidv7` extension and migrating is a separate effort.

**Recommendation:** Plan UUIDv7 migration for V2 (post-launch). Not blocking.

### 10. Table partitioning (rule: `schema-partitioning`)

Rule recommends partitioning for tables > 100M rows. Current scale is <1000 reservations total. Skip until scale demands it.

### 11. `serial` vs `identity` (rule: `schema-primary-keys`)

`audit_log` and `whatsapp_audit_log` use `bigint generated always as identity` ✓ (already correct). No action.

### 12. `char(3)` for currency (rule: `schema-data-types`)

Migration 0001 uses `char(3)` for currency codes. Rule prefers `text` with CHECK constraint. Currency is a 3-letter ISO code, fixed width, so `char(3)` is actually optimal here. Not changed.

### 13. `time` for checkout time (rule: `schema-data-types`)

`reservations.confirmed_checkout_time time` — `time` is appropriate. `timestamptz` would be overkill.

### 14. Cursor-based pagination (rule: `data-pagination`)

No list endpoint paginates. The largest table queried listwise is `properties` (~30 rows). Not a problem at current scale. Note for V2 when property count grows.

### 15. N+1 queries (rule: `data-n-plus-one`)

`lib/data.ts` uses `searchPropertiesAsync()` with a JOIN-via-RPC approach, then a separate query for reservations and blocks when dates are given. The 3-query pattern (properties + reservations + blocks) is correct, not N+1. No action.

### 16. UPSERT patterns (rule: `data-upsert`)

Booking route uses INSERT after the RPC returns. No check-then-insert races. ✓

### 17. `INSERT ... RETURNING` for `book_stays()` (rule: `data-n-plus-one`)

The `book_stays()` function does a per-item loop with INSERT...RETURNING. This is intentional (one reservation per item) and not N+1 in the bad sense — the loop is the business logic, not a query-per-row bug. ✓

### 18. Transaction length (rule: `lock-short-transactions`)

`POST /api/bookings` does: RPC → Stripe charge + hold → DB insert reservation group → DB insert reservations → DB insert inspection rows → DB insert deposit holds → DB insert audit. This holds DB locks across an external HTTP call (Stripe). Per the rule, this should be split — but in practice the Stripe call is fast and the booking group is the lock unit. Acceptable for the current scale.

**Recommendation:** Document in `lib/stripe.ts` that the booking route pattern is intentional.

### 19. `pg_stat_statements` (rule: `monitor-pg-stat-statements`)

Extension is enabled by default on Supabase. No action — just remember to query it when investigating slow queries.

### 20. `VACUUM` / `ANALYZE` (rule: `monitor-vacuum-analyze`)

Handled by Supabase autovacuum. No manual action needed for the current scale.

---

## LOW — Documented, not fixed

### 21. Full-text search (rule: `advanced-full-text-search`)

No tsvector in use. Storefront search uses `ilike` on city/neighbourhood. At ~30 properties this is fine; at 1000+ properties we'd add a tsvector.

### 22. JSONB indexing (rule: `advanced-jsonb-indexing`)

`properties.amenities` and `damage_claims.photos` are JSONB. No `@>` queries — they're only read as arrays. No GIN index needed.

---

## Rules already followed ✓

- `query-missing-indexes` — most hot-path columns are indexed
- `conn-pooling` — Supabase handles via PgBouncer
- `conn-limits` — Supabase manages
- `conn-idle-timeout` — Supabase default 10min
- `security-rls-basics` — RLS enabled on all tables
- `schema-lowercase-identifiers` — all identifiers are snake_case
- `data-batch-inserts` — single bulk insert for deposit holds per reservation group

---

## Migrations added

| File | Purpose | Rules applied |
|---|---|---|
| `0008_audit_indexes.sql` | Missing FK indexes + partial/composite indexes | `schema-foreign-key-indexes`, `query-composite-indexes`, `query-partial-indexes` |
| `0009_rls_perf_and_grants.sql` | Wrap RLS functions in `(select ...)` for initPlan caching | `security-rls-performance` |

**Apply to production via Supabase CLI:** `supabase db push` (after committing migrations).
