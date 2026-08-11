const ALLOWED_EMAIL = 'povertykillersfx@gmail.com'
const ALLOWED_PASSWORD = 'pkfxtest'
const AUTH_KEY = 'pkfx_auth'

export function login(email: string, password: string): { ok: true } | { ok: false; error: string } {
  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedEmail !== ALLOWED_EMAIL || password !== ALLOWED_PASSWORD) {
    return { ok: false, error: 'Invalid email or password.' }
  }
  sessionStorage.setItem(AUTH_KEY, JSON.stringify({ email: ALLOWED_EMAIL, at: Date.now() }))
  return { ok: true }
}

export function logout() {
  sessionStorage.removeItem(AUTH_KEY)
}

export function isAuthenticated(): boolean {
  try {
    const raw = sessionStorage.getItem(AUTH_KEY)
    if (!raw) return false
    const data = JSON.parse(raw) as { email?: string }
    return data.email === ALLOWED_EMAIL
  } catch {
    return false
  }
}
