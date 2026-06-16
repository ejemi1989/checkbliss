-- CheckinBliss seed data — demo inventory

-- Demo profiles
insert into profiles (id, role, full_name, email, whatsapp_e164, whatsapp_opt_in) values
  ('00000000-0000-0000-0000-000000000001', 'admin', 'Admin User', 'admin@checkinbliss.com', null, false),
  ('00000000-0000-0000-0000-000000000002', 'owner', 'Adaora Mensah', 'a.mensah@checkinbliss.com', '+2348010000001', true),
  ('00000000-0000-0000-0000-000000000003', 'operator', 'Tunde Ogunlade', 'tunde.o@checkinbliss.com', '+2348020000001', true)
on conflict (id) do nothing;

-- Operator assignments
insert into operator_assignments (operator_id, city) values
  ('00000000-0000-0000-0000-000000000003', 'Lagos')
on conflict do nothing;

-- Properties
insert into properties (id, slug, owner_id, name, city, neighbourhood, description, amenities, route_note, bedrooms, sleeps, nightly_rate_minor, deposit_minor, extended_checkout_offered, extended_checkout_price_minor, is_featured, status) values
  (gen_random_uuid(), 'lagoon-view-loft', '00000000-0000-0000-0000-000000000002', 'Lagoon View Loft', 'Lagos', 'Victoria Island',
   'Floor-to-ceiling windows frame the lagoon from this light-filled one-bedroom loft in the heart of Victoria Island.',
   '["WiFi", "Air conditioning", "Washer", "Kitchen", "Balcony", "Pool access", "24/7 security"]'::jsonb,
   '15 min from LOS. Secure parking available.', 1, 2, 24000, 10000, true, 9600, true, 'approved'),

  (gen_random_uuid(), 'sunset-dove', '00000000-0000-0000-0000-000000000002', 'Sunset Dove', 'Lagos', 'Ikoyi',
   'A tranquil Ikoyi retreat with rooftop sunset views across Lagos.',
   '["WiFi", "Air conditioning", "Washer", "Kitchen", "Rooftop", "Gym", "Parking"]'::jsonb,
   '20 min from LOS. Off Awolowo Road.', 1, 2, 16000, 10000, true, 6400, false, 'approved'),

  (gen_random_uuid(), 'gra-executive-suite', '00000000-0000-0000-0000-000000000002', 'GRA Executive Suite', 'Abuja', 'GRA',
   'A refined two-bedroom suite in the heart of GRA, Abuja''s most prestigious district.',
   '["WiFi", "Air conditioning", "Washer", "Kitchen", "Terrace", "Pool", "Gym", "Parking", "Housekeeping"]'::jsonb,
   '30 min from ABV. In the GRA diplomatic zone.', 2, 4, 55000, 25000, true, 22000, true, 'approved'),

  (gen_random_uuid(), 'maitama-garden-studios', '00000000-0000-0000-0000-000000000002', 'Maitama Garden Studios', 'Abuja', 'Maitama',
   'Light-filled studio apartments in a lush garden compound in Maitama.',
   '["WiFi", "Air conditioning", "Kitchenette", "Garden", "Laundry service", "Security"]'::jsonb,
   '25 min from ABV. Off Yakubu Gowon Crescent.', 1, 2, 32000, 10000, false, null, false, 'approved'),

  (gen_random_uuid(), 'central-abuja-penthouse', '00000000-0000-0000-0000-000000000002', 'Central Abuja Penthouse', 'Abuja', 'Central District',
   'A dramatic penthouse on the top floor of a Central District tower with panoramic views.',
   '["WiFi", "Air conditioning", "Washer", "Full kitchen", "Rooftop terrace", "Pool", "Gym", "Valet parking", "Concierge"]'::jsonb,
   '20 min from ABV. Walking distance to Millennium Tower.', 3, 6, 75000, 30000, true, 30000, true, 'approved')
on conflict (slug) do nothing;
