/** Telegram Bot API helpers for PKFX Edge Functions. */

import { adminClient } from './supabase.ts'

export type TradeIdeaPayload = {
  id: string
  pair: string
  direction: string
  entry: string
  stopLoss: string
  tp1: string
  tp2: string
  notes?: string
  session?: string
  publishedAt?: string
}

export type TelegramSettingsRow = {
  bot_token: string
  chat_id: string
  bot_username: string
  message_template: string
  updated_at?: string
}

export const DEFAULT_MESSAGE_TEMPLATE = `PKFX Trade Idea

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
This is not financial advice. This Trade Idea is provided for educational purposes only. Trading involves risk, and past performance does not guarantee future results. Trade at your own risk.`

export async function loadTelegramSettings(): Promise<TelegramSettingsRow> {
  const supabase = adminClient()
  const { data, error } = await supabase
    .from('telegram_settings')
    .select('bot_token, chat_id, bot_username, message_template, updated_at')
    .eq('id', 'default')
    .maybeSingle()

  if (error) throw new Error(error.message)

  const envToken = Deno.env.get('TELEGRAM_BOT_TOKEN')?.trim() || ''
  const envChat = Deno.env.get('TELEGRAM_GROUP_CHAT_ID')?.trim() || ''
  const envUser = (Deno.env.get('TELEGRAM_BOT_USERNAME') || 'PovertyKillersFxBot').replace(/^@/, '')

  if (!data) {
    return {
      bot_token: envToken,
      chat_id: envChat,
      bot_username: envUser,
      message_template: DEFAULT_MESSAGE_TEMPLATE,
    }
  }

  return {
    bot_token: data.bot_token?.trim() || envToken,
    chat_id: data.chat_id?.trim() || envChat,
    bot_username: (data.bot_username || envUser).replace(/^@/, ''),
    message_template: data.message_template?.trim() || DEFAULT_MESSAGE_TEMPLATE,
    updated_at: data.updated_at,
  }
}

export function requireTelegramEnv() {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')?.trim()
  const groupChatId = Deno.env.get('TELEGRAM_GROUP_CHAT_ID')?.trim()
  if (!token) throw new Error('Missing TELEGRAM_BOT_TOKEN')
  if (!groupChatId) throw new Error('Missing TELEGRAM_GROUP_CHAT_ID')
  return { token, groupChatId }
}

function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').trim()
  if (!cleaned) return null
  const parts = cleaned.split(/\s*[-–—to]+\s*/i).map((p) => Number(p.trim()))
  const nums = parts.filter((n) => Number.isFinite(n))
  if (nums.length === 0) return null
  if (nums.length === 1) return nums[0]!
  return (nums[0]! + nums[nums.length - 1]!) / 2
}

function formatRrRatio(ratio: number): string {
  const formatted =
    ratio >= 10 ? ratio.toFixed(1) : ratio.toFixed(2).replace(/\.?0+$/, '') || ratio.toFixed(1)
  return `1:${formatted}`
}

function riskReward(
  entryRaw: string,
  stopLossRaw: string,
  tpRaw: string,
  direction: 'Buy' | 'Sell',
): string | null {
  const entry = parsePrice(entryRaw)
  const sl = parsePrice(stopLossRaw)
  const tp = parsePrice(tpRaw)
  if (entry == null || sl == null || tp == null) return null
  const risk = direction === 'Buy' ? entry - sl : sl - entry
  const reward = direction === 'Buy' ? tp - entry : entry - tp
  if (!(risk > 0) || !(reward > 0)) return null
  return formatRrRatio(reward / risk)
}

function formatDateParts(iso?: string): { date: string; time: string } {
  const d = iso ? new Date(iso) : new Date()
  const when = Number.isNaN(d.getTime()) ? new Date() : d
  const date = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Johannesburg',
  }).format(when)
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Africa/Johannesburg',
  }).format(when)
  return { date, time }
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildVars(idea: TradeIdeaPayload): Record<string, string> {
  const direction = idea.direction === 'Sell' ? 'Sell' : 'Buy'
  const { date, time } = formatDateParts(idea.publishedAt)
  const rr1 = riskReward(idea.entry, idea.stopLoss, idea.tp1, direction) || '—'
  const rr2 = riskReward(idea.entry, idea.stopLoss, idea.tp2, direction) || '—'
  const notes = idea.notes?.trim() || ''

  return {
    pair: escapeHtml(idea.pair || ''),
    direction: escapeHtml(direction),
    direction_upper: escapeHtml(direction.toUpperCase()),
    direction_emoji: direction === 'Sell' ? '📉' : '📈',
    date: escapeHtml(date),
    time: escapeHtml(time),
    session: escapeHtml(idea.session?.trim() || ''),
    entry: escapeHtml(idea.entry?.trim() || ''),
    tp1: escapeHtml(idea.tp1?.trim() || ''),
    tp2: escapeHtml(idea.tp2?.trim() || ''),
    sl: escapeHtml(idea.stopLoss?.trim() || ''),
    stopLoss: escapeHtml(idea.stopLoss?.trim() || ''),
    rr1,
    rr2,
    notes: notes ? escapeHtml(notes) : '',
    disclaimer:
      'This is not financial advice. This Trade Idea is provided for educational purposes only. Trading involves risk, and past performance does not guarantee future results. Trade at your own risk.',
  }
}

export function renderTradeIdeaTemplate(template: string, idea: TradeIdeaPayload): string {
  const vars = buildVars(idea)
  let out = template || DEFAULT_MESSAGE_TEMPLATE
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value)
  }
  // Drop leftover empty placeholder lines that become awkward when notes empty
  out = out
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
  return out
}

/** @deprecated kept for callers; prefers template when provided */
export function formatTradeIdeaMessage(idea: TradeIdeaPayload, template?: string): string {
  return renderTradeIdeaTemplate(template || DEFAULT_MESSAGE_TEMPLATE, idea)
}

export async function telegramApi<T = unknown>(
  token: string,
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as { ok?: boolean; description?: string; result?: T }
  if (!json.ok) {
    throw new Error(json.description || `Telegram ${method} failed`)
  }
  return json.result as T
}

export async function sendGroupTradeIdea(idea: TradeIdeaPayload) {
  const settings = await loadTelegramSettings()
  const token = settings.bot_token
  const groupChatId = settings.chat_id
  if (!token) throw new Error('Telegram bot token is not configured')
  if (!groupChatId) throw new Error('Telegram chat/channel ID is not configured')

  const text = renderTradeIdeaTemplate(settings.message_template, idea)
  const result = await telegramApi<{ message_id: number }>(token, 'sendMessage', {
    chat_id: groupChatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  })
  return { messageId: String(result.message_id), chatId: groupChatId }
}
