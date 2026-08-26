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
}

export function requireTelegramEnv() {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')?.trim()
  const groupChatId = Deno.env.get('TELEGRAM_GROUP_CHAT_ID')?.trim()
  if (!token) throw new Error('Missing TELEGRAM_BOT_TOKEN')
  if (!groupChatId) throw new Error('Missing TELEGRAM_GROUP_CHAT_ID')
  return { token, groupChatId }
}

export function formatTradeIdeaMessage(idea: TradeIdeaPayload): string {
  const dir = idea.direction === 'Sell' ? 'Sell' : 'Buy'
  const lines = [
    `<b>PKFX Trade Idea</b>`,
    ``,
    `<b>${escapeHtml(idea.pair)}</b> — ${escapeHtml(dir)}`,
  ]
  if (idea.session) lines.push(`Session: <b>${escapeHtml(idea.session)}</b>`)
  if (idea.entry) lines.push(`Entry: <code>${escapeHtml(idea.entry)}</code>`)
  if (idea.tp1) lines.push(`TP1: <code>${escapeHtml(idea.tp1)}</code>`)
  if (idea.tp2) lines.push(`TP2: <code>${escapeHtml(idea.tp2)}</code>`)
  if (idea.stopLoss) lines.push(`SL: <code>${escapeHtml(idea.stopLoss)}</code>`)
  if (idea.notes?.trim()) {
    lines.push(``)
    lines.push(escapeHtml(idea.notes.trim()))
  }
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
