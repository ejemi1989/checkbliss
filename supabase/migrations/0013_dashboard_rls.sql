-- 0013_dashboard_rls.sql
-- Dashboard system: city-scoped RLS, claim events, enhanced audit, payouts.
-- Phase 1: Foundation for role-scoped dashboards.

-- ============================================================
-- 1. has_city_access() — Postgres function for operator city scoping
-- ============================================================

create or replace function has_city_access(city_name text)
returns boolean
language sql stable
as $$
  select
    case
      when (select role from profiles where id = auth.uid()) = 'admin' then true
      when (select role from profiles where id = auth.uid()) = 'operator'
        then exists (
          select 1 from operator_assignments
          where operator_id = auth.uid() and city = city_name
        )
      else false
    end;
$$;

-- ============================================================
-- 2. damage_claim_events — append-only audit trail for claim transitions
-- ============================================================

create table damage_claim_events (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references damage_claims(id) on delete cascade,
  from_status text not null,
  to_status text not null,
  actor_id uuid references profiles(id),
  actor_role text not null,
  note text,
  created_at timestamptz not null default now()
);

create index idx_dce_claim on damage_claim_events(claim_id, created_at);
create index idx_dce_to_status on damage_claim_events(to_status);

alter table damage_claim_events enable row level security;

-- Admins can read all claim events
create policy "Admins can read claim events"
  on damage_claim_events for select
  using (auth_role() = 'admin');

-- Operators can read claim events for properties in their city
create policy "Operators can read city claim events"
  on damage_claim_events for select
  using (
    auth_role() = 'operator'
    and exists (
      select 1 from damage_claims dc
      join properties p on p.id = dc.property_id
      where dc.id = damage_claim_events.claim_id
      and has_city_access(p.city)
    )
  );

-- ============================================================
-- 3. Enhanced audit_log — add actor/role/entity/before-after columns
-- ============================================================

-- Add new columns to existing audit_log table
alter table audit_log
  add column if not exists actor_id uuid references profiles(id),
  add column if not exists actor_role text,
  add column if not exists entity_type text,
  add column if not exists entity_id text,
  add column if not exists before_state jsonb,
  add column if not exists after_state jsonb;

-- Index for filtering by actor
create index if not exists idx_audit_log_actor on audit_log(actor_id);
create index if not exists idx_audit_log_entity on audit_log(entity_type, entity_id);

-- ============================================================
-- 4. payouts — financial reconciliation
-- ============================================================

create table payouts (
  id uuid primary key default gen_random_uuid(),
  recipient_type text not null check (recipient_type in ('owner', 'operator')),
  recipient_id uuid not null references profiles(id),
  amount_minor int not null check (amount_minor > 0),
  currency char(3) not null default 'GBP',
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'held', 'cancelled')),
  period text,
  notes text,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_payouts_recipient on payouts(recipient_id, recipient_type);
create index idx_payouts_status on payouts(status);

alter table payouts enable row level security;

-- Admins can read all payouts
create policy "Admins can read payouts"
  on payouts for select
  using (auth_role() = 'admin');

-- Owners can read own payouts
create policy "Owners can read own payouts"
  on payouts for select
  using (
    auth_role() = 'owner'
    and recipient_type = 'owner'
    and recipient_id = auth.uid()
  );

-- Operators can read own payouts
create policy "Operators can read own payouts"
  on payouts for select
  using (
    auth_role() = 'operator'
    and recipient_type = 'operator'
    and recipient_id = auth.uid()
  );

-- ============================================================
-- 5. City-scoped RLS policies — operators see only their city's data
-- ============================================================

-- Properties: operators see only properties in their assigned cities
-- Drop the broad operator read policy and replace with city-scoped version
drop policy if exists "Properties are publicly readable if approved" on properties;

create policy "Properties are publicly readable if approved"
  on properties for select
  using (
    status = 'approved'
    or auth_role() = 'admin'
    or (
      auth_role() = 'operator'
      and has_city_access(city)
    )
    or owner_id = auth.uid()
  );

