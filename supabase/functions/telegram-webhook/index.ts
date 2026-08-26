/**
 * Telegram Bot webhook — links member chat IDs via /start <token>.
 *
 * Deploy: npx supabase functions deploy telegram-webhook
 * setWebhook: https://<project>.supabase.co/functions/v1/telegram-webhook
 */
import { jsonResponse } from '../_shared/cors.ts'
import { adminClient, normalizeEmail } from '../_shared/supabase.ts'
import { loadTelegramSettings, telegramApi } from '../_shared/telegram.ts'

type TgUpdate = {
  message?: {
    text?: string
    chat?: { id?: number; username?: string; type?: string }
    from?: { username?: string; first_name?: string; last_name?: string }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return jsonResponse({ ok: true, service: 'telegram-webhook' })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const secret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')?.trim()
    if (secret) {
      const header = req.headers.get('x-telegram-bot-api-secret-token') || ''
      if (header !== secret) return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const update = (await req.json().catch(() => ({}))) as TgUpdate
    const text = update.message?.text?.trim() || ''
    const chatId = update.message?.chat?.id
    if (!text || chatId == null) return jsonResponse({ ok: true, ignored: true })

    const match = text.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i)
    if (!match) {
      return jsonResponse({ ok: true, ignored: true })
    }

    const token = (match[1] || '').trim()
    const settings = await loadTelegramSettings()
    const botToken = settings.bot_token
    if (!botToken) return jsonResponse({ error: 'Bot token not configured' }, 500)

    if (!token) {
      await telegramApi(botToken, 'sendMessage', {
        chat_id: chatId,
        text: 'Open PKFX → Profile → Connect Telegram, then tap Start from that link.',
      })
      return jsonResponse({ ok: true, needsToken: true })
    }

    const supabase = adminClient()
    const { data: row, error } = await supabase
      .from('telegram_link_tokens')
      .select('token, email, full_name, expires_at, used_at')
      .eq('token', token)
      .maybeSingle()

    if (error) return jsonResponse({ error: error.message }, 500)
    if (!row) {
      await telegramApi(botToken, 'sendMessage', {
        chat_id: chatId,
        text: 'This link is invalid. Generate a new one from your PKFX profile.',
      })
      return jsonResponse({ ok: true, invalid: true })
    }
    if (row.used_at) {
      await telegramApi(botToken, 'sendMessage', {
        chat_id: chatId,
        text: 'This link was already used. You can disconnect and reconnect from PKFX if needed.',
      })
      return jsonResponse({ ok: true, used: true })
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await telegramApi(botToken, 'sendMessage', {
        chat_id: chatId,
        text: 'This link expired. Open PKFX → Profile → Connect Telegram again.',
      })
      return jsonResponse({ ok: true, expired: true })
    }

    const email = normalizeEmail(row.email)
    const username = update.message?.from?.username || update.message?.chat?.username || null
    const now = new Date().toISOString()

    const { error: upsertError } = await supabase.from('member_telegram').upsert(
      {
        email,
        chat_id: String(chatId),
        username,
        full_name: row.full_name || '',
        linked_at: now,
        updated_at: now,
      },
      { onConflict: 'email' },
    )
    if (upsertError) return jsonResponse({ error: upsertError.message }, 500)

    await supabase
      .from('telegram_link_tokens')
      .update({ used_at: now })
      .eq('token', token)

    await telegramApi(botToken, 'sendMessage', {
      chat_id: chatId,
      text: `Connected to PKFX as ${email}. You’ll stay linked for member features. Trade ideas are posted in the members group.`,
    })

    return jsonResponse({ ok: true, linked: true, email })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook failed'
    return jsonResponse({ error: message }, 500)
  }
})
