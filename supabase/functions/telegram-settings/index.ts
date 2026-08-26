/**
 * Admin Telegram notification settings.
 * GET  → current bot token, chat id, template
 * PUT  → save settings
 * POST { action: "test" } → send a sample message with current/draft settings
 *
 * Deploy: npx supabase functions deploy telegram-settings
 */
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabase.ts'
import {
  DEFAULT_MESSAGE_TEMPLATE,
  loadTelegramSettings,
  telegramApi,
  renderTradeIdeaTemplate,
  type TradeIdeaPayload,
} from '../_shared/telegram.ts'

function authorize(req: Request): boolean {
  const expected = Deno.env.get('TELEGRAM_NOTIFY_SECRET')?.trim()
  if (!expected) return true
  const header = req.headers.get('x-pkfx-notify-secret')?.trim() || ''
  return header === expected
}

function sampleIdea(): TradeIdeaPayload {
  return {
    id: 'ti_preview',
    pair: 'XAUUSD',
    direction: 'Buy',
    entry: '2650',
    stopLoss: '2640',
    tp1: '2660',
    tp2: '2675',
    session: 'London',
    notes: '',
    publishedAt: new Date().toISOString(),
  }
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req)
  if (preflight) return preflight

  try {
    if (!authorize(req)) return jsonResponse({ error: 'Unauthorized' }, 401)

    if (req.method === 'GET') {
      const settings = await loadTelegramSettings()
      return jsonResponse({
        botToken: settings.bot_token,
        chatId: settings.chat_id,
        botUsername: settings.bot_username,
        messageTemplate: settings.message_template || DEFAULT_MESSAGE_TEMPLATE,
        updatedAt: settings.updated_at || null,
        placeholders: [
          'pair',
          'direction',
          'direction_upper',
          'direction_emoji',
          'date',
          'time',
          'session',
          'entry',
          'tp1',
          'tp2',
          'sl',
          'rr1',
          'rr2',
          'notes',
          'disclaimer',
        ],
      })
    }

    if (req.method === 'PUT') {
      const body = (await req.json().catch(() => ({}))) as {
        botToken?: string
        chatId?: string
        botUsername?: string
        messageTemplate?: string
      }

      const botToken = String(body.botToken ?? '').trim()
      const chatId = String(body.chatId ?? '').trim()
      const botUsername = String(body.botUsername || 'PovertyKillersFxBot')
        .trim()
        .replace(/^@/, '')
      const messageTemplate = String(body.messageTemplate ?? '').trim() || DEFAULT_MESSAGE_TEMPLATE
      const updatedAt = new Date().toISOString()

      const supabase = adminClient()
      const { error } = await supabase.from('telegram_settings').upsert(
        {
          id: 'default',
          bot_token: botToken,
          chat_id: chatId,
          bot_username: botUsername,
          message_template: messageTemplate,
          updated_at: updatedAt,
        },
        { onConflict: 'id' },
      )
      if (error) return jsonResponse({ error: error.message }, 500)

      return jsonResponse({
        ok: true,
        botToken,
        chatId,
        botUsername,
        messageTemplate,
        updatedAt,
      })
    }

    if (req.method === 'POST') {
      const body = (await req.json().catch(() => ({}))) as {
        action?: string
        botToken?: string
        chatId?: string
        messageTemplate?: string
      }

      if (body.action !== 'test') {
        return jsonResponse({ error: 'Unknown action' }, 400)
      }

      const saved = await loadTelegramSettings()
      const token = String(body.botToken ?? saved.bot_token).trim()
      const chatId = String(body.chatId ?? saved.chat_id).trim()
      const template = String(body.messageTemplate ?? saved.message_template).trim() ||
        DEFAULT_MESSAGE_TEMPLATE

      if (!token || !chatId) {
        return jsonResponse({ error: 'Add Bot Token and Chat/Channel ID first.' }, 400)
      }

      const text = renderTradeIdeaTemplate(template, sampleIdea())
      const result = await telegramApi<{ message_id: number }>(token, 'sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      })

      return jsonResponse({
        ok: true,
        messageId: String(result.message_id),
        chatId,
        preview: text,
      })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Settings failed'
    return jsonResponse({ error: message }, 500)
  }
})
