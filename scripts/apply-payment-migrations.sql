-- ============================================================================
-- CheckinBliss — Payment + admin-feature migrations for the live Supabase project
-- Project: ejwurxnkcxpenmhbqwdi | Generated: 2026-09-10
--
-- Consolidated, idempotent merge of the migration files NOT yet applied to the
-- live DB (the Stripe webhook + notifications + payout surfaces depend on them):
--   * 0015_payment_architecture.sql      (booking_groups split / owner_payouts /
--                                          owner_payout_details / payout_alerts)
--   * 0016_rename_raenest_to_fincra.sql  (fincra_* column names folded in below)
--   * 0016_reconciliation.sql            (reservations.payment_intent_id /
--                                          inspection_schedule / reconciliation_log)
--   * 0017_owner_payout_details_bank_code.sql (owner_payout_details.bank_code)
--   * 0019_admin_features.sql            (notifications / platform_settings /
--                                          profiles.is_suspended)
--   * 0015_booking_rules.sql             (book_stays doc comment)
--
-- Safe to paste into the Supabase SQL editor and Run. Idempotent: re-runs no-op
-- or succeed (policies are dropped before re-create).
-- ============================================================================

-- ------------------------------------------------------------------ --
--  0. auth_role() — RLS helper (from 0002_rls.sql)                  --
-- ------------------------------------------------------------------ --

create or replace function auth_role() returns user_role
language sql stable
as $$
  select role from profiles where id = auth.uid();
$$;

-- ------------------------------------------------------------------ --
--  1. booking_groups — commission split + payout state machine       --
-- ------------------------------------------------------------------ --

alter table booking_groups
  add column if not exists commission_minor int not null default 0;

alter table booking_groups
  add column if not exists owner_share_minor int not null default 0;

alter table booking_groups
  add column if not exists refunded_minor int not null default 0;

alter table booking_groups
  add column if not exists stripe_charge_id text;

alter table booking_groups
  add column if not exists platform_payout_status text not null default 'pending';

alter table booking_groups
  add column if not exists owner_payout_status text not null default 'pending';

alter table booking_groups
  add column if not exists owner_payout_eligible_at timestamptz;

alter table booking_groups
  add column if not exists owner_payout_requested_at timestamptz;

alter table booking_groups
  add column if not exists owner_payout_reference text;

alter table booking_groups
  add column if not exists owner_payout_ngn_minor int;

alter table booking_groups
  add column if not exists owner_payout_fx_rate numeric;

alter table booking_groups
  add column if not exists owner_payout_date timestamptz;

comment on column booking_groups.commission_minor is '12% platform commission in GBP pence';
comment on column booking_groups.owner_share_minor is '88% owner share in GBP pence (aggregate across all stays)';
comment on column booking_groups.refunded_minor is 'Amount refunded to guest in GBP pence';
comment on column booking_groups.stripe_charge_id is 'Stripe Charge id (ch_…) from payment_intent.succeeded webhook';
comment on column booking_groups.platform_payout_status is 'Status of commission settlement: pending | settled | failed';
comment on column booking_groups.owner_payout_status is 'Owner payout state machine: pending | eligible | released | paid | failed | refunded';
comment on column booking_groups.owner_payout_eligible_at is 'Timestamp when all payout conditions were met';
comment on column booking_groups.owner_payout_requested_at is 'Timestamp when platform instructed Fincra to disburse';
comment on column booking_groups.owner_payout_reference is 'Fincra transaction reference for the owner payout';
comment on column booking_groups.owner_payout_ngn_minor is 'NGN amount paid (kobo — minor units) — informational only';
comment on column booking_groups.owner_payout_fx_rate is 'GBP→NGN rate applied at conversion (e.g. 2450)';

-- ------------------------------------------------------------------ --
--  2. reservations — per-stay split + charge intent id              --
-- ------------------------------------------------------------------ --

alter table reservations
  add column if not exists commission_minor int not null default 0;

alter table reservations
  add column if not exists owner_share_minor int not null default 0;

alter table reservations
  add column if not exists payment_intent_id text;

comment on column reservations.commission_minor is '12% platform commission for this stay (GBP pence)';
comment on column reservations.owner_share_minor is '88% owner share for this stay (GBP pence)';
comment on column reservations.payment_intent_id is 'Stripe PaymentIntent id charged for this reservation';

-- ------------------------------------------------------------------ --
--  3. owner_payouts — payout ledger (fincra column names)            --
-- ------------------------------------------------------------------ --