-- Reservations: operators see only reservations for properties in their city
drop policy if exists "Guests can read own reservations" on reservations;
drop policy if exists "Admins and operators can read all reservations" on reservations;

create policy "Guests can read own reservations"
  on reservations for select
  using (
    guest_email = current_setting('request.guest_email', true)
    or auth_role() in ('admin')
    or (
      auth_role() = 'operator'
      and exists (
        select 1 from properties p
        where p.id = reservations.property_id
        and has_city_access(p.city)
      )
    )
  );

create policy "Admins can read all reservations"
  on reservations for select
  using (auth_role() = 'admin');

-- Inspections: operators see only inspections for properties in their city
drop policy if exists "Inspections readable by admins and operators" on inspections;

create policy "Inspections readable by admins and city operators"
  on inspections for select
  using (
    auth_role() = 'admin'
    or (
      auth_role() = 'operator'
      and exists (
        select 1 from reservations r
        join properties p on p.id = r.property_id
        where r.id = inspections.reservation_id
        and has_city_access(p.city)
      )
    )
  );

-- Damage claims: operators see claims for properties in their city
drop policy if exists "Damage claims readable by admins" on damage_claims;

create policy "Damage claims readable by admins"
  on damage_claims for select
  using (auth_role() = 'admin');

create policy "Operators can read city damage claims"
  on damage_claims for select
  using (
    auth_role() = 'operator'
    and exists (
      select 1 from properties p
      where p.id = damage_claims.property_id
      and has_city_access(p.city)
    )
  );

-- Verification log: operators see only their city's verifications
drop policy if exists "Verification log readable by admins and operators" on verification_log;

create policy "Verification log readable by admins and city operators"
  on verification_log for select
  using (
    auth_role() = 'admin'
    or (
      auth_role() = 'operator'
      and exists (
        select 1 from properties p
        where p.id = verification_log.property_id
        and has_city_access(p.city)
      )
    )
  );

-- ============================================================
-- 6. Operator insert policies — allow operators to create claims
-- ============================================================

create policy "Operators can insert damage claims"
  on damage_claims for insert
  with check (
    auth_role() = 'operator'
    and exists (
      select 1 from properties p
      where p.id = damage_claims.property_id
      and has_city_access(p.city)
    )
  );

-- Operators can insert claim events for claims in their city
create policy "Operators can insert city claim events"
  on damage_claim_events for insert
  with check (
    auth_role() = 'operator'
    and exists (
      select 1 from damage_claims dc
      join properties p on p.id = dc.property_id
      where dc.id = damage_claim_events.claim_id
      and has_city_access(p.city)
    )
  );

-- Admins can insert claim events
create policy "Admins can insert claim events"
  on damage_claim_events for insert
  with check (auth_role() = 'admin');

-- ============================================================
-- 7. Booking groups: operators read for their city
-- ============================================================

drop policy if exists "Admins can read booking groups" on booking_groups;

create policy "Admins can read booking groups"
  on booking_groups for select
  using (auth_role() = 'admin');

create policy "Operators can read city booking groups"
  on booking_groups for select
  using (
    auth_role() = 'operator'
    and exists (
      select 1 from reservations r
      join properties p on p.id = r.property_id
      where r.booking_group_id = booking_groups.id
      and has_city_access(p.city)
    )
  );

-- ============================================================
-- 8. Deposit holds: operators read for their city
-- ============================================================

drop policy if exists "Deposit holds readable by admins" on deposit_holds;

create policy "Deposit holds readable by admins"
  on deposit_holds for select
  using (auth_role() = 'admin');

create policy "Operators can read city deposit holds"
  on deposit_holds for select
  using (
    auth_role() = 'operator'
    and exists (
      select 1 from reservations r
      join properties p on p.id = r.property_id
      where r.id = deposit_holds.reservation_id
      and has_city_access(p.city)
    )
  );

-- ============================================================
-- 9. Operator assignment RLS — allow operators to read their own
-- ============================================================

create policy "Operators can read own assignments"
  on operator_assignments for select
  using (
    auth_role() = 'operator'
    and operator_id = auth.uid()
  );
