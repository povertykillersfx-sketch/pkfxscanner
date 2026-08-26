-- Welcome Pack orders + member notifications on shared PKFX content
alter table public.pkfx_shared
  add column if not exists welcome_pack_orders jsonb not null default '[]'::jsonb;

alter table public.pkfx_shared
  add column if not exists member_notifications jsonb not null default '[]'::jsonb;
