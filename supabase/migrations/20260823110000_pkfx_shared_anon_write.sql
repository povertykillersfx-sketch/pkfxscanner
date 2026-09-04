-- Allow the PKFX SPA (anon key) to read/write the single shared row.
-- Run this in Supabase SQL Editor if admin saves fail with RLS errors.
-- Safe for this app’s current model (client-side admin + public community data).

drop policy if exists "pkfx_shared_write_anon" on public.pkfx_shared;
create policy "pkfx_shared_write_anon"
  on public.pkfx_shared
  for all
  to anon, authenticated
  using (id = 'default')
  with check (id = 'default');
