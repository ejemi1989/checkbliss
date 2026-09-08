-- 0005_search.sql
-- Availability-aware search function. where + optional date range.
-- Matches city OR neighbourhood (ilike). Excludes overlapped properties when dates given.
-- Extended to the 5-arg signature the app calls (lib/data.ts:381):
-- p_where, p_in, p_out, p_guests, p_rooms — guests filters on sleeps,
-- rooms filters on bedrooms.

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

create index if not exists properties_status_city_idx
  on properties (status, city);
