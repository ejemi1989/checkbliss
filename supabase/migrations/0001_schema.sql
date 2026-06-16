-- CheckinBliss Schema — Launch Critical
-- Enums

create type user_role as enum ('guest', 'owner', 'operator', 'admin');
create type property_status as enum ('draft', 'pending_review', 'approved', 'suspended');
create type reservation_status as enum ('pending_payment', 'confirmed', 'completed', 'cancelled');
create type hold_status as enum ('held', 'partially_captured', 'fully_captured', 'released', 'expired');
create type claim_decision as enum ('pending', 'approved', 'adjusted', 'rejected');
create type dispute_status as enum ('none', 'open', 'accepted', 'resolved');
create type inspection_result as enum ('clean', 'damage', 'noshow', 'guestpresent');

-- Profiles (extends auth.users)

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'guest',
  full_name text not null,
  email text not null,
  whatsapp_e164 text unique,
  whatsapp_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

-- Operator city assignments

create table operator_assignments (
  operator_id uuid not null references profiles(id) on delete cascade,
  city text not null,
  primary key (operator_id, city)
);

-- Properties

create table properties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  owner_id uuid not null references profiles(id),
  name text not null,
  city text not null,
  neighbourhood text,
  description text,
  amenities jsonb default '[]'::jsonb,
  route_note text,
  bedrooms int not null default 1,
  sleeps int not null default 2,
  currency char(3) not null default 'GBP',
  nightly_rate_minor int not null check (nightly_rate_minor > 0),
  deposit_minor int not null default 10000,
  extended_checkout_offered boolean not null default false,
  extended_checkout_price_minor int,
  is_featured boolean not null default false,
  status property_status not null default 'draft',
  created_at timestamptz not null default now()
);

create index idx_properties_status on properties(status);
create index idx_properties_city on properties(city);

-- Reservations

create table reservations (
  id uuid primary key default gen_random_uuid(),
  booking_group_id uuid not null,
  reference text not null unique,
  property_id uuid not null references properties(id),
  guest_id uuid references profiles(id),
  guest_name text not null,
  guest_email text not null,
  guest_phone text not null,
  guest_count int not null default 1,
  check_in date not null,
  check_out date not null,
  status reservation_status not null default 'pending_payment',
  confirmed_checkout_time time,
  late_checkout_fee_minor int,
  accommodation_minor int not null,
  total_minor int not null,
  deposit_hold_minor int not null default 10000,
  currency char(3) not null default 'GBP',
  airwallex_payment_intent_id text,
  created_at timestamptz not null default now(),
  constraint valid_range check (check_out > check_in)
);

create index idx_reservations_property on reservations(property_id);
create index idx_reservations_group on reservations(booking_group_id);
create index idx_reservations_checkout on reservations(check_out, status);

-- GiST exclusion: no overlapping confirmed reservations per property

create extension if not exists btree_gist;

alter table reservations
  add constraint reservations_no_overlap
  exclude using gist (
    property_id with =,
    daterange(check_in, check_out) with &&
  ) where (status <> 'cancelled');

-- Booking groups (multi-city atomic checkout)

create table booking_groups (
  id uuid primary key,
  charge_intent_id text,
  charge_status text,
  currency char(3) not null default 'GBP',
  charge_total_minor int not null,
  deposit_hold_total_minor int not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Deposit holds

create table deposit_holds (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  airwallex_authorisation_id text not null,
  hold_amount_minor int not null,
  currency char(3) not null default 'GBP',
  status hold_status not null default 'held',
  expires_at timestamptz not null,
  captured_amount_minor int not null default 0,
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_deposit_holds_reservation on deposit_holds(reservation_id);
create index idx_deposit_holds_status on deposit_holds(status);

-- Inspections

create table inspections (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  operator_id uuid references profiles(id),
  result inspection_result,
  inspected_at timestamptz,
  notes text,
  pre_notice_sent_at timestamptz,
  prompt_sent_at timestamptz,
  reminder_sent_at timestamptz,
  escalated_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_inspections_reservation on inspections(reservation_id);

-- Damage claims

create table damage_claims (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  reporting_operator_id uuid references profiles(id),
  photos jsonb default '[]'::jsonb,
  description text not null,
  estimated_cost_minor int not null,
  admin_decision claim_decision not null default 'pending',
  admin_reviewer_id uuid references profiles(id),
  admin_decided_at timestamptz,
  guest_dispute_status dispute_status not null default 'none',
  dispute_deadline timestamptz,
  resolved_amount_minor int,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_damage_claims_status on damage_claims(admin_decision);

-- Availability blocks (owner block/unblock)

create table availability_blocks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  starts date not null,
  ends date not null,
  source text not null default 'whatsapp'
);

alter table availability_blocks
  add constraint blocks_no_overlap
  exclude using gist (
    property_id with =,
    daterange(starts, ends) with &&
  );

-- Audit log

create table audit_log (
  id bigint primary key generated always as identity,
  action text not null,
  target_id text,
  detail text,
  created_at timestamptz not null default now()
);

create index idx_audit_log_action on audit_log(action);
create index idx_audit_log_created on audit_log(created_at);

-- WhatsApp audit log

create table whatsapp_audit_log (
  id bigint primary key generated always as identity,
  direction text not null,
  wa_phone text not null,
  profile_id uuid references profiles(id),
  body text,
  parsed_command text,
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

-- Verification log

create table verification_log (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  operator_id uuid references profiles(id),
  photos int not null default 0,
  notes text,
  logged_at timestamptz not null default now()
);

-- book_stays() — atomic booking function

create or replace function book_stays(
  p_group_id uuid,
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

    v_reference := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

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

    v_result := v_result || jsonb_build_object(
      'reservation_id', v_property_id,
      'reference', v_reference,
      'property_id', v_property.id,
      'property_name', v_property.name,
      'total_minor', v_total_minor,
      'deposit_minor', v_property.deposit_minor,
      'checkout_time', v_confirmed_checkout_time
    );
  end loop;

  return v_result;
end;
$$;

-- confirm_booking_group()

create or replace function confirm_booking_group(
  p_group_id uuid,
  p_payment_intent_id text
) returns void
language plpgsql
as $$
begin
  update reservations
  set status = 'confirmed',
      airwallex_payment_intent_id = p_payment_intent_id
  where booking_group_id = p_group_id and status = 'pending_payment';
end;
$$;

-- property_unavailable_ranges()

create or replace function property_unavailable_ranges(p_slug text)
returns table (from_date date, to_date date)
language plpgsql
as $$
begin
  return query
  select r.check_in, r.check_out
  from reservations r
  join properties p on p.id = r.property_id
  where p.slug = p_slug and r.status <> 'cancelled'
  union
  select ab.starts, ab.ends
  from availability_blocks ab
  join properties p on p.id = ab.property_id
  where p.slug = p_slug;
end;
$$;
