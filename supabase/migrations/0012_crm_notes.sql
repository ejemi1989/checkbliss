-- 0012_crm_notes.sql
-- CheckinBliss WhatsApp CRM — minimal schema additions.
-- The CRM is a read layer on top of the existing bot. It only writes to crm_notes
-- (admin internal notes) and crm_thread_status (manual resolve/escalate).
-- Everything else reads from existing tables (audit_log, owners, operators, damage_claims, inspection_schedule).

create table if not exists crm_notes (
  id uuid primary key default gen_random_uuid(),
  contact_e164 text not null,
  note text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_crm_notes_contact on crm_notes(contact_e164, created_at desc);

alter table crm_notes enable row level security;

create policy "admin_read_crm_notes" on crm_notes
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );

create policy "admin_insert_crm_notes" on crm_notes
  for insert with check (
    (select role from profiles where id = auth.uid()) = 'admin'
  );

create policy "admin_delete_crm_notes" on crm_notes
  for delete using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );

create table if not exists crm_thread_status (
  contact_e164 text primary key,
  status text not null default 'open',  -- 'open' | 'resolved' | 'escalated'
  updated_at timestamptz not null default now(),
  updated_by text not null
);

alter table crm_thread_status enable row level security;

create policy "admin_read_crm_thread_status" on crm_thread_status
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );

create policy "admin_upsert_crm_thread_status" on crm_thread_status
  for insert with check (
    (select role from profiles where id = auth.uid()) = 'admin'
  );

create policy "admin_update_crm_thread_status" on crm_thread_status
  for update using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
