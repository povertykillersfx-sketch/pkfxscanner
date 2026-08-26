/** Client helpers for Telegram notify + Connect flows (Edge Functions). */

import type { TradeIdea } from './tradeIdeas'

function env(name: string): string {
  try {
    return (
      (typeof import.meta !== 'undefined' &&
        (import.meta.env[name] as string | undefined)?.trim()) ||
      ''
    )
  } catch {
    return ''
  }
}

function supabaseBase(): string {
  return env('VITE_SUPABASE_URL').replace(/\/$/, '')
}

function headers(jsonBody: boolean, extra?: Record<string, string>): HeadersInit {
  const h: Record<string, string> = { Accept: 'application/json', ...(extra || {}) }
  if (jsonBody) h['Content-Type'] = 'application/json'
  const anon = env('VITE_SUPABASE_ANON_KEY')
  if (anon) {
    h.apikey = anon
    h.Authorization = `Bearer ${anon}`
  }
  return h
}

export function telegramBotUsername(): string {
  return (env('VITE_TELEGRAM_BOT_USERNAME') || 'PovertyKillersFxBot').replace(/^@/, '')
}

/** Fire-and-forget group post after portal publish. Never throws to caller. */
export async function notifyTradeIdeaPublished(
  idea: TradeIdea,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const base = supabaseBase()
  if (!base) return { ok: false, error: 'Supabase URL missing' }

  const notifySecret = env('VITE_TELEGRAM_NOTIFY_SECRET')
  try {
    const res = await fetch(`${base}/functions/v1/telegram-notify`, {
      method: 'POST',
      headers: headers(true, notifySecret ? { 'x-pkfx-notify-secret': notifySecret } : undefined),
      body: JSON.stringify({
        idea: {
          id: idea.id,
          pair: idea.pair,
          direction: idea.direction,
          entry: idea.entry,
          stopLoss: idea.stopLoss,
          tp1: idea.tp1,
          tp2: idea.tp2,
          notes: idea.notes,
          session: idea.session,
          publishedAt: idea.publishedAt || undefined,
        },
      }),
    })
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean
      skipped?: boolean
      error?: string
    }
    if (!res.ok) return { ok: false, error: json.error || `HTTP ${res.status}` }
    return { ok: Boolean(json.ok), skipped: json.skipped }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Notify failed' }
  }
}

export async function createTelegramConnectLink(input: {
  email: string
  fullName: string
}): Promise<{ ok: boolean; url?: string; expiresAt?: string; error?: string }> {
  const base = supabaseBase()
  if (!base) return { ok: false, error: 'Supabase URL missing' }

  try {
    const res = await fetch(`${base}/functions/v1/telegram-connect`, {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({ email: input.email, fullName: input.fullName }),
    })
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean
      url?: string
      expiresAt?: string
      error?: string
    }
    if (!res.ok) return { ok: false, error: json.error || `HTTP ${res.status}` }
    return { ok: true, url: json.url, expiresAt: json.expiresAt }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Connect failed' }
  }
}

export async function fetchTelegramLinkStatus(email: string): Promise<{
  linked: boolean
  chatId?: string
  username?: string
  linkedAt?: string
  error?: string
}> {
  const base = supabaseBase()
  if (!base) return { linked: false, error: 'Supabase URL missing' }

  try {
    const res = await fetch(
      `${base}/functions/v1/telegram-connect?email=${encodeURIComponent(email)}`,
      { headers: headers(false) },
    )
    const json = (await res.json().catch(() => ({}))) as {
      linked?: boolean
      chatId?: string
      username?: string
      linkedAt?: string
      error?: string
    }
    if (!res.ok) return { linked: false, error: json.error || `HTTP ${res.status}` }
    return {
      linked: Boolean(json.linked),
      chatId: json.chatId,
      username: json.username,
      linkedAt: json.linkedAt,
    }
  } catch (err) {
    return { linked: false, error: err instanceof Error ? err.message : 'Status failed' }
  }
}

export async function disconnectTelegram(email: string): Promise<{ ok: boolean; error?: string }> {
  const base = supabaseBase()
  if (!base) return { ok: false, error: 'Supabase URL missing' }

  try {
    const res = await fetch(`${base}/functions/v1/telegram-connect`, {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({ email, action: 'disconnect' }),
    })
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
    if (!res.ok) return { ok: false, error: json.error || `HTTP ${res.status}` }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Disconnect failed' }
  }
}
