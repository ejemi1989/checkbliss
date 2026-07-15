-- CheckinBliss seed data — demo inventory
-- Run AFTER 0010_seed_demo_users.sql (which creates auth users + profiles)

do $$ declare
  v_owner_id uuid;
  v_operator_id uuid;
begin
  select id into v_owner_id from public.profiles where email = 'owner@checkbliss.com' limit 1;
  select id into v_operator_id from public.profiles where email = 'operator@checkbliss.com' limit 1;

  if v_owner_id is not null then
    insert into public.properties (slug, owner_id, name, city, neighbourhood, description, amenities, route_note, bedrooms, sleeps, nightly_rate_minor, deposit_minor, extended_checkout_offered, extended_checkout_price_minor, is_featured, status) values
      ('lagoon-view-loft', v_owner_id, 'Lagoon View Loft', 'Lagos', 'Victoria Island', 'Floor-to-ceiling windows frame the lagoon from this light-filled one-bedroom loft in the heart of Victoria Island.', '["WiFi", "Air conditioning", "Washer", "Kitchen", "Balcony", "Pool access", "24/7 security"]'::jsonb, '15 min from LOS. Secure parking available.', 1, 2, 24000, 10000, true, 9600, true, 'approved') on conflict (slug) do nothing,

      ('sunset-dove', v_owner_id, 'Sunset Dove', 'Lagos', 'Ikoyi', 'A tranquil Ikoyi retreat with rooftop sunset views across Lagos.', '["WiFi", "Air conditioning", "Washer", "Kitchen", "Rooftop", "Gym", "Parking"]'::jsonb, '20 min from LOS. Off Awolowo Road.', 1, 2, 16000, 10000, true, 6400, false, 'approved') on conflict (slug) do nothing,

      ('gra-executive-suite', v_owner_id, 'GRA Executive Suite', 'Abuja', 'GRA', 'A refined two-bedroom suite in the heart of GRA, Abuja''s most prestigious district.', '["WiFi", "Air conditioning", "Washer", "Kitchen", "Terrace", "Pool", "Gym", "Parking", "Housekeeping"]'::jsonb, '30 min from ABV. In the GRA diplomatic zone.', 2, 4, 55000, 25000, true, 22000, true, 'approved') on conflict (slug) do nothing,

      ('maitama-garden-studios', v_owner_id, 'Maitama Garden Studios', 'Abuja', 'Maitama', 'Light-filled studio apartments in a lush garden compound in Maitama.', '["WiFi", "Air conditioning", "Kitchenette", "Garden", "Laundry service", "Security"]'::jsonb, '25 min from ABV. Off Yakubu Gowon Crescent.', 1, 2, 32000, 10000, false, null, false, 'approved') on conflict (slug) do nothing,

      ('central-abuja-penthouse', v_owner_id, 'Central Abuja Penthouse', 'Abuja', 'Central District', 'A dramatic penthouse on the top floor of a Central District tower with panoramic views.', '["WiFi", "Air conditioning", "Washer", "Full kitchen", "Rooftop terrace", "Pool", "Gym", "Valet parking", "Concierge"]'::jsonb, '20 min from ABV. Walking distance to Millennium Tower.', 3, 6, 75000, 30000, true, 30000, true, 'approved') on conflict (slug) do nothing;
  end if;

  if v_operator_id is not null then
    insert into public.operator_assignments (operator_id, city) values (v_operator_id, 'Lagos') on conflict do nothing;
  end if;
end $$;
