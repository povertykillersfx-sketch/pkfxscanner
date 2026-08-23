-- Shared PKFX admin content (community, courses, ebooks, how-it-works)
-- Applied via: npx supabase db push   OR run in SQL Editor

create table if not exists public.pkfx_shared (
  id text primary key default 'default',
  community jsonb,
  courses jsonb not null default '[]'::jsonb,
  ebooks jsonb not null default '[]'::jsonb,
  how_it_works jsonb,
  updated_at timestamptz not null default now()
);

insert into public.pkfx_shared (id)
values ('default')
on conflict (id) do nothing;

alter table public.pkfx_shared enable row level security;

-- Edge Functions use the service role; anon read for clients (public community data)
drop policy if exists "pkfx_shared_select_anon" on public.pkfx_shared;
create policy "pkfx_shared_select_anon"
  on public.pkfx_shared
  for select
  to anon, authenticated
  using (true);

-- Writes go through the Edge Function (service role bypasses RLS)
drop policy if exists "pkfx_shared_no_direct_write" on public.pkfx_shared;
-- No insert/update/delete policies for anon → blocked; service role still works
