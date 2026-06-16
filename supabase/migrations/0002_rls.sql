-- Row Level Security — CheckinBliss

-- Helper: derive role from profiles

create or replace function auth_role() returns user_role
language sql stable
as $$
  select role from profiles where id = auth.uid();
$$;

-- Properties

alter table properties enable row level security;

create policy "Properties are publicly readable if approved"
  on properties for select
  using (status = 'approved' or auth_role() = 'admin' or auth_role() = 'operator' or owner_id = auth.uid());

create policy "Admins can update properties"
  on properties for update
  using (auth_role() = 'admin');

create policy "Admins can insert properties"
  on properties for insert
  with check (auth_role() = 'admin');

-- Reservations

alter table reservations enable row level security;

create policy "Guests can read own reservations"
  on reservations for select
  using (guest_email = current_setting('request.guest_email', true) or auth_role() in ('admin', 'operator'));

create policy "Admins and operators can read all reservations"
  on reservations for select
  using (auth_role() in ('admin', 'operator'));

create policy "Admins can update reservations"
  on reservations for update
  using (auth_role() = 'admin');

-- Booking groups

alter table booking_groups enable row level security;

create policy "Admins can read booking groups"
  on booking_groups for select
  using (auth_role() = 'admin');

-- Deposit holds

alter table deposit_holds enable row level security;

create policy "Deposit holds readable by admins"
  on deposit_holds for select
  using (auth_role() = 'admin');

-- Inspections

alter table inspections enable row level security;

create policy "Inspections readable by admins and operators"
  on inspections for select
  using (auth_role() in ('admin', 'operator'));

create policy "Operators can insert inspections"
  on inspections for insert
  with check (auth_role() in ('admin', 'operator'));

create policy "Operators can update own inspections"
  on inspections for update
  using (auth_role() = 'operator' and operator_id = auth.uid() or auth_role() = 'admin');

-- Damage claims

alter table damage_claims enable row level security;

create policy "Damage claims readable by admins"
  on damage_claims for select
  using (auth_role() = 'admin');

create policy "Admins can update damage claims"
  on damage_claims for update
  using (auth_role() = 'admin');

-- Availability blocks

alter table availability_blocks enable row level security;

create policy "Availability blocks are publicly readable"
  on availability_blocks for select
  using (true);

create policy "Admins can manage availability blocks"
  on availability_blocks for insert
  with check (auth_role() = 'admin');

create policy "Admins can delete availability blocks"
  on availability_blocks for delete
  using (auth_role() = 'admin');

-- Audit log

alter table audit_log enable row level security;

create policy "Audit log readable by admins"
  on audit_log for select
  using (auth_role() = 'admin');

-- WhatsApp audit log

alter table whatsapp_audit_log enable row level security;

create policy "WhatsApp audit log readable by admins"
  on whatsapp_audit_log for select
  using (auth_role() = 'admin');

-- Verification log

alter table verification_log enable row level security;

create policy "Verification log readable by admins and operators"
  on verification_log for select
  using (auth_role() in ('admin', 'operator'));

-- Profiles

alter table profiles enable row level security;

create policy "Profiles readable by admins and own user"
  on profiles for select
  using (auth_role() = 'admin' or id = auth.uid());

create policy "Users can update own profile"
  on profiles for update
  using (id = auth.uid());

-- Operator assignments

alter table operator_assignments enable row level security;

create policy "Operator assignments readable by admins"
  on operator_assignments for select
  using (auth_role() = 'admin');
