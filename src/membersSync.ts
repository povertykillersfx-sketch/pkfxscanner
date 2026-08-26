/** Cloud member sync — keeps Admin Requests in sync across devices. */

import type { UserProfile } from './auth'

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

function headers(jsonBody: boolean, admin = false): HeadersInit {
  const h: Record<string, string> = { Accept: 'application/json' }
  if (jsonBody) h['Content-Type'] = 'application/json'
  const anon = env('VITE_SUPABASE_ANON_KEY')
  if (anon) {
    h.apikey = anon
    h.Authorization = `Bearer ${anon}`
  }
  if (admin) {
    const secret = env('VITE_TELEGRAM_NOTIFY_SECRET')
    if (secret) h['x-pkfx-notify-secret'] = secret
  }
  return h
}

export async function pushMemberToCloud(
  member: UserProfile,
  opts?: { admin?: boolean },
): Promise<void> {
  const base = supabaseBase()
  if (!base || member.role === 'admin') return
  try {
    await fetch(`${base}/functions/v1/members`, {
      method: 'PUT',
      headers: headers(true, Boolean(opts?.admin)),
      body: JSON.stringify({ member }),
    })
  } catch {
    /* ignore — local store remains source on this device */
  }
}

export async function pullMembersFromCloud(): Promise<UserProfile[]> {
  const base = supabaseBase()
  if (!base) return []
  try {
    const res = await fetch(`${base}/functions/v1/members`, {
      headers: headers(false, true),
    })
    if (!res.ok) return []
    const json = (await res.json().catch(() => ({}))) as { members?: UserProfile[] }
    return Array.isArray(json.members) ? json.members : []
  } catch {
    return []
  }
}

export async function pushAllLocalMembersToCloud(
  members: UserProfile[],
): Promise<void> {
  await Promise.all(
    members
      .filter((m) => m.role !== 'admin')
      .map((m) => pushMemberToCloud(m, { admin: true })),
  )
}
  const base = supabaseBase()
  if (!base) return { ok: false, error: 'Cloud login unavailable' }
  try {
    const res = await fetch(`${base}/functions/v1/members`, {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({ action: 'login', email, password }),
    })
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean
      member?: UserProfile
      error?: string
    }
    if (!res.ok || !json.ok || !json.member) {
      return { ok: false, error: json.error || 'Invalid email or password.' }
    }
    return { ok: true, member: json.member }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Cloud login failed' }
  }
}
