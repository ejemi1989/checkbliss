-- 0008_audit_indexes.sql
-- Supabase Postgres best-practices audit — adds missing indexes from
-- rules query-missing-indexes, schema-foreign-key-indexes, and
-- query-composite-indexes. Also adds partial indexes for hot query
-- patterns (rules query-partial-indexes).
--
-- See: context/supabase/SKILL.md (the reference skill)

-- 1) Foreign key columns that lacked indexes (rule: schema-foreign-key-indexes)
-- Critical for ON DELETE CASCADE performance + JOIN perf.

-- operator_assignments already PK-covers (operator_id, city)
-- profiles already PK-covers (id)

-- properties FK columns:
-- properties.owner_id → profiles.id
--   No index on owner_id, but covered by composite (city, neighbourhood, building_name) — partial.
--   Add a dedicated index for owner-side queries.
create index if not exists properties_owner_id_idx
  on properties (owner_id);

-- reservations FK columns:
-- reservations.guest_id → profiles.id
--   No index — guest-lookup queries would seq-scan.
create index if not exists reservations_guest_id_idx
  on reservations (guest_id);

-- inspections FK columns:
-- inspections.operator_id → profiles.id
--   No index — operator-side inspection queries would seq-scan.
create index if not exists inspections_operator_id_idx
  on inspections (operator_id);

-- damage_claims FK columns:
-- damage_claims.reporting_operator_id → profiles.id
--   No index.
create index if not exists damage_claims_reporting_operator_id_idx
  on damage_claims (reporting_operator_id);

-- damage_claims.admin_reviewer_id → profiles.id
--   No index.
create index if not exists damage_claims_admin_reviewer_id_idx
  on damage_claims (admin_reviewer_id);

-- property_photos FK columns:
-- property_photos.uploaded_by → profiles.id
--   No index.
create index if not exists property_photos_uploaded_by_idx
  on property_photos (uploaded_by);

-- url_redirects has unique on (old_path) — covered.

-- whatsapp_audit_log.profile_id → profiles.id
--   No index.
create index if not exists whatsapp_audit_log_profile_id_idx
  on whatsapp_audit_log (profile_id);

-- feedback_requests.reservation_id already has idx_feedback_requests_reservation — covered.

-- 2) Composite indexes for hot query patterns (rule: query-composite-indexes)

-- Admin/owner dashboards: list claims by status + newest first.
-- Existing idx_damage_claims_status is single-column. Composite (admin_decision, created_at)
-- supports pending-queue queries like:
--   "show me pending claims ordered by submission date"
create index if not exists damage_claims_status_created_idx
  on damage_claims (admin_decision, created_at desc);

-- Property availability feed: per-property overlapping reservations.
-- The existing idx_reservations_property (property_id) plus the GiST exclusion
-- already covers the overlap check via the GiST index. Good.

-- Search by city + status (used by storefront + admin):
-- Existing properties_status_city_idx (status, city) covers the storefront path.
-- Admin filter by status alone is covered by idx_properties_status.
-- Add covering index for the most common storefront query:
-- "approved properties in city X, featured first, then price".
-- The existing (status, city) index handles the filter; ORDER BY is_featured, nightly_rate_minor
-- would need a sort. Add partial index to cover both.
create index if not exists properties_approved_featured_price_idx
  on properties (city, is_featured desc, nightly_rate_minor)
  where status = 'approved';

-- 3) Partial indexes for hot filters (rule: query-partial-indexes)

-- Reservations: most queries filter out cancelled. The GiST exclusion already
-- has WHERE (status <> 'cancelled') baked in. Add a partial btree for date-range
-- listing of active reservations per property:
create index if not exists reservations_property_active_idx
  on reservations (property_id, check_in, check_out)
  where status <> 'cancelled';

-- Deposit holds: most queries filter on status = 'held' (e.g. cron "expire 7-day holds").
-- Add partial index for the cron path:
create index if not exists deposit_holds_held_expires_idx
  on deposit_holds (expires_at)
  where status = 'held';

-- Feedback: most queries filter on status = 'pending'.
create index if not exists feedback_requests_pending_idx
  on feedback_requests (created_at)
  where status = 'pending';
