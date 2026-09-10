-- ============================================================================
-- CheckinBliss — Curated DB Patch (idempotent)
-- ============================================================================
-- Target: live Supabase project ejwurxnkcxpenmhbqwdi
-- Previous state: 0001, 0002, 0005, 0008, 0009, 0015_payment, 0016_*, 0018,
--   0019 + auth_role()/search_properties()/book_stays() applied.
-- This patch adds the MISSING migrations in dependency order, seeds the
-- 30 storefront properties, and re-creates book_stays() so it accepts both
-- URL slugs and legacy PR00x text ids (fixes the live 502:
--   invalid input syntax for type uuid: "PR008").
--
-- HOW TO RUN: paste into the Supabase SQL editor and Run.
-- It is idempotent — safe to run twice.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 0003_photos.sql — property media
-- ---------------------------------------------------------------------------
do $$ begin
  create type photo_status as enum ('pending_review', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists property_photos (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references properties (id) on delete cascade,
  storage_key   text not null,
  url           text not null,
  alt           text not null default '',
  sort_order    int  not null default 0,
  is_cover      boolean not null default false,
  uploaded_by   uuid references profiles (id),
  status        photo_status not null default 'pending_review',
  created_at    timestamptz not null default now()
);

create index if not exists property_photos_property_idx
  on property_photos (property_id, sort_order);


-- ---------------------------------------------------------------------------
-- 0004_seo_naming.sql — properties.name -> branded_name + URL slugs
-- ---------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'properties' and column_name = 'name')
  then
    alter table properties rename column name to branded_name;
  end if;
end $$;

alter table properties
  add column if not exists building_name text not null default '',
  add column if not exists country text not null default 'Nigeria',
  add column if not exists building_slug text,
  add column if not exists neighbourhood_slug text,
  add column if not exists cover_photo_url text;

update properties set building_name = branded_name where building_name = '';

