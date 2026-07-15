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
