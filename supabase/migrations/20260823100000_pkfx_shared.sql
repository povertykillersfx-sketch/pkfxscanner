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

-- SPA admin publish (anon key) — single shared row only
drop policy if exists "pkfx_shared_write_anon" on public.pkfx_shared;
create policy "pkfx_shared_write_anon"
  on public.pkfx_shared
  for all
  to anon, authenticated
  using (id = 'default')
  with check (id = 'default');