update properties set neighbourhood_slug = lower(regexp_replace(regexp_replace(neighbourhood, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'));
update properties set building_slug = lower(regexp_replace(regexp_replace(building_name, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'));

alter table properties
  alter column neighbourhood_slug set not null,
  alter column building_slug set not null,
  alter column building_name set not null;

create index if not exists properties_building_neighbourhood_idx
  on properties (city, neighbourhood, building_name);

alter table properties drop constraint if exists properties_url_path_unique;
alter table properties add constraint properties_url_path_unique
  unique (city, neighbourhood, building_name, slug);

create table if not exists url_redirects (
  id uuid primary key default gen_random_uuid(),
  old_path text not null unique,
  new_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists url_redirects_old_path_idx on url_redirects (old_path);


-- ---------------------------------------------------------------------------
-- book_stays() — re-created for the post-rename schema.
-- Resolves p_items[].property_id as a URL slug (preferred) or raw uuid
-- (defensive). Legacy seed ids like PR008 map via properties.slug.
-- ---------------------------------------------------------------------------
create or replace function public.book_stays(
  p_group_id uuid,
  p_reference text,
  p_currency char(3),
  p_items jsonb,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_guest_count int
) returns jsonb
language plpgsql
as $$
declare
  v_item jsonb;
  v_property_id uuid;
  v_check_in date;
  v_check_out date;
  v_property record;
  v_nights int;
  v_accommodation_minor int;
  v_extended_checkout boolean;
  v_confirmed_checkout_time time;
  v_extended_price int;
  v_total_minor int;
  v_reference text;
  v_result jsonb = '[]'::jsonb;
  v_charge_total int := 0;
  v_deposit_total int := 0;
begin
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_check_in := (v_item->>'check_in')::date;
    v_check_out := (v_item->>'check_out')::date;
    v_extended_checkout := coalesce((v_item->>'extended_checkout')::boolean, false);

    -- Resolve the property: URL slug (canonical) or raw uuid (defensive).
    select id into v_property_id
    from properties
    where slug = v_item->>'property_id'
       or id::text = v_item->>'property_id'
    limit 1;

    if v_property_id is null then
      raise exception 'PROPERTY_NOT_FOUND'
        using detail = coalesce(v_item->>'property_id', '');
    end if;

    select * into v_property
    from properties
    where id = v_property_id and status = 'approved'
    for update;

    if not found then
      raise exception 'PROPERTY_NOT_BOOKABLE' using detail = v_property_id::text;
    end if;

    if v_check_in - now()::date < 14 then
      raise exception 'ADVANCE_14_DAYS' using detail = v_check_in::text;
    end if;

    v_nights := v_check_out - v_check_in;
    if v_nights <= 0 then
      raise exception 'INVALID_RANGE';
    end if;

    v_accommodation_minor := v_property.nightly_rate_minor * v_nights;
    v_confirmed_checkout_time := '11:00'::time;
    v_total_minor := v_accommodation_minor;

    if v_extended_checkout and v_property.extended_checkout_offered then
      v_confirmed_checkout_time := '18:00'::time;
      v_extended_price := coalesce(v_property.extended_checkout_price_minor, round(v_property.nightly_rate_minor * 0.4));
      v_total_minor := v_total_minor + v_extended_price;
    end if;

    v_reference := coalesce(nullif(trim(p_reference), ''), upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)));

    insert into reservations (
      booking_group_id, reference, property_id,
      guest_name, guest_email, guest_phone, guest_count,
      check_in, check_out, status,
      confirmed_checkout_time, late_checkout_fee_minor,
      accommodation_minor, total_minor, deposit_hold_minor,
      currency
    ) values (
      p_group_id, v_reference, v_property_id,
      p_guest_name, p_guest_email, p_guest_phone, p_guest_count,
      v_check_in, v_check_out, 'pending_payment',
      case when v_extended_checkout and v_property.extended_checkout_offered then '18:00'::time else '11:00'::time end,
      case when v_extended_checkout and v_property.extended_checkout_offered
        then coalesce(v_property.extended_checkout_price_minor, round(v_property.nightly_rate_minor * 0.4))
        else null end,
      v_accommodation_minor, v_total_minor, v_property.deposit_minor,
      v_property.currency
    )
    returning id, reference into v_property_id, v_reference;

    v_charge_total := v_charge_total + v_total_minor;
    v_deposit_total := v_deposit_total + v_property.deposit_minor;

    v_result := v_result || jsonb_build_object(
      'reservation_id', v_property_id,
      'reference', v_reference,
      'property_id', v_property.id,
      'property_name', v_property.branded_name,
      'total_minor', v_total_minor,
      'deposit_minor', v_property.deposit_minor,
      'checkout_time', v_confirmed_checkout_time
    );
  end loop;

  insert into booking_groups (id, reference, currency, charge_total_minor, deposit_hold_total_minor, status)
  values (p_group_id, v_reference, p_currency, v_charge_total, v_deposit_total, 'pending')
  on conflict (id) do update set
    reference = excluded.reference,
    currency = excluded.currency,
    charge_total_minor = excluded.charge_total_minor,
    deposit_hold_total_minor = excluded.deposit_hold_total_minor;

  return v_result;
end;
$$;


-- ---------------------------------------------------------------------------
-- 0006_feedback.sql — feedback requests
-- ---------------------------------------------------------------------------
create table if not exists feedback_requests (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  feedback_token text not null unique,
  status text not null default 'pending',
  trustpilot_url text,
  internal_feedback_url text,
  guest_rating text check (guest_rating in ('good', 'bad')),
  guest_comments text,
  notified_admin_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_requests_reservation on feedback_requests(reservation_id);
create index if not exists idx_feedback_requests_status on feedback_requests(status);


-- ---------------------------------------------------------------------------
-- 0007_rename_hold_column.sql — airwallex_authorisation_id -> payment_intent_id
-- ---------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'deposit_holds'
               and column_name = 'airwallex_authorisation_id')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'deposit_holds'
               and column_name = 'payment_intent_id')
  then
    alter table deposit_holds
      rename column airwallex_authorisation_id to payment_intent_id;
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 0011_whatsapp_crm.sql — WhatsApp CRM layer
-- ---------------------------------------------------------------------------
create table if not exists whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null unique,
  display_name text,
  role text,
  tags text[] default '{}',
  custom_fields jsonb default '{}'::jsonb,
  supabase_user_id uuid references profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_contacts_role on whatsapp_contacts(role);
create index if not exists idx_whatsapp_contacts_tags on whatsapp_contacts using gin(tags);

create table if not exists whatsapp_threads (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references whatsapp_contacts(id) on delete cascade,
  status text not null default 'open',
  assigned_to uuid references profiles(id) on delete set null,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  unread_count int not null default 0,
  bot_handled boolean not null default false,
  internal_notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_threads_status on whatsapp_threads(status, last_message_at desc);
create index if not exists idx_whatsapp_threads_contact on whatsapp_threads(contact_id);

create table if not exists whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references whatsapp_threads(id) on delete cascade,
  direction text not null,
  body text not null,
  message_type text not null default 'text',
  wa_message_id text unique,
  command_parsed text,
  status text not null default 'sent',
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_messages_thread on whatsapp_messages(thread_id, created_at desc);

create table if not exists whatsapp_pipelines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stages text[] not null,
  created_at timestamptz not null default now()
);

create table if not exists whatsapp_deals (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references whatsapp_pipelines(id) on delete cascade,
  contact_id uuid references whatsapp_contacts(id) on delete set null,
  title text not null,
  stage text not null,
  value_minor int default 0,
  currency char(3) default 'GBP',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_deals_pipeline on whatsapp_deals(pipeline_id, stage);

create table if not exists whatsapp_broadcasts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template_name text not null,
  segment text,
  recipient_count int not null default 0,
  delivered_count int not null default 0,
  read_count int not null default 0,
  status text not null default 'draft',
  sent_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_name text not null,
  role text not null,
  language text not null default 'en',
  category text,
  status text not null default 'approved',
  body text not null,
  variables text[] default '{}',
  trigger_when text,
  meta_template_id text,
  last_synced_at timestamptz default now()
);

create table if not exists whatsapp_automations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trigger text not null,
  action text not null,
  enabled boolean not null default true,
  last_run_at timestamptz,
  run_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table whatsapp_contacts enable row level security;
alter table whatsapp_threads enable row level security;
alter table whatsapp_messages enable row level security;
alter table whatsapp_pipelines enable row level security;
alter table whatsapp_deals enable row level security;
alter table whatsapp_broadcasts enable row level security;
alter table whatsapp_templates enable row level security;
alter table whatsapp_automations enable row level security;

drop policy if exists "admin_read_whatsapp_contacts" on whatsapp_contacts;
create policy "admin_read_whatsapp_contacts" on whatsapp_contacts
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
drop policy if exists "admin_read_whatsapp_threads" on whatsapp_threads;
create policy "admin_read_whatsapp_threads" on whatsapp_threads
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
drop policy if exists "admin_read_whatsapp_messages" on whatsapp_messages;
create policy "admin_read_whatsapp_messages" on whatsapp_messages
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
drop policy if exists "admin_read_whatsapp_pipelines" on whatsapp_pipelines;
create policy "admin_read_whatsapp_pipelines" on whatsapp_pipelines
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
drop policy if exists "admin_read_whatsapp_deals" on whatsapp_deals;
create policy "admin_read_whatsapp_deals" on whatsapp_deals
  for select using (
    (select role from profiles where id = auth.uid()) = auth.uid() or (select role from profiles where id = auth.uid()) = 'admin'
  );
drop policy if exists "admin_read_whatsapp_broadcasts" on whatsapp_broadcasts;
create policy "admin_read_whatsapp_broadcasts" on whatsapp_broadcasts
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
drop policy if exists "admin_read_whatsapp_templates" on whatsapp_templates;
create policy "admin_read_whatsapp_templates" on whatsapp_templates
  for select using (true);
drop policy if exists "admin_read_whatsapp_automations" on whatsapp_automations;
create policy "admin_read_whatsapp_automations" on whatsapp_automations
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );


-- ---------------------------------------------------------------------------
-- 0012_crm_notes.sql — admin CRM notes + thread status
-- ---------------------------------------------------------------------------
create table if not exists crm_notes (
  id uuid primary key default gen_random_uuid(),
  contact_e164 text not null,
  note text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_crm_notes_contact on crm_notes(contact_e164, created_at desc);

alter table crm_notes enable row level security;

drop policy if exists "admin_read_crm_notes" on crm_notes;
create policy "admin_read_crm_notes" on crm_notes
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
drop policy if exists "admin_insert_crm_notes" on crm_notes;
create policy "admin_insert_crm_notes" on crm_notes
  for insert with check (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
drop policy if exists "admin_delete_crm_notes" on crm_notes;
create policy "admin_delete_crm_notes" on crm_notes
  for delete using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );

create table if not exists crm_thread_status (
  contact_e164 text primary key,
  status text not null default 'open',
  updated_at timestamptz not null default now(),
  updated_by text not null
);

alter table crm_thread_status enable row level security;

drop policy if exists "admin_read_crm_thread_status" on crm_thread_status;
create policy "admin_read_crm_thread_status" on crm_thread_status
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
drop policy if exists "admin_upsert_crm_thread_status" on crm_thread_status;
create policy "admin_upsert_crm_thread_status" on crm_thread_status
  for insert with check (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
drop policy if exists "admin_update_crm_thread_status" on crm_thread_status;
create policy "admin_update_crm_thread_status" on crm_thread_status
  for update using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );


-- ---------------------------------------------------------------------------
-- 0013_dashboard_rls.sql — city-scoped dashboard RLS, claims, payouts
-- ---------------------------------------------------------------------------
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

create table if not exists damage_claim_events (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references damage_claims(id) on delete cascade,
  from_status text not null,
  to_status text not null,
  actor_id uuid references profiles(id),
  actor_role text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_dce_claim on damage_claim_events(claim_id, created_at);
create index if not exists idx_dce_to_status on damage_claim_events(to_status);

alter table damage_claim_events enable row level security;

drop policy if exists "Admins can read claim events" on damage_claim_events;
create policy "Admins can read claim events"
  on damage_claim_events for select
  using (auth_role() = 'admin');

drop policy if exists "Operators can read city claim events" on damage_claim_events;
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

alter table audit_log
  add column if not exists actor_id uuid references profiles(id),
  add column if not exists actor_role text,
  add column if not exists entity_type text,
  add column if not exists entity_id text,
  add column if not exists before_state jsonb,
  add column if not exists after_state jsonb;

create index if not exists idx_audit_log_actor on audit_log(actor_id);
create index if not exists idx_audit_log_entity on audit_log(entity_type, entity_id);

create table if not exists payouts (
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

create index if not exists idx_payouts_recipient on payouts(recipient_id, recipient_type);
create index if not exists idx_payouts_status on payouts(status);

alter table payouts enable row level security;

drop policy if exists "Admins can read payouts" on payouts;
create policy "Admins can read payouts"
  on payouts for select
  using (auth_role() = 'admin');
drop policy if exists "Owners can read own payouts" on payouts;
create policy "Owners can read own payouts"
  on payouts for select
  using (
    auth_role() = 'owner'
    and recipient_type = 'owner'
    and recipient_id = auth.uid()
  );
drop policy if exists "Operators can read own payouts" on payouts;
create policy "Operators can read own payouts"
  on payouts for select
  using (
    auth_role() = 'operator'
    and recipient_type = 'operator'
    and recipient_id = auth.uid()
  );

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

drop policy if exists "Damage claims readable by admins" on damage_claims;
create policy "Damage claims readable by admins"
  on damage_claims for select
  using (auth_role() = 'admin');
drop policy if exists "Operators can read city damage claims" on damage_claims;
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

drop policy if exists "Operators can insert damage claims" on damage_claims;
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
drop policy if exists "Operators can insert city claim events" on damage_claim_events;
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
drop policy if exists "Admins can insert claim events" on damage_claim_events;
create policy "Admins can insert claim events"
  on damage_claim_events for insert
  with check (auth_role() = 'admin');

drop policy if exists "Admins can read booking groups" on booking_groups;
create policy "Admins can read booking groups"
  on booking_groups for select
  using (auth_role() = 'admin');
drop policy if exists "Operators can read city booking groups" on booking_groups;
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

drop policy if exists "Deposit holds readable by admins" on deposit_holds;
create policy "Deposit holds readable by admins"
  on deposit_holds for select
  using (auth_role() = 'admin');
drop policy if exists "Operators can read city deposit holds" on deposit_holds;
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

drop policy if exists "Operators can read own assignments" on operator_assignments;
create policy "Operators can read own assignments"
  on operator_assignments for select
  using (
    auth_role() = 'operator'
    and operator_id = auth.uid()
  );


-- ---------------------------------------------------------------------------
-- 0014_one_time_payments.sql — hosted checkout sessions + stripe resources
-- ---------------------------------------------------------------------------
create table if not exists one_time_payments (
  id uuid primary key default gen_random_uuid(),
  checkout_session_id text not null unique,
  amount_minor int not null,
  currency char(3) not null,
  status text not null default 'pending',
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

alter table one_time_payments enable row level security;
alter table stripe_resources enable row level security;

drop policy if exists "admin_read_one_time_payments" on one_time_payments;
create policy "admin_read_one_time_payments" on one_time_payments
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
drop policy if exists "admin_read_stripe_resources" on stripe_resources;
create policy "admin_read_stripe_resources" on stripe_resources
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );


-- ---------------------------------------------------------------------------
-- 0010_seed_demo_users.sql — demo accounts (admin/operator/owner)
-- ---------------------------------------------------------------------------
do $$ declare
  v_admin_id uuid;
  v_operator_id uuid;
  v_owner_id uuid;
  v_exists boolean;
begin
  select exists(select 1 from auth.users where instance_id = '00000000-0000-0000-0000-000000000000' and email = 'admin@checkbliss.com') into v_exists;
  if not v_exists then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) values
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'admin@checkbliss.com', crypt('checkbliss-demo-2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin User"}', now(), now(), '', '', '', '');
  end if;
  select id into v_admin_id from auth.users where instance_id = '00000000-0000-0000-0000-000000000000' and email = 'admin@checkbliss.com';
  insert into public.profiles (id, role, full_name, email, whatsapp_e164, whatsapp_opt_in, created_at) values (v_admin_id, 'admin', 'Admin User', 'admin@checkbliss.com', null, false, now()) on conflict (id) do update set role = excluded.role, full_name = excluded.full_name, email = excluded.email;

  select exists(select 1 from auth.users where instance_id = '00000000-0000-0000-0000-000000000000' and email = 'operator@checkbliss.com') into v_exists;
  if not v_exists then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) values
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'operator@checkbliss.com', crypt('checkbliss-demo-2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Operator User"}', now(), now(), '', '', '', '');
  end if;
  select id into v_operator_id from auth.users where instance_id = '00000000-0000-0000-0000-000000000000' and email = 'operator@checkbliss.com';
  insert into public.profiles (id, role, full_name, email, whatsapp_e164, whatsapp_opt_in, created_at) values (v_operator_id, 'operator', 'Operator User', 'operator@checkbliss.com', '+2348020000001', true, now()) on conflict (id) do update set role = excluded.role, full_name = excluded.full_name, email = excluded.email;
  insert into public.operator_assignments (operator_id, city) values (v_operator_id, 'Lagos') on conflict do nothing;

  select exists(select 1 from auth.users where instance_id = '00000000-0000-0000-0000-000000000000' and email = 'owner@checkbliss.com') into v_exists;
  if not v_exists then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) values
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'owner@checkbliss.com', crypt('checkbliss-demo-2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Owner User"}', now(), now(), '', '', '', '');
  end if;
  select id into v_owner_id from auth.users where instance_id = '00000000-0000-0000-0000-000000000000' and email = 'owner@checkbliss.com';
  insert into public.profiles (id, role, full_name, email, whatsapp_e164, whatsapp_opt_in, created_at) values (v_owner_id, 'owner', 'Owner User', 'owner@checkbliss.com', '+2348010000001', true, now()) on conflict (id) do update set role = excluded.role, full_name = excluded.full_name, email = excluded.email;
end $$;


-- ---------------------------------------------------------------------------
-- 0017_owner_payout_details_bank_code.sql — payout routing code
-- ---------------------------------------------------------------------------
alter table owner_payout_details
  add column if not exists bank_code text;

comment on column owner_payout_details.bank_code
  is 'Fincra-side bank routing code (e.g. 058 GTBank, 044 Access, 057 Zenith)';


-- ---------------------------------------------------------------------------
-- Storefront seed — 30 property rows from lib/seed-data.ts
-- (owner_id resolved from the owner@checkbliss.com profile created above)
-- ---------------------------------------------------------------------------
-- (seed generated from lib/seed-data.ts — matches storefront slugs/prices exactly)
insert into public.properties
  (slug, owner_id, branded_name, building_name, building_slug, neighbourhood_slug, city, country, neighbourhood, description, amenities, route_note, bedrooms, sleeps, currency, nightly_rate_minor, deposit_minor, extended_checkout_offered, extended_checkout_price_minor, is_featured, status, cover_photo_url)
values
(
  'lagoon-view-loft',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Lagoon View Loft',
  'Ocean Parade Towers',
  'ocean-parade-towers',
  'victoria-island',
  'Lagos',
  'Nigeria',
  'Victoria Island',
  'Floor-to-ceiling windows frame the lagoon from this light-filled one-bedroom loft in the heart of Victoria Island. Minimalist interiors, curated art, and a private balcony make this the perfect base for exploring Lagos.',
  '["WiFi","Air conditioning","Washer","Kitchen","Balcony","Pool access","24/7 security"]'::jsonb,
  '15 min from Lagos airport (LOS). Secure parking available in the building.',
  1,
  2,
  'GBP',
  24000,
  10000,
  true,
  9600,
  true,
  'approved',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'
),
(
  'sunset-dove',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Sunset Dove',
  'The Wings Complex',
  'the-wings-complex',
  'ikoyi',
  'Lagos',
  'Nigeria',
  'Ikoyi',
  'A tranquil Ikoyi retreat with rooftop sunset views across Lagos. Mid-century furniture meets Nigerian craftsmanship in this thoughtfully composed one-bedroom apartment.',
  '["WiFi","Air conditioning","Washer","Kitchen","Rooftop","Gym","Parking"]'::jsonb,
  '20 min from LOS. Off Awolowo Road — easy taxi access.',
  1,
  2,
  'GBP',
  16000,
  10000,
  true,
  6400,
  false,
  'approved',
  'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=800&q=80'
),
(
  'the-palms-maisonette',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'The Palms Maisonette',
  'Ahmadu Bello Mansions',
  'ahmadu-bello-mansions',
  'victoria-island',
  'Lagos',
  'Nigeria',
  'Victoria Island',
  'A spacious two-bedroom maisonette across two floors, featuring a private garden courtyard, dedicated workspace, and a fully equipped kitchen. Ideal for families or longer stays.',
  '["WiFi","Air conditioning","Washer","Kitchen","Garden","Workspace","Parking","Generator backup"]'::jsonb,
  '10 min from LOS. On Ahmadu Bello Way.',
  2,
  4,
  'GBP',
  21000,
  15000,
  true,
  8400,
  true,
  'approved',
  'https://images.unsplash.com/photo-1600585154084-4e5fe7c39198?auto=format&fit=crop&w=800&q=80'
),
(
  'gra-executive-suite',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'GRA Executive Suite',
  'Diplomatic Gardens',
  'diplomatic-gardens',
  'gra',
  'Abuja',
  'Nigeria',
  'GRA',
  'A refined two-bedroom suite in the heart of GRA, Abuja''s most prestigious district. Marble floors, a formal dining room, and a private terrace overlook the diplomatic quarter.',
  '["WiFi","Air conditioning","Washer","Kitchen","Terrace","Pool","Gym","Parking","Housekeeping"]'::jsonb,
  '30 min from Abuja airport (ABV). In the GRA diplomatic zone.',
  2,
  4,
  'GBP',
  55000,
  25000,
  true,
  22000,
  true,
  'approved',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80'
),
(
  'maitama-garden-studios',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Maitama Garden Studios',
  'Yakubu Gowon Gardens',
  'yakubu-gowon-gardens',
  'maitama',
  'Abuja',
  'Nigeria',
  'Maitama',
  'Light-filled studio apartments in a lush garden compound in Maitama. Each unit opens onto a shared tropical garden. Minimal, modern, and perfectly positioned for exploring Abuja.',
  '["WiFi","Air conditioning","Kitchenette","Garden","Laundry service","Security"]'::jsonb,
  '25 min from ABV. Off Yakubu Gowon Crescent.',
  1,
  2,
  'GBP',
  32000,
  10000,
  false,
  NULL,
  false,
  'approved',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80'
),
(
  'central-abuja-penthouse',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Central Abuja Penthouse',
  'Millennium Tower Residences',
  'millennium-tower-residences',
  'central-district',
  'Abuja',
  'Nigeria',
  'Central District',
  'A dramatic penthouse on the top floor of a Central District tower. Panoramic views across the capital, a private rooftop terrace, and interiors designed by a leading Lagos studio.',
  '["WiFi","Air conditioning","Washer","Full kitchen","Rooftop terrace","Pool","Gym","Valet parking","Concierge"]'::jsonb,
  '20 min from ABV. Walking distance to the Millennium Tower.',
  3,
  6,
  'GBP',
  75000,
  30000,
  true,
  30000,
  true,
  'approved',
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80'
),
(
  'ikoyi-courtyard-suite',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Ikoyi Courtyard Suite',
  'Bourdillon Place',
  'bourdillon-place',
  'ikoyi',
  'Lagos',
  'Nigeria',
  'Ikoyi',
  'A serene garden-level suite tucked behind the Bourdillon Road bustle. Whitewashed walls, handwoven textiles, and a private courtyard shaded by century-old mango trees. Walking distance to the Ikoyi Club and the best restaurants on Keffi Street.',
  '["WiFi","Air conditioning","Washer","Kitchenette","Private courtyard","Garden access","24/7 security","Parking"]'::jsonb,
  '18 min from LOS. Off Bourdillon Road, Ikoyi.',
  1,
  2,
  'GBP',
  18000,
  10000,
  true,
  7200,
  false,
  'approved',
  'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80'
),
(
  'lekki-lagoon-house',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Lekki Lagoon House',
  'Lagoon Edge Estate',
  'lagoon-edge-estate',
  'lekki-phase-1',
  'Lagos',
  'Nigeria',
  'Lekki Phase 1',
  'Wide open living spaces facing the Lagos Lagoon. This two-bedroom gem combines a minimalist Japanese wabi-sabi aesthetic with bold Nigerian contemporary art. Floor-to-ceiling sliders blur the line between indoors and the waterfront deck.',
  '["WiFi","Air conditioning","Washer","Full kitchen","Waterfront deck","Outdoor shower","Parking","Generator backup","Pool access"]'::jsonb,
  '25 min from LOS. In Lagoon Edge Estate, Lekki Phase 1.',
  2,
  4,
  'GBP',
  28000,
  15000,
  true,
  11200,
  true,
  'approved',
  'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=800&q=80'
),
(
  'surulere-music-room',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Surulere Music Room',
  'Ita Faaji Lofts',
  'ita-faaji-lofts',
  'surulere',
  'Lagos',
  'Nigeria',
  'Surulere',
  'A creative''s hideout in the cultural heart of Surulere. Vintage vinyl, a dedicated listening nook, and walls lined with Afrobeats gold records. The rooftop host nightly views of the Lagos mainland skyline.',
  '["WiFi","Air conditioning","Kitchenette","Rooftop","Record player","Workspace","Security"]'::jsonb,
  '20 min from LOS. Off Adeniran Ogunsanya Street.',
  1,
  2,
  'GBP',
  15000,
  8000,
  true,
  6000,
  false,
  'approved',
  'https://images.unsplash.com/photo-1616137466211-f939a420be84?auto=format&fit=crop&w=800&q=80'
),
(
  'yaba-hub-studio',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Yaba Hub Studio',
  'Tech Bridge House',
  'tech-bridge-house',
  'yaba',
  'Lagos',
  'Nigeria',
  'Yaba',
  'Sleek micro-apartment in the heart of Yaba''s tech corridor. Walking distance to Co-Creation Hub and the best cafes on Commercial Avenue. Smart locks, gigabit fibre, and an ergonomic standing desk make this ideal for remote workers.',
  '["WiFi","Air conditioning","Kitchenette","Standing desk","Smart lock","Laundry","Security"]'::jsonb,
  '12 min from LOS. On Commercial Avenue, Yaba.',
  1,
  1,
  'GBP',
  14000,
  8000,
  false,
  NULL,
  false,
  'approved',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80'
),
(
  'banana-island-villa',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Banana Island Villa',
  'Banana Island Estate',
  'banana-island-estate',
  'banana-island',
  'Lagos',
  'Nigeria',
  'Banana Island',
  'A sprawling three-bedroom villa on Lagos''s most exclusive reclaimed island. Private infinity pool, imported Italian marble, a chef''s kitchen, and a rooftop bar overlooking the Atlantic. The benchmark for luxury short-stay in Lagos.',
  '["WiFi","Air conditioning","Washer","Full kitchen","Infinity pool","Rooftop bar","Gym","Valet parking","24/7 security","Housekeeping","Generator backup"]'::jsonb,
  '30 min from LOS. Inside Banana Island Estate — security checkpoint.',
  3,
  6,
  'GBP',
  45000,
  20000,
  true,
  18000,
  true,
  'approved',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'
),
(
  'sixth-floor-vista',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Sixth Floor Vista',
  'Marina Heights',
  'marina-heights',
  'victoria-island',
  'Lagos',
  'Nigeria',
  'Victoria Island',
  'An airy one-bedroom perched high above Victoria Island''s marina. The view takes in the entire Lagos coastline, from Tarkwa Bay to the Third Mainland Bridge. Monochrome palette punctuated by tropical greenery.',
  '["WiFi","Air conditioning","Washer","Kitchen","Balcony","Pool","Gym","Parking","Concierge"]'::jsonb,
  '15 min from LOS. On Marina, Victoria Island.',
  1,
  2,
  'GBP',
  22000,
  12000,
  true,
  8800,
  false,
  'approved',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80'
),
(
  'lekki-garden-duplex',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Lekki Garden Duplex',
  'Garden Court Estate',
  'garden-court-estate',
  'lekki-phase-1',
  'Lagos',
  'Nigeria',
  'Lekki Phase 1',
  'A bi-level duplex wrapped around a private garden with an open-plan kitchen, dining, and living area flowing onto a sun-drenched terrace. Smart home controls, a dedicated office nook, and two en-suite bedrooms upstairs.',
  '["WiFi","Air conditioning","Washer","Full kitchen","Garden","Terrace","Smart home","Workspace","Parking","Generator backup"]'::jsonb,
  '25 min from LOS. Inside Garden Court Estate, Lekki Phase 1.',
  2,
  4,
  'GBP',
  32000,
  15000,
  true,
  12800,
  true,
  'approved',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80'
),
(
  'awolowo-residence',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Awolowo Residence',
  'Awolowo Place',
  'awolowo-place',
  'ikoyi',
  'Lagos',
  'Nigeria',
  'Ikoyi',
  'A calm two-bedroom residence on quiet Awolowo Road. Herringbone timber floors, a powder room, and a spacious living area that opens onto a leafy balcony. Steps from Ikoyi''s best dining and the green expanse of Falomo.',
  '["WiFi","Air conditioning","Washer","Full kitchen","Balcony","Parking","24/7 security","Housekeeping"]'::jsonb,
  '18 min from LOS. Off Awolowo Road, Ikoyi.',
  2,
  4,
  'GBP',
  26000,
  15000,
  true,
  10400,
  false,
  'approved',
  'https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?auto=format&fit=crop&w=800&q=80'
),
(
  'surulere-attic-loft',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Surulere Attic Loft',
  'Bode Thomas House',
  'bode-thomas-house',
  'surulere',
  'Lagos',
  'Nigeria',
  'Surulere',
  'A converted attic in a 1970s Surulere apartment block. Exposed beam ceilings, a mezzanine sleeping area, and a sunny reading corner. The neighbourhood hums with street food, live music, and local energy.',
  '["WiFi","Air conditioning","Kitchenette","Mezzanine","Reading nook","Laundry","Security"]'::jsonb,
  '20 min from LOS. On Bode Thomas Street, Surulere.',
  1,
  2,
  'GBP',
  16000,
  8000,
  true,
  6400,
  false,
  'approved',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=800&q=80'
),
(
  'banana-island-terrace',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Banana Island Terrace',
  'Parkview Estate',
  'parkview-estate',
  'banana-island',
  'Lagos',
  'Nigeria',
  'Banana Island',
  'Grand three-bedroom apartment with a wraparound terrace across the entire frontage. Soaring ceilings, a wine room, and a media lounge. The master suite features a spa-inspired bathroom with a freestanding soaking tub.',
  '["WiFi","Air conditioning","Washer","Full kitchen","Wraparound terrace","Wine room","Media lounge","Pool","Gym","Parking","24/7 security"]'::jsonb,
  '30 min from LOS. Inside Parkview Estate, Banana Island.',
  3,
  6,
  'GBP',
  50000,
  25000,
  true,
  20000,
  true,
  'approved',
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80'
),
(
  'yaba-fibre-studio',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Yaba Fibre Studio',
  'Herbert Macaulay House',
  'herbert-macaulay-house',
  'yaba',
  'Lagos',
  'Nigeria',
  'Yaba',
  'Compact, cleverly designed studio steps from the Yaba Railway Station. Hospital- grade air filtration, soundproofed windows, a Murphy bed, and a fold-down desk. Optimised for deep focus and deep sleep.',
  '["WiFi","Air conditioning","Kitchenette","Soundproofing","Murphy bed","Laundry","Security"]'::jsonb,
  '12 min from LOS. On Herbert Macaulay Way, Yaba.',
  1,
  1,
  'GBP',
  14000,
  8000,
  false,
  NULL,
  false,
  'approved',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80'
),
(
  'victoria-island-garden-flat',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Victoria Island Garden Flat',
  'River Valley Estate',
  'river-valley-estate',
  'victoria-island',
  'Lagos',
  'Nigeria',
  'Victoria Island',
  'A ground-floor flat where the garden is an extension of the living room. Bioline doors fold completely open to a lawn dotted with frangipani and a private plunge pool. The bedroom has direct garden access with an outdoor rain shower.',
  '["WiFi","Air conditioning","Washer","Kitchen","Private garden","Plunge pool","Outdoor shower","Parking","Security"]'::jsonb,
  '15 min from LOS. In River Valley Estate, Victoria Island.',
  1,
  2,
  'GBP',
  20000,
  10000,
  true,
  8000,
  false,
  'approved',
  'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=800&q=80'
),
(
  'asokoro-state-house-view',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Asokoro State House View',
  'Presidential Gardens Estate',
  'presidential-gardens-estate',
  'asokoro',
  'Abuja',
  'Nigeria',
  'Asokoro',
  'A sophisticated two-bedroom apartment facing Aso Rock. Every window frames the seat of Nigerian power. Neutral tones accented with burnt orange and indigo. The residents'' lounge has a whisky bar and cigar terrace.',
  '["WiFi","Air conditioning","Washer","Full kitchen","Residents lounge","Whisky bar","Pool","Gym","Valet parking","24/7 security"]'::jsonb,
  '25 min from ABV. Inside Presidential Gardens Estate, Asokoro.',
  2,
  4,
  'GBP',
  38000,
  20000,
  true,
  15200,
  true,
  'approved',
  'https://images.unsplash.com/photo-1600585154084-4e5fe7c39198?auto=format&fit=crop&w=800&q=80'
),
(
  'wuse-2-executive',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Wuse 2 Executive',
  'Adetokunbo Ademola Towers',
  'adetokunbo-ademola-towers',
  'wuse-2',
  'Abuja',
  'Nigeria',
  'Wuse 2',
  'A business-ready two-bedroom in the commercial heart of Wuse 2. Dedicated meeting room with video conferencing, a fully stocked Nespresso bar, and a balcony overlooking the bustle of Adetokunbo Ademola Street.',
  '["WiFi","Air conditioning","Washer","Full kitchen","Meeting room","Nespresso bar","Balcony","Parking","Business centre","Security"]'::jsonb,
  '20 min from ABV. On Adetokunbo Ademola Street, Wuse 2.',
  2,
  4,
  'GBP',
  30000,
  15000,
  true,
  12000,
  false,
  'approved',
  'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=800&q=80'
),
(
  'jabi-lake-studios',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Jabi Lake Studios',
  'Lake View Crescent',
  'lake-view-crescent',
  'jabi',
  'Abuja',
  'Nigeria',
  'Jabi',
  'Compact studio with a front-row seat to Jabi Lake. Floor-to-ceiling windows capture the sunset over the water. The building has a lakefront restaurant, a small gym, and 24-hour security. Walk to Jabi Lake Mall.',
  '["WiFi","Air conditioning","Kitchenette","Lake view","Restaurant access","Gym","Security","Parking"]'::jsonb,
  '20 min from ABV. Off Lake View Crescent, Jabi.',
  1,
  2,
  'GBP',
  25000,
  10000,
  false,
  NULL,
  false,
  'approved',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'
),
(
  'katampe-hill-residence',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Katampe Hill Residence',
  'Katampe Estate',
  'katampe-estate',
  'katampe',
  'Abuja',
  'Nigeria',
  'Katampe',
  'A hillside three-bedroom retreat with a panoramic infinity pool overlooking the Katampe valley. Open-plan living with double-volume ceilings, a wine cellar, and a private study. Gated estate with jogging trails.',
  '["WiFi","Air conditioning","Washer","Full kitchen","Infinity pool","Wine cellar","Study","Terrace","Parking","24/7 security","Generator backup"]'::jsonb,
  '30 min from ABV. On the hill inside Katampe Estate.',
  3,
  6,
  'GBP',
  42000,
  20000,
  true,
  16800,
  true,
  'approved',
  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80'
),
(
  'durumi-garden-apartment',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Durumi Garden Apartment',
  'Sunflower Estate',
  'sunflower-estate',
  'durumi',
  'Abuja',
  'Nigeria',
  'Durumi',
  'A one-bedroom garden apartment in a quiet Durumi estate. Lots of natural light, a galley kitchen finished in sage green tiles, and a patio overlooking manicured lawns. Five minutes from the Durumi market.',
  '["WiFi","Air conditioning","Kitchen","Garden","Patio","Laundry","Security","Parking"]'::jsonb,
  '25 min from ABV. Inside Sunflower Estate, Durumi.',
  1,
  2,
  'GBP',
  20000,
  10000,
  true,
  8000,
  false,
  'approved',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'
),
(
  'guzape-contemporary',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Guzape Contemporary',
  'Hilltop Mews',
  'hilltop-mews',
  'guzape',
  'Abuja',
  'Nigeria',
  'Guzape',
  'A contemporary two-bedroom mews house in up-and-coming Guzape. Polished concrete floors, a chef''s kitchen with an island, and a roof terrace with views towards Aso Rock. Popular with diplomats and NGO directors.',
  '["WiFi","Air conditioning","Washer","Full kitchen","Roof terrace","Smart home","Workspace","Parking","Security"]'::jsonb,
  '25 min from ABV. On the hill in Guzape District.',
  2,
  4,
  'GBP',
  35000,
  18000,
  true,
  14000,
  false,
  'approved',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80'
),
(
  'maitama-diplomatic-suite',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Maitama Diplomatic Suite',
  'Diplomatic Drive Estate',
  'diplomatic-drive-estate',
  'maitama',
  'Abuja',
  'Nigeria',
  'Maitama',
  'A two-bedroom suite on Maitama''s Diplomatic Drive, home to over a dozen embassies. The apartment pairs British colonial plantation shutters with Hausa embroidered textiles. A rooftop infinity pool overlooks the embassy quarter.',
  '["WiFi","Air conditioning","Washer","Full kitchen","Infinity pool","Rooftop terrace","Gym","Parking","Housekeeping","24/7 security"]'::jsonb,
  '22 min from ABV. On Diplomatic Drive, Maitama.',
  2,
  4,
  'GBP',
  34000,
  15000,
  true,
  13600,
  true,
  'approved',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80'
),
(
  'gra-diplomatic-terrace',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'GRA Diplomatic Terrace',
  'Constitutional Avenue Court',
  'constitutional-avenue-court',
  'gra',
  'Abuja',
  'Nigeria',
  'GRA',
  'A three-bedroom apartment on Constitutional Avenue in the heart of GRA. Italian marble throughout, a formal dining room that seats ten, and a terrace large enough for entertaining. Walking distance to the State House.',
  '["WiFi","Air conditioning","Washer","Full kitchen","Formal dining","Terrace","Pool","Gym","Parking","Butler service","Generator backup"]'::jsonb,
  '25 min from ABV. On Constitutional Avenue, GRA.',
  3,
  6,
  'GBP',
  58000,
  25000,
  true,
  23200,
  false,
  'approved',
  'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80'
),
(
  'central-district-presidential',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Central District Presidential',
  'Shehu Musa Yar''Adua Towers',
  'shehu-musa-yaradua-towers',
  'central-district',
  'Abuja',
  'Nigeria',
  'Central District',
  'The flagship four-bedroom residence occupying the entire top floor of a Central District landmark. Private elevator access, a panoramic living room, a library, a media room, and a 360-degree terrace with views across the entire capital.',
  '["WiFi","Air conditioning","Washer","Full kitchen","Private elevator","Library","Media room","Panoramic terrace","Wine cellar","Pool","Gym","Valet parking","Concierge","24/7 security"]'::jsonb,
  '18 min from ABV. Shehu Musa Yar''Adua Towers, Central District.',
  4,
  8,
  'GBP',
  80000,
  35000,
  true,
  32000,
  true,
  'approved',
  'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80'
),
(
  'asokoro-garden-terrace',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Asokoro Garden Terrace',
  'Garden Terraces Estate',
  'garden-terraces-estate',
  'asokoro',
  'Abuja',
  'Nigeria',
  'Asokoro',
  'A bright two-bedroom garden terrace in one of Asokoro''s most sought-after estates. Open-plan living, a marble kitchen island, and a private garden with a koi pond. Short walk to the Asokoro green market.',
  '["WiFi","Air conditioning","Washer","Full kitchen","Garden","Koi pond","Workspace","Parking","Security","Generator backup"]'::jsonb,
  '25 min from ABV. Inside Garden Terraces Estate, Asokoro.',
  2,
  4,
  'GBP',
  40000,
  20000,
  true,
  16000,
  false,
  'approved',
  'https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?auto=format&fit=crop&w=800&q=80'
),
(
  'wuse-2-city-loft',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Wuse 2 City Loft',
  'Ibrahim Babangida Boulevard',
  'ibrahim-babangida-boulevard',
  'wuse-2',
  'Abuja',
  'Nigeria',
  'Wuse 2',
  'A loft-style two-bedroom on the bustling Ibrahim Babangida Boulevard. Industrial exposed ducts, a concrete feature wall, and a balcony bar perfect for evening sundowners. Steps from the best nightlife in Wuse 2.',
  '["WiFi","Air conditioning","Washer","Full kitchen","Balcony bar","Smart TV","Workspace","Parking","Security"]'::jsonb,
  '20 min from ABV. On Ibrahim Babangida Boulevard, Wuse 2.',
  2,
  4,
  'GBP',
  28000,
  15000,
  true,
  11200,
  false,
  'approved',
  'https://images.unsplash.com/photo-1616137466211-f939a420be84?auto=format&fit=crop&w=800&q=80'
),
(
  'jabi-lake-penthouse',
  (select id from auth.users where email = 'owner@checkbliss.com' limit 1),
  'Jabi Lake Penthouse',
  'Jabi Lake Tower',
  'jabi-lake-tower',
  'jabi',
  'Abuja',
  'Nigeria',
  'Jabi',
  'A show-stopping penthouse on the 14th floor of the Jabi Lake Tower. Glass walls on three sides, a private hot tub on the terrace, and a fully automated smart home system. The building has a rooftop helipad.',
  '["WiFi","Air conditioning","Washer","Full kitchen","Private hot tub","Smart home","Rooftop terrace","Helipad access","Pool","Gym","Valet parking","Concierge","24/7 security"]'::jsonb,
  '20 min from ABV. 14th floor, Jabi Lake Tower.',
  1,
  2,
  'GBP',
  22000,
  12000,
  false,
  NULL,
  false,
  'approved',
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80'
)
on conflict (slug) do update set
  branded_name = excluded.branded_name,
  neighbourhood_slug = excluded.neighbourhood_slug,
  building_slug = excluded.building_slug,
  nightly_rate_minor = excluded.nightly_rate_minor,
  deposit_minor = excluded.deposit_minor,
  currency = excluded.currency,
  status = excluded.status,
  is_featured = excluded.is_featured;


-- ---------------------------------------------------------------------------
-- 0015_booking_rules.sql — book_stays doc comment (applies to the new function)
-- ---------------------------------------------------------------------------
comment on function public.book_stays is
  'Atomic stay-booking RPC. Enforces the 14-day advance rule (ADVANCE_14_DAYS):
   check-in must be at least 14 full calendar days from today (Africa/Lagos);
   overlaps raise DATES_UNAVAILABLE and roll back. The GiST EXCLUDE constraint
   on reservations is the double-booking guard — application availability
   checks are UX, never the guard.';


-- ---------------------------------------------------------------------------
-- Verification queries
-- ---------------------------------------------------------------------------
select 'properties' as check_name, count(*) from properties
union all select 'property_photos', count(*) from property_photos
union all select 'feedback_requests', count(*) from feedback_requests
union all select 'url_redirects', count(*) from url_redirects
union all select 'whatsapp_threads', count(*) from whatsapp_threads
union all select 'crm_thread_status', count(*) from crm_thread_status
union all select 'damage_claim_events', count(*) from damage_claim_events
union all select 'payouts', count(*) from payouts
union all select 'one_time_payments', count(*) from one_time_payments
union all select 'stripe_resources', count(*) from stripe_resources
union all select 'booking_groups', count(*) from booking_groups
order by 1;

select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'properties'
order by ordinal_position;