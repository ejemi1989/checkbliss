-- 0009_rls_perf_and_grants.sql
-- Supabase Postgres best-practices audit — fixes from
-- rules security-rls-performance and security-privileges.
--
-- See: context/supabase/SKILL.md

-- ============================================================================
-- security-rls-performance: wrap stable functions in (select ...)
-- to make the planner treat them as initPlan (run once per query) instead
-- of per-row.
-- ============================================================================

-- Properties
drop policy if exists "Properties are publicly readable if approved" on properties;
create policy "Properties are publicly readable if approved"
  on properties for select
  using (
    status = 'approved'
    or (select auth_role()) = 'admin'
    or (select auth_role()) = 'operator'
    or owner_id = auth.uid()
  );

drop policy if exists "Admins can update properties" on properties;
create policy "Admins can update properties"
  on properties for update
  using ((select auth_role()) = 'admin');

drop policy if exists "Admins can insert properties" on properties;
create policy "Admins can insert properties"
  on properties for insert
  with check ((select auth_role()) = 'admin');

-- Reservations
drop policy if exists "Guests can read own reservations" on reservations;
create policy "Guests can read own reservations"
  on reservations for select
  using (
    guest_email = current_setting('request.guest_email', true)
    or (select auth_role()) in ('admin', 'operator')
  );

drop policy if exists "Admins and operators can read all reservations" on reservations;
create policy "Admins and operators can read all reservations"
  on reservations for select
  using ((select auth_role()) in ('admin', 'operator'));

drop policy if exists "Admins can update reservations" on reservations;
create policy "Admins can update reservations"
  on reservations for update
  using ((select auth_role()) = 'admin');

-- Booking groups
drop policy if exists "Admins can read booking groups" on booking_groups;
create policy "Admins can read booking groups"
  on booking_groups for select
  using ((select auth_role()) = 'admin');

-- Deposit holds
drop policy if exists "Deposit holds readable by admins" on deposit_holds;
create policy "Deposit holds readable by admins"
  on deposit_holds for select
  using ((select auth_role()) = 'admin');

-- Inspections
drop policy if exists "Inspections readable by admins and operators" on inspections;
create policy "Inspections readable by admins and operators"
  on inspections for select
  using ((select auth_role()) in ('admin', 'operator'));

drop policy if exists "Operators can insert inspections" on inspections;
create policy "Operators can insert inspections"
  on inspections for insert
  with check ((select auth_role()) in ('admin', 'operator'));

drop policy if exists "Operators can update own inspections" on inspections;
create policy "Operators can update own inspections"
  on inspections for update
  using (
    ((select auth_role()) = 'operator' and operator_id = auth.uid())
    or (select auth_role()) = 'admin'
  );

-- Damage claims
drop policy if exists "Damage claims readable by admins" on damage_claims;
create policy "Damage claims readable by admins"
  on damage_claims for select
  using ((select auth_role()) = 'admin');

drop policy if exists "Admins can update damage claims" on damage_claims;
create policy "Admins can update damage claims"
  on damage_claims for update
  using ((select auth_role()) = 'admin');

-- Availability blocks
drop policy if exists "Admins can manage availability blocks" on availability_blocks;
create policy "Admins can manage availability blocks"
  on availability_blocks for insert
  with check ((select auth_role()) = 'admin');

drop policy if exists "Admins can delete availability blocks" on availability_blocks;
create policy "Admins can delete availability blocks"
  on availability_blocks for delete
  using ((select auth_role()) = 'admin');

-- Audit log
drop policy if exists "Audit log readable by admins" on audit_log;
create policy "Audit log readable by admins"
  on audit_log for select
  using ((select auth_role()) = 'admin');

-- WhatsApp audit log
drop policy if exists "WhatsApp audit log readable by admins" on whatsapp_audit_log;
create policy "WhatsApp audit log readable by admins"
  on whatsapp_audit_log for select
  using ((select auth_role()) = 'admin');

-- Verification log
drop policy if exists "Verification log readable by admins and operators" on verification_log;
create policy "Verification log readable by admins and operators"
  on verification_log for select
  using ((select auth_role()) in ('admin', 'operator'));

-- Profiles
drop policy if exists "Profiles readable by admins and own user" on profiles;
create policy "Profiles readable by admins and own user"
  on profiles for select
  using ((select auth_role()) = 'admin' or id = auth.uid());

-- Operator assignments
drop policy if exists "Operator assignments readable by admins" on operator_assignments;
create policy "Operator assignments readable by admins"
  on operator_assignments for select
  using ((select auth_role()) = 'admin');
