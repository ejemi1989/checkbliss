-- 0004_seo_naming.sql
-- Splits properties.name into branded_name (customer-facing) + building_name (search-facing)
-- Adds URL-slug columns, country, url_redirects, and uniqueness constraint

alter table properties
  rename column name to branded_name;

alter table properties
  add column building_name text not null default '',
  add column country text not null default 'Nigeria',
  add column building_slug text,
  add column neighbourhood_slug text,
  add column cover_photo_url text;

update properties set building_name = branded_name where building_name = '';

update properties set neighbourhood_slug = lower(regexp_replace(regexp_replace(neighbourhood, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'));
update properties set building_slug = lower(regexp_replace(regexp_replace(building_name, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'));

alter table properties
  alter column neighbourhood_slug set not null,
  alter column building_slug set not null,
  alter column building_name set not null;

create index properties_building_neighbourhood_idx
  on properties (city, neighbourhood, building_name);

alter table properties add constraint properties_url_path_unique
  unique (city, neighbourhood, building_name, slug);

create table url_redirects (
  id uuid primary key default gen_random_uuid(),
  old_path text not null unique,
  new_path text not null,
  created_at timestamptz not null default now()
);

create index url_redirects_old_path_idx on url_redirects (old_path);

-- -----------------------------------------------------------------
-- book_stays() must be recreated after the rename: 0001 defined it
-- reading v_property.name; that record field is now branded_name.
-- Kept in this migration so a fresh 0001->0018 chain stays coherent.
-- Also writes booking_groups.reference (added in 0018).
-- -----------------------------------------------------------------

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
