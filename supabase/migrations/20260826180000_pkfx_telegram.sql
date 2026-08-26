-- Telegram link tokens + member Telegram chat IDs (server-side only)

create table if not exists public.telegram_link_tokens (
  token text primary key,
  email text not null,
  full_name text not null default '',
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists telegram_link_tokens_email_idx
  on public.telegram_link_tokens (email);

create table if not exists public.member_telegram (
  email text primary key,
  chat_id text not null,
  username text,
  full_name text not null default '',
  linked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_telegram_chat_id_idx
  on public.member_telegram (chat_id);

create table if not exists public.telegram_post_log (
  idea_id text primary key,
  message_id text,
  posted_at timestamptz not null default now(),
  error text
);

alter table public.telegram_link_tokens enable row level security;
alter table public.member_telegram enable row level security;
alter table public.telegram_post_log enable row level security;

-- No anon policies: only service role (Edge Functions) may access these tables.
