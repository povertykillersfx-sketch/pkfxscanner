-- Cloud member profiles so Admin Requests work across devices

create table if not exists public.pkfx_members (
  email text primary key,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists pkfx_members_status_idx
  on public.pkfx_members ((profile->>'status'));

create index if not exists pkfx_members_updated_idx
  on public.pkfx_members (updated_at desc);

alter table public.pkfx_members enable row level security;
-- No anon policies: Edge Functions use the service role only.
