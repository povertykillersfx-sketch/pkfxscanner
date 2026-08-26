-- Editable Telegram notification settings (admin-managed via Edge Function)

create table if not exists public.telegram_settings (
  id text primary key default 'default',
  bot_token text not null default '',
  chat_id text not null default '',
  bot_username text not null default 'PovertyKillersFxBot',
  message_template text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.telegram_settings enable row level security;

insert into public.telegram_settings (id, bot_token, chat_id, bot_username, message_template)
values (
  'default',
  '',
  '',
  'PovertyKillersFxBot',
  $tmpl$PKFX Trade Idea

{{pair}} — {{direction_upper}} {{direction_emoji}}

📅 Date: {{date}}
⏰ Time: {{time}}
🌍 Session: {{session}}

Entry: {{entry}}

🎯 TP1: {{tp1}}
🎯 TP2: {{tp2}}
❌ SL: {{sl}}

Risk/Reward:
TP1 → {{rr1}}
TP2 → {{rr2}}

{{notes}}

⚠️ Disclaimer:
This is not financial advice. This Trade Idea is provided for educational purposes only. Trading involves risk, and past performance does not guarantee future results. Trade at your own risk.$tmpl$
)
on conflict (id) do nothing;
