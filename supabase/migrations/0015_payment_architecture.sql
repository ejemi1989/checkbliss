-- 0015_payment_architecture.sql
-- Two-entity payment architecture: Stripe Connect split (12% platform / 88% owner
-- share), Raenest NGN disbursement, payout timing rules, refund handling, FX tracking.
--
-- Booking group additions:     commission / owner-share split, refund tracking,
--                              Stripe charge id, payout state machine columns.
-- Reservation additions:       per-stay commission + owner-share split.
-- New table — owner_payouts:   Immutable payout ledger grouped by owner + booking group.
-- New table — owner_payout_details: Owner bank / Raenest beneficiary details.
-- New table — payout_alerts:   Admin alerts for failed payouts, FX anomalies, etc.

/* ------------------------------------------------------------------ */
/*  1. booking_groups — commission split + payout state               */
/* ------------------------------------------------------------------ */

alter table booking_groups
  add column commission_minor int not null default 0;

alter table booking_groups
  add column owner_share_minor int not null default 0;

alter table booking_groups
  add column refunded_minor int not null default 0;

alter table booking_groups
  add column stripe_charge_id text;

alter table booking_groups
  add column platform_payout_status text not null default 'pending';
  -- 'pending' | 'settled' | 'failed'

alter table booking_groups
  add column owner_payout_status text not null default 'pending';
  -- 'pending' | 'eligible' | 'released' | 'paid' | 'failed' | 'refunded'

alter table booking_groups
  add column owner_payout_eligible_at timestamptz;

alter table booking_groups
  add column owner_payout_requested_at timestamptz;

alter table booking_groups
  add column owner_payout_reference text;

alter table booking_groups
  add column owner_payout_ngn_minor int;

alter table booking_groups
  add column owner_payout_fx_rate numeric;

alter table booking_groups
  add column owner_payout_date timestamptz;

comment on column booking_groups.commission_minor
  is '12% platform commission in GBP pence';
comment on column booking_groups.owner_share_minor
  is '88% owner share in GBP pence (aggregate across all stays)';
comment on column booking_groups.refunded_minor
  is 'Amount refunded to guest in GBP pence';
comment on column booking_groups.stripe_charge_id
  is 'Stripe Charge id (ch_…) from payment_intent.succeeded webhook';
comment on column booking_groups.platform_payout_status
  is 'Status of commission settlement: pending | settled | failed';
comment on column booking_groups.owner_payout_status
  is 'Owner payout state machine: pending | eligible | released | paid | failed | refunded';
comment on column booking_groups.owner_payout_eligible_at
  is 'Timestamp when all payout conditions were met';
comment on column booking_groups.owner_payout_requested_at
  is 'Timestamp when platform instructed Raenest to disburse';
comment on column booking_groups.owner_payout_reference
  is 'Raenest transaction reference for the owner payout';
comment on column booking_groups.owner_payout_ngn_minor
  is 'NGN amount paid (kobo — minor units) — informational only';
comment on column booking_groups.owner_payout_fx_rate
  is 'GBP→NGN rate applied at conversion (e.g. 2450)';

/* ------------------------------------------------------------------ */
/*  2. reservations — per-stay commission split                       */
/* ------------------------------------------------------------------ */

alter table reservations
  add column commission_minor int not null default 0;

alter table reservations
  add column owner_share_minor int not null default 0;

comment on column reservations.commission_minor
  is '12% platform commission for this stay (GBP pence)';
comment on column reservations.owner_share_minor
  is '88% owner share for this stay (GBP pence)';

/* ------------------------------------------------------------------ */
/*  3. owner_payouts — payout ledger                                  */
/* ------------------------------------------------------------------ */

create table owner_payouts (
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
  raenest_reference text,
  raenest_idempotency_key text unique,
  requested_at timestamptz,
  released_at timestamptz,
  paid_at timestamptz,
  attempts int not null default 0,
  last_error text,
  next_attempt_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_owner_payouts_group on owner_payouts(booking_group_id);
create index idx_owner_payouts_owner on owner_payouts(owner_id);
create index idx_owner_payouts_status on owner_payouts(status);
create index idx_owner_payouts_next_attempt on owner_payouts(next_attempt_at)
  where status = 'released' and next_attempt_at is not null;

comment on table owner_payouts is 'Immutable payout ledger — one row per owner per booking group. Retry-safe with idempotency keys.';
comment on column owner_payouts.status is 'pending → eligible → released → paid | failed | cancelled. refunded when guest fully refunded post-payment.';

/* ------------------------------------------------------------------ */
/*  4. owner_payout_details — owner bank / Raenest beneficiary info   */
/* ------------------------------------------------------------------ */

create table owner_payout_details (
  owner_id uuid primary key references profiles(id) on delete cascade,
  raenest_beneficiary_id text,
  nigerian_bank_name text,
  nigerian_bank_account_number text,
  nigerian_bank_account_name text,
  tax_identification_number text,
  updated_at timestamptz not null default now()
);

comment on table owner_payout_details is 'Owner bank details for NGN disbursement via Raenest (or equivalent partner).';

/* ------------------------------------------------------------------ */
/*  5. payout_alerts — admin alert queue                              */
/* ------------------------------------------------------------------ */

create table payout_alerts (
  id uuid primary key default gen_random_uuid(),
  severity text not null default 'medium',
    -- 'low' | 'medium' | 'high' | 'critical'
  kind text not null,
    -- 'split_failed' | 'raenest_unavailable' | 'bank_rejected'
    -- | 'fx_out_of_range' | 'duplicate_payout' | 'payout_failed'
  booking_group_id uuid references booking_groups(id),
  owner_payout_id uuid references owner_payouts(id),
  message text not null,
  resolved boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_payout_alerts_severity on payout_alerts(severity, resolved, created_at desc);

comment on table payout_alerts is 'Operational alerts for Stripe split failures, Raenest failures, bank rejections, FX anomalies.';

/* ------------------------------------------------------------------ */
/*  6. RLS — admin read-only (writes go through service-role admin)   */
/* ------------------------------------------------------------------ */

alter table owner_payouts enable row level security;
alter table owner_payout_details enable row level security;
alter table payout_alerts enable row level security;

create policy "admin_read_owner_payouts" on owner_payouts
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );

create policy "owner_read_own_payouts" on owner_payouts
  for select using (
    owner_id = auth.uid()
  );

create policy "admin_read_owner_payout_details" on owner_payout_details
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );

create policy "owner_read_own_details" on owner_payout_details
  for select using (
    owner_id = auth.uid()
  );

create policy "admin_read_payout_alerts" on payout_alerts
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
