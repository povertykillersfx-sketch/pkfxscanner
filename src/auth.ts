import { DEMO_USER, avatarUrl } from './data/mockData'

export type UserRole = 'client' | 'admin'

export interface UserProfile {
  firstName: string
  fullName: string
  email: string
  password: string
  plan: string
  role: UserRole
  phone?: string
  country?: string
  mt4?: string
  status?: MemberStatus
}

export type MemberStatus = 'lead' | 'pending' | 'active'

const USERS_KEY = 'pkfx_users_v2'
const LEGACY_USERS_KEY = 'pkfx_users'
const SESSION_KEY = 'pkfx_auth'

const DEMO_EMAIL = DEMO_USER.email.toLowerCase()
const DEMO_PASSWORD = 'pkfxtest'
const ADMIN_EMAIL = 'povertykillersfx2@gmail.com'
const ADMIN_PASSWORD = 'pkfx-admin'

/** Fix common typos like "namegmail.com" → "name@gmail.com" */
export function normalizeEmail(raw: string): string {
  let email = raw.trim().toLowerCase()
  if (!email) return email
  if (!email.includes('@') && email.endsWith('gmail.com')) {
    email = `${email.slice(0, -'gmail.com'.length)}@gmail.com`
  }
  if (!email.includes('@') && email.endsWith('yahoo.com')) {
    email = `${email.slice(0, -'yahoo.com'.length)}@yahoo.com`
  }
  return email
}

function readUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as UserProfile[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((u) => u && typeof u.email === 'string' && u.email.includes('@'))
      .map((u) => ({
        ...u,
        email: u.email.toLowerCase(),
        role: u.role === 'admin' ? 'admin' : 'client',
        status: u.status || 'lead',
        password: typeof u.password === 'string' ? u.password : '',
      }))
  } catch {
    return []
  }
}

function writeUsers(users: UserProfile[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  window.dispatchEvent(new CustomEvent('pkfx-users-change', { detail: users }))
}

function migrateLegacyUsers() {
  try {
    if (localStorage.getItem(USERS_KEY)) return
    const legacy = localStorage.getItem(LEGACY_USERS_KEY)
    if (!legacy) return
    const parsed = JSON.parse(legacy) as Array<Partial<UserProfile>>
    if (!Array.isArray(parsed)) return
    const migrated = parsed
      .map((u): UserProfile | null => {
        const email = normalizeEmail(u.email || '')
        if (!email.includes('@')) return null
        return {
          firstName: u.firstName || (u.fullName || 'Trader').split(/\s+/)[0] || 'Trader',
          fullName: u.fullName || u.firstName || 'Trader',
          email,
          password: typeof u.password === 'string' ? u.password : '',
          plan: u.plan || 'free',
          role: email === ADMIN_EMAIL ? 'admin' : 'client',
          phone: u.phone,
          country: u.country,
          mt4: u.mt4,
          status: u.status || 'lead',
        }
      })
      .filter((u): u is UserProfile => u !== null)
    if (migrated.length) writeUsers(migrated)
  } catch {
    /* ignore */
  }
}

function upsertUser(users: UserProfile[], next: UserProfile): boolean {
  const idx = users.findIndex((u) => u.email.toLowerCase() === next.email.toLowerCase())
  if (idx < 0) {
    users.push(next)
    return true
  }
  const cur = users[idx]!
  const needs =
    cur.password !== next.password ||
    cur.role !== next.role ||
    cur.plan !== next.plan ||
    (next.status && cur.status !== next.status)
  if (needs) {
    users[idx] = { ...cur, ...next }
    return true
  }
  return false
}

/** Always keep demo + admin accounts working (self-heal bad localStorage). */
function ensureSeedUsers() {
  if (typeof localStorage === 'undefined') return

  migrateLegacyUsers()
  const users = readUsers()
  let changed = false

  // Force-known accounts so logins never "decline" for the official credentials
  if (
    upsertUser(users, {
      firstName: DEMO_USER.firstName,
      fullName: DEMO_USER.fullName,
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      plan: DEMO_USER.plan,
      role: 'client',
      status: 'active',
      country: '27',
      phone: '',
      mt4: '',
    })
  ) {
    changed = true
  }

  if (
    upsertUser(users, {
      firstName: 'Kamogelo',
      fullName: 'Kamogelo Dube',
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      plan: 'admin',
      role: 'admin',
      status: 'active',
      country: '27',
    })
  ) {
    changed = true
  }

  if (users.length < 8) {
    const seeds: UserProfile[] = [
      { firstName: 'Bongani', fullName: 'Bongani', email: 'bn4448007@gmail.com', password: 'lead1234', plan: 'free', role: 'client', status: 'lead', phone: '+263784492920', country: '263', mt4: '' },
      { firstName: 'SIEGFRIED', fullName: 'SIEGFRIED', email: 'siegfried@example.com', password: 'lead1234', plan: 'free', role: 'client', status: 'lead', phone: '+264811234567', country: '264', mt4: '' },
      { firstName: 'Thamsanqa', fullName: 'Thamsanqa', email: 'thamsanqa@example.com', password: 'lead1234', plan: 'free', role: 'client', status: 'lead', phone: '+27821234567', country: '27', mt4: '' },
      { firstName: 'Shaibu', fullName: 'Shaibu', email: 'shaibu@example.com', password: 'lead1234', plan: 'free', role: 'client', status: 'lead', phone: '+255712345678', country: '255', mt4: '' },
      { firstName: 'Luis', fullName: 'Luis', email: 'luis@example.com', password: 'active12', plan: 'pro', role: 'client', status: 'active', phone: '+244912345678', country: '244', mt4: 'MT5-8821' },
      { firstName: 'Nonjabulo', fullName: 'Nonjabulo', email: 'nonjabulo@example.com', password: 'lead1234', plan: 'free', role: 'client', status: 'lead', phone: '+27831112233', country: '27', mt4: '' },
    ]
    for (const seed of seeds) {
      if (!users.some((u) => u.email.toLowerCase() === seed.email.toLowerCase())) {
        users.push(seed)
        changed = true
      }
    }
  }

  if (changed) writeUsers(users)
}

ensureSeedUsers()

export function register(input: {
  fullName: string
  email: string
  password: string
}): { ok: true } | { ok: false; error: string } {
  const fullName = input.fullName.trim()
  const email = normalizeEmail(input.email)
  const password = input.password

  if (!fullName) return { ok: false, error: 'Please enter your name.' }
  if (!email || !email.includes('@')) return { ok: false, error: 'Please enter a valid email.' }
  if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }
  if (email === ADMIN_EMAIL || email === DEMO_EMAIL) {
    return { ok: false, error: 'That account already exists. Please sign in.' }
  }

  ensureSeedUsers()
  const users = readUsers()
  if (users.some((u) => u.email.toLowerCase() === email)) {
    return { ok: false, error: 'An account with this email already exists. Please sign in.' }
  }

  const firstName = fullName.split(/\s+/)[0] ?? fullName
  users.push({
    firstName,
    fullName,
    email,
    password,
    plan: 'free',
    role: 'client',
    status: 'lead',
  })
  writeUsers(users)

  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email, at: Date.now() }))
  return { ok: true }
}

