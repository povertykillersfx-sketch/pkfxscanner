/**
 * PKFX members sync — signup/payment/approval across devices.
 *
 * GET              → list all client profiles (admin; requires notify secret)
 * GET ?email=      → one profile (no password) for status checks
 * PUT { member }   → upsert one member profile
 * POST { action: "login", email, password } → validate credentials against cloud
 *
 * Deploy: npx supabase functions deploy members
 */
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { adminClient, normalizeEmail } from '../_shared/supabase.ts'

type MemberProfile = {
  firstName?: string
  surname?: string
  fullName?: string
  email: string
  password?: string
  plan?: string
  role?: string
  phone?: string
  country?: string
  mt4?: string
  status?: string
  joinedAt?: string
  telegramChatId?: string
  telegramUsername?: string
  telegramLinkedAt?: string
}

function authorizeAdmin(req: Request): boolean {
  const expected = Deno.env.get('TELEGRAM_NOTIFY_SECRET')?.trim()
  if (!expected) return true
  const header = req.headers.get('x-pkfx-notify-secret')?.trim() || ''
  return header === expected
}

function sanitize(profile: MemberProfile, opts?: { includePassword?: boolean }): MemberProfile {
  const email = normalizeEmail(profile.email || '')
  const out: MemberProfile = {
    firstName: profile.firstName || '',
    surname: profile.surname || '',
    fullName: profile.fullName || '',
    email,
    plan: profile.plan || 'free',
    role: profile.role === 'admin' ? 'admin' : 'client',
    phone: profile.phone || '',
    country: profile.country || '',
    mt4: profile.mt4 || '',
    status: profile.status || 'lead',
    joinedAt: profile.joinedAt || new Date().toISOString(),
    telegramChatId: profile.telegramChatId,
    telegramUsername: profile.telegramUsername,
    telegramLinkedAt: profile.telegramLinkedAt,
  }
  if (opts?.includePassword) out.password = typeof profile.password === 'string' ? profile.password : ''
  return out
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req)
  if (preflight) return preflight

  try {
    const supabase = adminClient()

    if (req.method === 'GET') {
      const email = normalizeEmail(new URL(req.url).searchParams.get('email') || '')

      if (email) {
        const { data, error } = await supabase
          .from('pkfx_members')
          .select('profile, updated_at')
          .eq('email', email)
          .maybeSingle()
        if (error) return jsonResponse({ error: error.message }, 500)
        if (!data?.profile) return jsonResponse({ member: null })
        const member = sanitize(data.profile as MemberProfile)
        return jsonResponse({ member, updatedAt: data.updated_at })
      }

      if (!authorizeAdmin(req)) return jsonResponse({ error: 'Unauthorized' }, 401)

      const { data, error } = await supabase
        .from('pkfx_members')
        .select('profile, updated_at')
        .order('updated_at', { ascending: false })

      if (error) return jsonResponse({ error: error.message }, 500)

      const members = (data || [])
        .map((row) => sanitize({ ...(row.profile as MemberProfile), password: (row.profile as MemberProfile).password }, { includePassword: true }))
        .filter((m) => m.email && m.role !== 'admin')

      return jsonResponse({ members, updatedAt: new Date().toISOString() })
    }

    if (req.method === 'PUT') {
      const body = (await req.json().catch(() => ({}))) as { member?: MemberProfile }
      if (!body.member?.email) return jsonResponse({ error: 'member.email required' }, 400)

      const incoming = sanitize(body.member, { includePassword: true })
      if (!incoming.email || incoming.role === 'admin') {
        return jsonResponse({ error: 'Invalid member' }, 400)
      }

      const { data: existing } = await supabase
        .from('pkfx_members')
        .select('profile')
        .eq('email', incoming.email)
        .maybeSingle()

      const prev = (existing?.profile || {}) as MemberProfile
      // Public upserts cannot invent admin accounts; preserve password if omitted
      const password =
        typeof body.member.password === 'string' && body.member.password.length > 0
          ? body.member.password
          : typeof prev.password === 'string'
            ? prev.password
            : ''

      // Don't let anonymous callers approve themselves or demote an approved member
      let status = incoming.status || 'lead'
      if (!authorizeAdmin(req)) {
        if (prev.status === 'active') status = 'active'
        else if (prev.status === 'revoked') status = 'revoked'
        else if (status === 'active') status = prev.status || 'lead'
      }

      const merged: MemberProfile = {
        ...prev,
        ...incoming,
        email: incoming.email,
        password,
        status,
        role: 'client',
      }

      const updatedAt = new Date().toISOString()
      const { error } = await supabase.from('pkfx_members').upsert(
        {
          email: merged.email,
          profile: merged,
          updated_at: updatedAt,
        },
        { onConflict: 'email' },
      )
      if (error) return jsonResponse({ error: error.message }, 500)

      return jsonResponse({ ok: true, member: sanitize(merged), updatedAt })
    }

    if (req.method === 'POST') {
      const body = (await req.json().catch(() => ({}))) as {
        action?: string
        email?: string
        password?: string
      }

      if (body.action === 'login') {
        const email = normalizeEmail(body.email || '')
        const password = String(body.password || '')
        if (!email || !password) return jsonResponse({ error: 'Email and password required' }, 400)

        const { data, error } = await supabase
          .from('pkfx_members')
          .select('profile')
          .eq('email', email)
          .maybeSingle()
        if (error) return jsonResponse({ error: error.message }, 500)

        const profile = data?.profile as MemberProfile | undefined
        if (!profile || profile.password !== password) {
          return jsonResponse({ ok: false, error: 'Invalid email or password.' }, 401)
        }

        return jsonResponse({
          ok: true,
          member: sanitize(profile, { includePassword: true }),
        })
      }

      if (body.action === 'approve' || body.action === 'revoke') {
        if (!authorizeAdmin(req)) return jsonResponse({ error: 'Unauthorized' }, 401)
        const email = normalizeEmail(body.email || '')
        if (!email) return jsonResponse({ error: 'email required' }, 400)

        const { data, error } = await supabase
          .from('pkfx_members')
          .select('profile')
          .eq('email', email)
          .maybeSingle()
        if (error) return jsonResponse({ error: error.message }, 500)
        if (!data?.profile) return jsonResponse({ error: 'Member not found' }, 404)

        const profile = { ...(data.profile as MemberProfile) }
        if (body.action === 'approve') {
          profile.status = 'active'
          profile.plan = 'Inner Circle'
          if (!profile.joinedAt) profile.joinedAt = new Date().toISOString()
        } else {
          profile.status = 'revoked'
          profile.plan = 'free'
        }

        const updatedAt = new Date().toISOString()
        const { error: upErr } = await supabase.from('pkfx_members').upsert(
          { email, profile, updated_at: updatedAt },
          { onConflict: 'email' },
        )
        if (upErr) return jsonResponse({ error: upErr.message }, 500)
        return jsonResponse({ ok: true, member: sanitize(profile, { includePassword: true }), updatedAt })
      }

      return jsonResponse({ error: 'Unknown action' }, 400)
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Members sync failed'
    return jsonResponse({ error: message }, 500)
  }
})
