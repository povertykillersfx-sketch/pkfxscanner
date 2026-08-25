-- Trade Ideas column on shared PKFX content
alter table public.pkfx_shared
  add column if not exists trade_ideas jsonb not null default '[]'::jsonb;