export function login(
  emailInput: string,
  passwordInput: string,
): { ok: true; role: UserRole } | { ok: false; error: string } {
  const email = normalizeEmail(emailInput)
  const password = passwordInput.trim()

  if (!email) return { ok: false, error: 'Please enter your email.' }
  if (!password) return { ok: false, error: 'Please enter your password.' }

  ensureSeedUsers()
  const users = readUsers()
  let user = users.find((u) => u.email.toLowerCase() === email)

  // Last-resort hard accounts (even if storage is broken)
  if (!user && email === DEMO_EMAIL && password === DEMO_PASSWORD) {
    ensureSeedUsers()
    user = readUsers().find((u) => u.email === DEMO_EMAIL)
  }
  if (!user && email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    ensureSeedUsers()
    user = readUsers().find((u) => u.email === ADMIN_EMAIL)
  }

  // Accept official passwords even if local record was corrupted
  if (user) {
    const isDemo = user.email === DEMO_EMAIL && password === DEMO_PASSWORD
    const isAdmin = user.email === ADMIN_EMAIL && password === ADMIN_PASSWORD
    if (user.password !== password && !isDemo && !isAdmin) {
      return { ok: false, error: 'Invalid email or password.' }
    }
    if (isDemo || isAdmin) {
      user.password = password
      user.role = isAdmin ? 'admin' : 'client'
      writeUsers(users)
    }
  } else if (
    (email === DEMO_EMAIL && password === DEMO_PASSWORD) ||
    (email === ADMIN_EMAIL && password === ADMIN_PASSWORD)
  ) {
    // recreate missing official account
    const role: UserRole = email === ADMIN_EMAIL ? 'admin' : 'client'
    const fresh: UserProfile = {
      firstName: 'Kamogelo',
      fullName: 'Kamogelo Dube',
      email,
      password,
      plan: role === 'admin' ? 'admin' : 'free',
      role,
      status: 'active',
      country: '27',
    }
    users.push(fresh)
    writeUsers(users)
    user = fresh
  } else {
    return { ok: false, error: 'Invalid email or password.' }
  }

  if (!user) return { ok: false, error: 'Invalid email or password.' }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email: user.email, at: Date.now() }))
  return { ok: true, role: user.role === 'admin' ? 'admin' : 'client' }
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY)
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null
}

export function isAdmin(): boolean {
  return getCurrentUser()?.role === 'admin'
}

export function getCurrentUser(): (UserProfile & { avatar: string }) | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as { email?: string }
    if (!data.email) return null
    ensureSeedUsers()
    const users = readUsers()
    const user = users.find((u) => u.email.toLowerCase() === data.email!.toLowerCase())
    if (!user) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    return {
      ...user,
      role: user.role === 'admin' ? 'admin' : 'client',
      avatar: avatarUrl(user.firstName || user.email),
    }
  } catch {
    return null
  }
}

export function listMembers(): UserProfile[] {
  ensureSeedUsers()
  return readUsers()
    .filter((u) => u.role !== 'admin')
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
}

export function setMemberStatus(email: string, status: MemberStatus) {
  const users = readUsers()
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!user || user.role === 'admin') return
  user.status = status
  writeUsers(users)
}

export function revokeMemberAccess(email: string) {
  setMemberStatus(email, 'lead')
}

export function approveMember(email: string) {
  setMemberStatus(email, 'active')
}

export function countMembersByStatus(status: MemberStatus): number {
  return listMembers().filter((m) => (m.status || 'lead') === status).length
}

export const ADMIN_LOGIN = {
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
}

export const CLIENT_LOGIN = {
  email: DEMO_EMAIL,
  password: DEMO_PASSWORD,
}
