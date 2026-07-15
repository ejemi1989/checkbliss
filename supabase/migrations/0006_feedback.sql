-- Feedback requests (post-checkout)

create table feedback_requests (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  feedback_token text not null unique,
  status text not null default 'pending',
  trustpilot_url text,
  internal_feedback_url text,
  guest_rating text check (guest_rating in ('good', 'bad')),
  guest_comments text,
  notified_admin_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_feedback_requests_reservation on feedback_requests(reservation_id);
create index idx_feedback_requests_status on feedback_requests(status);
