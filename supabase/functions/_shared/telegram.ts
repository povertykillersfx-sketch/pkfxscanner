/** Telegram Bot API helpers for PKFX Edge Functions. */

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

export function formatTradeIdeaMessage(idea: TradeIdeaPayload): string {
  const direction = idea.direction === 'Sell' ? 'Sell' : 'Buy'
  const dirLabel = direction.toUpperCase()
  const dirEmoji = direction === 'Sell' ? '📉' : '📈'
  const { date, time } = formatDateParts(idea.publishedAt)
  const rr1 = riskReward(idea.entry, idea.stopLoss, idea.tp1, direction)
  const rr2 = riskReward(idea.entry, idea.stopLoss, idea.tp2, direction)

  const lines = [
    `<b>PKFX Trade Idea</b>`,
    ``,
    `<b>${escapeHtml(idea.pair)}</b> — <b>${dirLabel}</b> ${dirEmoji}`,
    ``,
    `📅 Date: ${escapeHtml(date)}`,
    `⏰ Time: ${escapeHtml(time)}`,
  ]

  if (idea.session?.trim()) {
    lines.push(`🌍 Session: ${escapeHtml(idea.session.trim())}`)
  }

  lines.push(``)
  if (idea.entry?.trim()) lines.push(`Entry: ${escapeHtml(idea.entry.trim())}`)
  lines.push(``)
  if (idea.tp1?.trim()) lines.push(`🎯 TP1: ${escapeHtml(idea.tp1.trim())}`)
  if (idea.tp2?.trim()) lines.push(`🎯 TP2: ${escapeHtml(idea.tp2.trim())}`)
  if (idea.stopLoss?.trim()) lines.push(`❌ SL: ${escapeHtml(idea.stopLoss.trim())}`)

  if (rr1 || rr2) {
    lines.push(``)
    lines.push(`<b>Risk/Reward:</b>`)
    if (rr1) lines.push(`TP1 → ${rr1}`)
    if (rr2) lines.push(`TP2 → ${rr2}`)
  }

  if (idea.notes?.trim()) {
    lines.push(``)
    lines.push(escapeHtml(idea.notes.trim()))
  }

  lines.push(``)
  lines.push(`⚠️ <b>Disclaimer:</b>`)
  lines.push(
    `This is not financial advice. This Trade Idea is provided for educational purposes only. Trading involves risk, and past performance does not guarantee future results. Trade at your own risk.`,
  )

  return lines.join('\n')
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
  const { token, groupChatId } = requireTelegramEnv()
  const text = formatTradeIdeaMessage(idea)
  const result = await telegramApi<{ message_id: number }>(token, 'sendMessage', {
    chat_id: groupChatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  })
  return { messageId: String(result.message_id), chatId: groupChatId }
}
