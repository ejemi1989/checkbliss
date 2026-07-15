-- 0010_seed_demo_users.sql
-- Seeds 3 demo users matching the dev accounts. Run against
-- the real Supabase project. Passwords are hashed via Supabase's
-- crypt() function so the migration can be applied via the SQL editor.
--
-- Demo credentials (DEV ONLY — change before launch):
--   admin@checkbliss.com     / checkbliss-demo-2026
--   operator@checkbliss.com  / checkbliss-demo-2026
--   owner@checkbliss.com     / checkbliss-demo-2026

do $$ declare
  v_admin_id uuid;
  v_operator_id uuid;
  v_owner_id uuid;
  v_exists boolean;
begin
  -- admin: create auth user if missing
  select exists(select 1 from auth.users where instance_id = '00000000-0000-0000-0000-000000000000' and email = 'admin@checkbliss.com') into v_exists;
  if not v_exists then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) values
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'admin@checkbliss.com', crypt('checkbliss-demo-2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin User"}', now(), now(), '', '', '', '');
  end if;
  -- always upsert profile
  select id into v_admin_id from auth.users where instance_id = '00000000-0000-0000-0000-000000000000' and email = 'admin@checkbliss.com';
  insert into public.profiles (id, role, full_name, email, whatsapp_e164, whatsapp_opt_in, created_at) values (v_admin_id, 'admin', 'Admin User', 'admin@checkbliss.com', null, false, now()) on conflict (id) do update set role = excluded.role, full_name = excluded.full_name, email = excluded.email;

  -- operator: create auth user if missing
  select exists(select 1 from auth.users where instance_id = '00000000-0000-0000-0000-000000000000' and email = 'operator@checkbliss.com') into v_exists;
  if not v_exists then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) values
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'operator@checkbliss.com', crypt('checkbliss-demo-2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Operator User"}', now(), now(), '', '', '', '');
  end if;
  -- always upsert profile
  select id into v_operator_id from auth.users where instance_id = '00000000-0000-0000-0000-000000000000' and email = 'operator@checkbliss.com';
  insert into public.profiles (id, role, full_name, email, whatsapp_e164, whatsapp_opt_in, created_at) values (v_operator_id, 'operator', 'Operator User', 'operator@checkbliss.com', '+2348020000001', true, now()) on conflict (id) do update set role = excluded.role, full_name = excluded.full_name, email = excluded.email;
  insert into public.operator_assignments (operator_id, city) values (v_operator_id, 'Lagos') on conflict do nothing;

  -- owner: create auth user if missing
  select exists(select 1 from auth.users where instance_id = '00000000-0000-0000-0000-000000000000' and email = 'owner@checkbliss.com') into v_exists;
  if not v_exists then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) values
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'owner@checkbliss.com', crypt('checkbliss-demo-2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Owner User"}', now(), now(), '', '', '', '');
  end if;
  -- always upsert profile
  select id into v_owner_id from auth.users where instance_id = '00000000-0000-0000-0000-000000000000' and email = 'owner@checkbliss.com';
  insert into public.profiles (id, role, full_name, email, whatsapp_e164, whatsapp_opt_in, created_at) values (v_owner_id, 'owner', 'Owner User', 'owner@checkbliss.com', '+2348010000001', true, now()) on conflict (id) do update set role = excluded.role, full_name = excluded.full_name, email = excluded.email;
end $$;
