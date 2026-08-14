-- 0016_reconciliation.sql
-- Orphaned-payment reconciliation support + real-mode drift fixes that the
-- Stripe webhook path already depends on.
--
--  1. reservations.payment_intent_id — the webhook and reconciliation both
--     write the charge PaymentIntent id onto each confirmed reservation.
--  2. inspection_schedule — checkout inspections are scheduled the moment a
--     booking is confirmed (webhook upserts into this table).
--  3. reconciliation_log — audit trail for every intent evaluated by the
--     reconcile cron (disposition: 'ok' | 'recovered' | 'refunded').

alter table reservations
  add column if not exists payment_intent_id text;

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

comment on table inspection_schedule is
  'Checkout inspections, scheduled on booking confirmation and worked by operators.';
comment on table reconciliation_log is
  'Audit trail for the reconcile cron: every PaymentIntent evaluated and its disposition.';
