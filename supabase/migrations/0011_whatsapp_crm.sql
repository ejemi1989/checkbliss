-- 0011_whatsapp_crm.sql
-- WhatsApp CRM layer (admin-facing inbox, contacts, pipelines, broadcasts, templates).
-- Forked design from wacrm.tech (MIT) — adapted to CheckinBliss schema and existing bot webhook.
-- The bot is the critical path; this CRM records messages and provides admin UI.
-- Bot-handled commands are auto-resolved in the inbox (status = 'resolved').

create table if not exists whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null unique,
  display_name text,
  role text,                       -- 'owner' | 'operator' | 'guest' | null
  tags text[] default '{}',         -- e.g. {'lagos', 'priority'}
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
  status text not null default 'open',  -- 'open' | 'resolved' | 'pending_human'
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
  direction text not null,        -- 'inbound' | 'outbound'
  body text not null,
  message_type text not null default 'text',  -- 'text' | 'image' | 'template' | 'command'
  wa_message_id text unique,      -- idempotency
  command_parsed text,            -- e.g. 'BLOCK', 'CLEAN' — null for non-command
  status text not null default 'sent', -- 'sent' | 'delivered' | 'read' | 'failed'
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_messages_thread on whatsapp_messages(thread_id, created_at desc);

create table if not exists whatsapp_pipelines (
  id uuid primary key default gen_random_uuid(),
  name text not null,             -- 'Property Onboarding' | 'Operator Recruitment'
  stages text[] not null,         -- ['Prospect', 'Invited', 'Photography Scheduled', 'Inspection Passed', 'Live']
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
  segment text,                   -- 'all_owners' | 'lagos_owners' | 'all_operators' | custom
  recipient_count int not null default 0,
  delivered_count int not null default 0,
  read_count int not null default 0,
  status text not null default 'draft',  -- 'draft' | 'sending' | 'sent' | 'failed'
  sent_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,      -- e.g. 'new_booking'
  display_name text not null,     -- e.g. 'New Booking'
  role text not null,             -- 'owner' | 'operator' | 'admin'
  language text not null default 'en',
  category text,                  -- 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  status text not null default 'approved',  -- 'approved' | 'pending' | 'rejected'
  body text not null,
  variables text[] default '{}',
  trigger_when text,              -- e.g. 'on new booking'
  meta_template_id text,
  last_synced_at timestamptz default now()
);

create table if not exists whatsapp_automations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trigger text not null,          -- e.g. 'new_owner_registered', 'damage_claim_overdue'
  action text not null,
  enabled boolean not null default true,
  last_run_at timestamptz,
  run_count int not null default 0,
  created_at timestamptz not null default now()
);

-- RLS: only service role can write; reads by authenticated users
alter table whatsapp_contacts enable row level security;
alter table whatsapp_threads enable row level security;
alter table whatsapp_messages enable row level security;
alter table whatsapp_pipelines enable row level security;
alter table whatsapp_deals enable row level security;
alter table whatsapp_broadcasts enable row level security;
alter table whatsapp_templates enable row level security;
alter table whatsapp_automations enable row level security;

-- Admin can read all CRM data (admin role from profiles)
create policy "admin_read_whatsapp_contacts" on whatsapp_contacts
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
create policy "admin_read_whatsapp_threads" on whatsapp_threads
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
create policy "admin_read_whatsapp_messages" on whatsapp_messages
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
create policy "admin_read_whatsapp_pipelines" on whatsapp_pipelines
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
create policy "admin_read_whatsapp_deals" on whatsapp_deals
  for select using (
    (select role from profiles where id = auth.uid()) = auth.uid() or (select role from profiles where id = auth.uid()) = 'admin'
  );
create policy "admin_read_whatsapp_broadcasts" on whatsapp_broadcasts
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
create policy "admin_read_whatsapp_templates" on whatsapp_templates
  for select using (true);  -- templates are public-facing reference
create policy "admin_read_whatsapp_automations" on whatsapp_automations
  for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );

-- Service role has full access (for bot webhook writes)
-- (granted automatically via the service role key)