create table if not exists owner_payouts (
  id uuid primary key default gen_random_uuid(),
  booking_group_id uuid not null references booking_groups(id),
  reservation_id uuid references reservations(id),
  property_id uuid references properties(id),
  owner_id uuid references profiles(id),
  owner_share_minor int not null default 0,
  status text not null default 'pending',
    -- 'pending' | 'eligible' | 'released' | 'paid' | 'failed' | 'refunded' | 'cancelled'
  payout_ngn_minor int,
  fx_rate numeric,
  fincra_reference text,
  fincra_idempotency_key text unique,
  requested_at timestamptz,
  released_at timestamptz,
  paid_at timestamptz,
  attempts int not null default 0,
  last_error text,
  next_attempt_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_owner_payouts_group on owner_payouts(booking_group_id);
create index if not exists idx_owner_payouts_owner on owner_payouts(owner_id);
create index if not exists idx_owner_payouts_status on owner_payouts(status);
create index if not exists idx_owner_payouts_next_attempt on owner_payouts(next_attempt_at)
  where status = 'released' and next_attempt_at is not null;

comment on table owner_payouts is 'Immutable payout ledger — one row per owner per booking group. Retry-safe with idempotency keys.';
comment on column owner_payouts.status is 'pending → eligible → released → paid | failed | cancelled. refunded when guest fully refunded post-payment.';
comment on column owner_payouts.fincra_reference is 'Fincra transaction reference for the owner payout';
comment on column owner_payouts.fincra_idempotency_key is 'Idempotency key for Fincra payout creation (fincra-{groupId}-{payoutId})';

-- ------------------------------------------------------------------ --
--  4. owner_payout_details — owner bank / Fincra beneficiary info    --
-- ------------------------------------------------------------------ --

create table if not exists owner_payout_details (
  owner_id uuid primary key references profiles(id) on delete cascade,
  fincra_beneficiary_id text,
  nigerian_bank_name text,
  nigerian_bank_code text,
  nigerian_bank_account_number text,
  nigerian_bank_account_name text,
  tax_identification_number text,
  updated_at timestamptz not null default now()
);

comment on table owner_payout_details is 'Owner bank details for NGN disbursement via Fincra.';
comment on column owner_payout_details.fincra_beneficiary_id is 'Fincra beneficiary id registered for this owner';
comment on column owner_payout_details.nigerian_bank_code is 'Fincra-side bank routing code (e.g. 058 GTBank, 044 Access, 057 Zenith)';

-- ------------------------------------------------------------------ --
--  5. payout_alerts — admin alert queue                              --
-- ------------------------------------------------------------------ --

create table if not exists payout_alerts (
  id uuid primary key default gen_random_uuid(),
  severity text not null default 'medium',
    -- 'low' | 'medium' | 'high' | 'critical'
  kind text not null,
    -- 'split_failed' | 'fincra_unavailable' | 'fincra_failed' | 'bank_rejected'
    -- | 'fx_out_of_range' | 'duplicate_payout' | 'payout_failed'
  booking_group_id uuid references booking_groups(id),
  owner_payout_id uuid references owner_payouts(id),
  message text not null,
  resolved boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_payout_alerts_severity on payout_alerts(severity, resolved, created_at desc);

comment on table payout_alerts is 'Operational alerts for Stripe split failures, Fincra failures, bank rejections, FX anomalies.';
comment on column payout_alerts.kind is 'split_failed | fincra_unavailable | fincra_failed | bank_rejected | fx_out_of_range | duplicate_payout | payout_failed';

-- ------------------------------------------------------------------ --
--  6. inspection_schedule + reconciliation_log                       --
-- ------------------------------------------------------------------ --

create table if not exists inspection_schedule (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  checkout_at timestamptz not null,
  status text not null default 'scheduled',
  operator_id uuid references profiles(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reservation_id)
);

create index if not exists idx_inspection_schedule_checkout
  on inspection_schedule(checkout_at, status);

create table if not exists reconciliation_log (
  id uuid primary key default gen_random_uuid(),
  run_id text not null,
  intent_id text not null,
  group_id uuid,
  disposition text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists idx_reconciliation_log_intent
  on reconciliation_log(intent_id);

comment on table inspection_schedule is 'Checkout inspections, scheduled on booking confirmation and worked by operators.';
comment on table reconciliation_log is 'Audit trail for the reconcile cron: every PaymentIntent evaluated and its disposition.';

-- ------------------------------------------------------------------ --
--  7. notifications                                                  --
-- ------------------------------------------------------------------ --

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  role user_role not null,
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_role_idx on notifications(role);
create index if not exists notifications_user_idx on notifications(user_id) where user_id is not null;
create index if not exists notifications_read_idx on notifications(read);

alter table notifications enable row level security;

drop policy if exists "notifications_admin_read" on notifications;
create policy "notifications_admin_read"
  on notifications for select
  to authenticated
  using ((select auth_role()) = 'admin');

drop policy if exists "notifications_self_read" on notifications;
create policy "notifications_self_read"
  on notifications for select
  to authenticated
  using (
    role = (select auth_role())
    and (user_id is null or user_id = auth.uid())
  );

drop policy if exists "notifications_admin_write" on notifications;
create policy "notifications_admin_write"
  on notifications for all
  to authenticated
  using ((select auth_role()) = 'admin')
  with check ((select auth_role()) = 'admin');

comment on table notifications is
  'In-app notification centre. Targeted per role (role-scoped) or per user
   (user_id). Writes are service-role only (createAdmin).';

-- ------------------------------------------------------------------ --
--  8. platform_settings                                              --
-- ------------------------------------------------------------------ --

create table if not exists platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table platform_settings enable row level security;

drop policy if exists "platform_settings_admin_read" on platform_settings;
create policy "platform_settings_admin_read"
  on platform_settings for select
  to authenticated
  using ((select auth_role()) = 'admin');

drop policy if exists "platform_settings_admin_write" on platform_settings;
create policy "platform_settings_admin_write"
  on platform_settings for all
  to authenticated
  using ((select auth_role()) = 'admin')
  with check ((select auth_role()) = 'admin');

comment on table platform_settings is
  'Key/value platform configuration surfaced in /admin/settings. Written only
   via Server Actions with service-role createAdmin.';

-- ------------------------------------------------------------------ --
--  9. profiles.is_suspended                                          --
-- ------------------------------------------------------------------ --

alter table profiles
  add column if not exists is_suspended boolean not null default false;

create index if not exists profiles_suspended_idx on profiles(is_suspended) where is_suspended;

comment on column profiles.is_suspended is
  'Admin suspend/unsuspend toggle surfaced in /admin/users. Suspended users are
   blocked from interactive role-gated dashboards.';

-- ------------------------------------------------------------------ --
--  10. owner_payouts / details / payout_alerts RLS (admin+owner reads) --
-- ------------------------------------------------------------------ --

alter table owner_payouts enable row level security;
alter table owner_payout_details enable row level security;
alter table payout_alerts enable row level security;

drop policy if exists "admin_read_owner_payouts" on owner_payouts;
create policy "admin_read_owner_payouts" on owner_payouts
  for select using ((select role from profiles where id = auth.uid()) = 'admin');

drop policy if exists "owner_read_own_payouts" on owner_payouts;
create policy "owner_read_own_payouts" on owner_payouts
  for select using (owner_id = auth.uid());

drop policy if exists "admin_read_owner_payout_details" on owner_payout_details;
create policy "admin_read_owner_payout_details" on owner_payout_details
  for select using ((select role from profiles where id = auth.uid()) = 'admin');

drop policy if exists "owner_read_own_details" on owner_payout_details;
create policy "owner_read_own_details" on owner_payout_details
  for select using (owner_id = auth.uid());

drop policy if exists "admin_read_payout_alerts" on payout_alerts;
create policy "admin_read_payout_alerts" on payout_alerts
  for select using ((select role from profiles where id = auth.uid()) = 'admin');

-- ------------------------------------------------------------------ --
--  11. book_stays doc comment (0015_booking_rules)                   --
-- ------------------------------------------------------------------ --

comment on function public.book_stays is
  'Atomic stay-booking RPC. Enforces the 14-day advance rule (ADVANCE_14_DAYS):
   check-in must be at least 14 full calendar days from today (Africa/Lagos);
   overlaps raise DATES_UNAVAILABLE and roll back. The GiST EXCLUDE constraint
   on reservations is the double-booking guard — application availability
   checks are UX, never the guard.';

-- ============================================================================
--  Post-check — each should print "ready":
--    select 'ready' where exists (select 1 from information_schema.columns
--      where table_name = 'booking_groups' and column_name = 'stripe_charge_id');
--    select 'ready' where exists (select 1 from information_schema.tables
--      where table_name = 'owner_payouts');
--    select 'ready' where exists (select 1 from information_schema.tables
--      where table_name = 'inspection_schedule');
--    select 'ready' where exists (select 1 from information_schema.tables
--      where table_name = 'notifications');
--    select 'ready' where exists (select 1 from information_schema.tables
--      where table_name = 'platform_settings');
--    select 'ready' where exists (select 1 from information_schema.columns
--      where table_name = 'profiles' and column_name = 'is_suspended');
-- ============================================================================