-- ============================================================================
-- CheckinBliss — Pending schema changes for the live Supabase project
-- Project: ejwurxnkcxpenmhbqwdi | Date: 2026-09-07
--
-- Idempotent merge of the migration files NOT yet applied to the live DB:
--   * book_stays() recreation from 0004_seo_naming.sql — post rename--
--     reads v_property.branded_name and writes booking_groups.reference
--   * 5-arg search_properties from 0005_search.sql
--   * 0018_phase7_schema.sql in full (operators / country_of_residence /
--     booking_groups.reference)
--
-- Safe to re-run. Paste into the Supabase SQL editor and Run.
-- ============================================================================

-- ------------------------------------------------------------------ --
--  1. book_stays() — recreate for branded_name + booking_groups.ref --
-- ------------------------------------------------------------------ --

create or replace function book_stays(
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
    v_property_id := (v_item->>'property_id')::uuid;
    v_check_in := (v_item->>'check_in')::date;
    v_check_out := (v_item->>'check_out')::date;
    v_extended_checkout := coalesce((v_item->>'extended_checkout')::boolean, false);

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

-- ------------------------------------------------------------------ --
--  2. search_properties — 5-arg signature (guests / rooms filters) --
-- ------------------------------------------------------------------ --

create or replace function search_properties(
  p_where text default null,
  p_in    date default null,
  p_out   date default null,
  p_guests int default null,
  p_rooms  int default null
)
returns setof properties
language sql stable as $$
  select p.*
  from properties p
  where p.status = 'approved'
    and (
      p_where is null
      or p.city ilike p_where
      or p.neighbourhood ilike p_where
    )
    and (p_guests is null or p.sleeps >= p_guests)
    and (p_rooms is null or p.bedrooms >= p_rooms)
    and (
      p_in is null or p_out is null
      or not exists (
        select 1 from reservations r
        where r.property_id = p.id
          and r.status <> 'cancelled'
          and daterange(r.check_in, r.check_out, '[)')
              && daterange(p_in, p_out, '[)')
      )
      and not exists (
        select 1 from availability_blocks b
        where b.property_id = p.id
          and daterange(b.starts, b.ends, '[)')
              && daterange(p_in, p_out, '[)')
      )
    )
  order by p.is_featured desc, p.nightly_rate_minor asc;
$$;

-- ------------------------------------------------------------------ --
--  3. 0018 — phase 7 schema (operators, country_of_residence, ref)  --
-- ------------------------------------------------------------------ --

create table if not exists operators (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references profiles(id) on delete cascade,
  name text not null,
  email text not null unique,
  assigned_cities text[] not null default '{}',
  city text,
  status text not null default 'onboarding',
  quality_score int not null default 0,
  inspections_done int not null default 0,
  verified_count int not null default 0,
  properties_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists operators_profile_id_idx on operators(profile_id);
create index if not exists operators_status_idx on operators(status);

comment on table operators is
  'Per-operator operational record (separate from the auth profile). The assigned_cities
   array here is the dashboard-facing summary; operator_assignments remains the per-city
   source of truth used by RLS (has_city_access).';
comment on column operators.assigned_cities is
  'City list surfaced in admin / dashboard UI; mirrors operator_assignments rows.';

alter table profiles
  add column if not exists country_of_residence text;

comment on column profiles.country_of_residence is
  'ISO country the user resides in (free-text — signup form does not validate the
   controlled-vocabulary list; analytics + future localisation use this).';

alter table booking_groups
  add column if not exists reference text;

create unique index if not exists booking_groups_reference_uidx
  on booking_groups(reference)
  where reference is not null;

comment on column booking_groups.reference is
  '8-char base32 group reference, shared across all reservations in a multi-item
   checkout. Generated by book_stays() inside the booking transaction; the same
   value as the first reservation''s reference (single-item checkouts share both).';

-- ============================================================================
--  Post-check (should print "ready" for each):
--    select 1 where exists (select 1 from pg_proc where proname = 'book_stays' and pronargs = 8);
--    select 1 where exists (select 1 from pg_proc where proname = 'search_properties' and pronargs = 5);
--    select 1 where exists (select 1 from information_schema.tables where table_name = 'operators');
--    select 1 where exists (select 1 from information_schema.columns
--      where table_name = 'profiles' and column_name = 'country_of_residence');
--    select 1 where exists (select 1 from pg_indexes where indexname = 'booking_groups_reference_uidx');
-- ============================================================================