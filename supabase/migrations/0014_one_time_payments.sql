-- 0014_one_time_payments.sql
-- One-time payments via hosted Stripe Checkout.
-- - one_time_payments: records each Checkout Session and its reconciliation status
--   (reconciled by the checkout.session.completed webhook).
-- - stripe_resources: persists created Stripe resource ids (product_id, price_id)
--   so the one-time payment product is created once and reused across requests.

create table if not exists one_time_payments (
  id uuid primary key default gen_random_uuid(),
  checkout_session_id text not null unique,
  amount_minor int not null,
  currency char(3) not null,
  status text not null default 'pending',  -- 'pending' | 'completed' | 'expired'
  customer_email text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_one_time_payments_status on one_time_payments(status, created_at desc);
create index if not exists idx_one_time_payments_completed_at on one_time_payments(completed_at);

create table if not exists stripe_resources (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now()
);

-- RLS: admin can read; writes go through the service-role admin client only.
alter table one_time_payments enable row level security;
alter table stripe_resources enable row level security;

create policy "admin_read_one_time_payments" on one_time_payments
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
create policy "admin_read_stripe_resources" on stripe_resources
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
