-- CheckinBliss — Property Photos & Media
-- Additive to 0001_schema.sql. PRD v2.3 §10.1, §12.1 image gallery.

begin;

-- Photo approval status — mirrors the property curation pipeline (§10.1)
do $$ begin
  create type photo_status as enum ('pending_review', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

-- Listing/gallery photos (operator-curated, editorial gateway)
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

-- Damage photo metadata (already on damage_claims.photos as jsonb array)
-- Photos array stores: [{ "storage_key": "damage-photos/<claim>/<n>.jpg", "uploaded_at": "..." }]
-- Stored in private bucket; rendered via signed URLs.

commit;
