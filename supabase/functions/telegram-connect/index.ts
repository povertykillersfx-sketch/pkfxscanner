/**
 * Member Telegram connect:
 * POST { email, fullName } → { url, token, expiresAt }
 * GET  ?email= → { linked, chatId, username, linkedAt }
 *
 * Deploy: npx supabase functions deploy telegram-connect
 */
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { adminClient, normalizeEmail } from '../_shared/supabase.ts'

function botUsername(): string {
  return (Deno.env.get('TELEGRAM_BOT_USERNAME') || 'PovertyKillersFxBot').replace(/^@/, '')
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req)
  if (preflight) return preflight

  try {
    const supabase = adminClient()

    if (req.method === 'GET') {
      const email = normalizeEmail(new URL(req.url).searchParams.get('email') || '')
      if (!email) return jsonResponse({ error: 'email required' }, 400)

      const { data, error } = await supabase
        .from('member_telegram')
        .select('email, chat_id, username, full_name, linked_at')
        .eq('email', email)
        .maybeSingle()

      if (error) return jsonResponse({ error: error.message }, 500)
      if (!data) return jsonResponse({ linked: false })

      return jsonResponse({
        linked: true,
        chatId: data.chat_id,
        username: data.username,
        fullName: data.full_name,
        linkedAt: data.linked_at,
      })
    }

    if (req.method === 'POST') {
      const body = (await req.json().catch(() => ({}))) as {
        email?: string
        fullName?: string
        action?: 'connect' | 'disconnect'
      }
      const email = normalizeEmail(body.email || '')
      if (!email) return jsonResponse({ error: 'email required' }, 400)

      if (body.action === 'disconnect') {
        await supabase.from('member_telegram').delete().eq('email', email)
        return jsonResponse({ ok: true, linked: false })
      }

      const token = randomToken()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
      const fullName = (body.fullName || '').trim()

      const { error } = await supabase.from('telegram_link_tokens').insert({
        token,
        email,
        full_name: fullName,
        expires_at: expiresAt,
      })
      if (error) return jsonResponse({ error: error.message }, 500)

      const url = `https://t.me/${botUsername()}?start=${token}`
      return jsonResponse({ ok: true, token, url, expiresAt })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connect failed'
    return jsonResponse({ error: message }, 500)
  }
})
