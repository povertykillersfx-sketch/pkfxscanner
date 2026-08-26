/**
 * POST { idea } → post published trade idea to PKFX Telegram members group.
 * Fail-open on the client: portal publish should succeed even if this fails.
 *
 * Deploy: npx supabase functions deploy telegram-notify
 */
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabase.ts'
import { sendGroupTradeIdea, type TradeIdeaPayload } from '../_shared/telegram.ts'

function authorize(req: Request): boolean {
  const expected = Deno.env.get('TELEGRAM_NOTIFY_SECRET')?.trim()
  if (!expected) return true
  const header = req.headers.get('x-pkfx-notify-secret')?.trim() || ''
  return header === expected
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    if (!authorize(req)) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const body = (await req.json().catch(() => ({}))) as {
      idea?: Partial<TradeIdeaPayload>
      force?: boolean
    }
    const idea = body.idea
    if (!idea?.id || !idea.pair || !idea.direction) {
      return jsonResponse({ error: 'Invalid trade idea payload' }, 400)
    }

    const payload: TradeIdeaPayload = {
      id: String(idea.id),
      pair: String(idea.pair),
      direction: String(idea.direction),
      entry: String(idea.entry || ''),
      stopLoss: String(idea.stopLoss || ''),
      tp1: String(idea.tp1 || ''),
      tp2: String(idea.tp2 || ''),
      notes: String(idea.notes || ''),
      session: String(idea.session || ''),
      publishedAt: idea.publishedAt ? String(idea.publishedAt) : undefined,
    }

    const supabase = adminClient()

    if (!body.force) {
      const { data: existing } = await supabase
        .from('telegram_post_log')
        .select('idea_id, message_id')
        .eq('idea_id', payload.id)
        .maybeSingle()
      if (existing?.message_id) {
        return jsonResponse({
          ok: true,
          skipped: true,
          messageId: existing.message_id,
          reason: 'already_posted',
        })
      }
    }

    try {
      const sent = await sendGroupTradeIdea(payload)
      await supabase.from('telegram_post_log').upsert(
        {
          idea_id: payload.id,
          message_id: sent.messageId,
          posted_at: new Date().toISOString(),
          error: null,
        },
        { onConflict: 'idea_id' },
      )
      return jsonResponse({ ok: true, messageId: sent.messageId, chatId: sent.chatId })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Telegram send failed'
      await supabase.from('telegram_post_log').upsert(
        {
          idea_id: payload.id,
          message_id: null,
          posted_at: new Date().toISOString(),
          error: message,
        },
        { onConflict: 'idea_id' },
      )
      return jsonResponse({ ok: false, error: message }, 502)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Notify failed'
    return jsonResponse({ error: message }, 500)
  }
})
