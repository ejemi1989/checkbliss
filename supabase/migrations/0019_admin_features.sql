-- 0019_admin_features.sql
-- Admin-surface gap closure — tables the interactive admin dashboard depends on
-- but the schema does not yet provide:
--
--   1. notifications — role/user-scoped in-app notification centre (currently
--      in-memory only; data vanished on restart).
--   2. platform_settings — persisted admin platform configuration (currency,
--      deposit-hold length, max nights, whatsapp flags, maintenance mode).
--   3. profiles.is_suspended — lets admins suspend individual users.
--
-- Cards/reviews stay Trustpilot-only per product rules; this migration adds no
-- review tables.

-- ------------------------------------------------------------------ --
--  1. notifications                                                 --
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

-- Admins see every notification.
create policy "notifications_admin_read"
  on notifications for select
  to authenticated
  using ((select auth_role()) = 'admin');

-- Users see role-scoped notifications and their own user-scoped ones.
create policy "notifications_self_read"
  on notifications for select
  to authenticated
  using (
    role = (select auth_role())
    and (user_id is null or user_id = auth.uid())
  );

-- All writes go through the service-role key (createAdmin); anon/authenticated
-- never insert directly.
create policy "notifications_admin_write"
  on notifications for all
  to authenticated
  using ((select auth_role()) = 'admin')
  with check ((select auth_role()) = 'admin');

comment on table notifications is
  'In-app notification centre. Targeted per role (role-scoped) or per user
   (user_id). Writes are service-role only (createAdmin).';

-- ------------------------------------------------------------------ --
--  2. platform_settings                                              --
-- ------------------------------------------------------------------ --

create table if not exists platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table platform_settings enable row level security;

create policy "platform_settings_admin_read"
  on platform_settings for select
  to authenticated
  using ((select auth_role()) = 'admin');

create policy "platform_settings_admin_write"
  on platform_settings for all
  to authenticated
  using ((select auth_role()) = 'admin')
  with check ((select auth_role()) = 'admin');

comment on table platform_settings is
  'Key/value platform configuration surfaced in /admin/settings. Written only
   via Server Actions with service-role createAdmin.';

-- ------------------------------------------------------------------ --
--  3. profiles.is_suspended                                          --
-- ------------------------------------------------------------------ --

alter table profiles
  add column if not exists is_suspended boolean not null default false;

create index if not exists profiles_suspended_idx on profiles(is_suspended) where is_suspended;

comment on column profiles.is_suspended is
  'Admin suspend/unsuspend toggle surfaced in /admin/users. Suspended users are
   blocked from interactive role-gated dashboards.';