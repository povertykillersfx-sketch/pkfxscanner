import { avatarUrl } from './data/mockData'

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
  /** ISO timestamp when the client registered */
  joinedAt?: string
}

export type MemberStatus = 'lead' | 'pending' | 'active'

/** Live empty slate — only the super admin is seeded */
const USERS_KEY = 'pkfx_users_live_v1'
const SESSION_KEY = 'pkfx_auth'
const WIPE_FLAG = 'pkfx_live_wipe_v1'
const PURGE_EMAILS_FLAG = 'pkfx_purge_emails_v2'

const ADMIN_EMAIL = 'povertykillersfx2@gmail.com'
const ADMIN_PASSWORD = 'pkfx-admin'

/** Primary client account for the owner (same browser local store as admin) */
const OWNER_CLIENT_EMAIL = 'povertykillersfx@gmail.com'
const OWNER_CLIENT_PASSWORD = 'pkfx-client'

const LEGACY_KEYS = [
  'pkfx_users',
  'pkfx_users_v2',
  'pkfx_admin_requests',
  'pkfx_admin_courses',
  'pkfx_admin_ebooks',
  'pkfx_admin_telegram',
]

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

function wipeLegacyDemoData() {
  if (typeof localStorage === 'undefined') return
  if (localStorage.getItem(WIPE_FLAG) === '1') return
  for (const key of LEGACY_KEYS) {
    localStorage.removeItem(key)
  }
  // Start live users store empty (admin re-seeded next)
  localStorage.removeItem(USERS_KEY)
  // Also clear any previous live admin content so tutorials/requests start empty
  localStorage.removeItem('pkfx_admin_requests_live_v1')
  localStorage.removeItem('pkfx_admin_courses_live_v1')
  localStorage.removeItem('pkfx_admin_ebooks_live_v1')
  localStorage.removeItem('pkfx_admin_telegram_live_v1')
  localStorage.setItem(WIPE_FLAG, '1')
}

/** One-time removals so specific emails can sign up again. */
function purgeRequestedEmails() {
  if (typeof localStorage === 'undefined') return
  if (localStorage.getItem(PURGE_EMAILS_FLAG) === '1') return
  const toRemove = new Set(['mukundimukhuba8@gmail.com'])
  const users = readUsers()
  const next = users.filter((u) => !toRemove.has(u.email.toLowerCase()))
  if (next.length !== users.length) {
    writeUsers(next)
  }
  // Clear session if it belonged to a purged user
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) {
      const data = JSON.parse(raw) as { email?: string }
      if (data.email && toRemove.has(data.email.toLowerCase())) {
        sessionStorage.removeItem(SESSION_KEY)
      }
    }
  } catch {
    /* ignore */
  }
  localStorage.setItem(PURGE_EMAILS_FLAG, '1')
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

/** Keep the super admin account. Wipe old demo data once. Do not delete real clients. */
function ensureAdminUser() {
  if (typeof localStorage === 'undefined') return
  wipeLegacyDemoData()
  purgeRequestedEmails()

  const users = readUsers()
  let changed = false

  const admin: UserProfile = {
    firstName: 'Kamogelo',
    fullName: 'Kamogelo Dube',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    plan: 'admin',
    role: 'admin',
    status: 'active',
    country: '27',
  }

  const adminIdx = users.findIndex((u) => u.email === ADMIN_EMAIL)
  if (adminIdx < 0) {
    users.push(admin)
    changed = true
  } else {
    const cur = users[adminIdx]!
    if (cur.password !== ADMIN_PASSWORD || cur.role !== 'admin') {
      users[adminIdx] = { ...cur, ...admin }
      changed = true
    }
  }

  // Ensure the owner's client login always exists (active / approved)
  const clientIdx = users.findIndex((u) => u.email === OWNER_CLIENT_EMAIL)
  if (clientIdx < 0) {
    users.push({
      firstName: 'Kamogelo',
      fullName: 'Kamogelo Dube',
      email: OWNER_CLIENT_EMAIL,
      password: OWNER_CLIENT_PASSWORD,
      plan: 'pro',
      role: 'client',
      status: 'active',
      country: 'South Africa',
      joinedAt: new Date().toISOString(),
    })
    changed = true
  } else {
    const cur = users[clientIdx]!
    if (
      cur.role !== 'client' ||
      cur.password !== OWNER_CLIENT_PASSWORD ||
      cur.status !== 'active' ||
      cur.plan === 'admin'
    ) {
      users[clientIdx] = {
        ...cur,
        role: 'client',
        password: OWNER_CLIENT_PASSWORD,
        status: 'active',
        plan: cur.plan === 'admin' || cur.plan === 'free' ? 'pro' : cur.plan,
      }
      changed = true
    }
  }

  if (changed) writeUsers(users)
}

ensureAdminUser()

export function register(input: {
  fullName: string
  email: string
  password: string
}): { ok: true } | { ok: false; error: string } {
  const fullName = input.fullName.trim()
  const email = normalizeEmail(input.email)
  const password = input.password.trim()

  if (!fullName) return { ok: false, error: 'Please enter your name.' }
  if (!email || !email.includes('@')) return { ok: false, error: 'Please enter a valid email.' }
  if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }
  if (email === ADMIN_EMAIL) {
    return { ok: false, error: 'That account already exists. Please sign in.' }
  }

  ensureAdminUser()
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
    // New signups wait for admin approval (Requests KPI)
    status: 'pending',
    joinedAt: new Date().toISOString(),
  })
  writeUsers(users)

  // Do NOT start a session — Super Admin must approve first
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

  ensureAdminUser()
  const users = readUsers()
  let user = users.find((u) => u.email.toLowerCase() === email)

  // Self-heal admin account
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    if (!user) {
      user = {
        firstName: 'Kamogelo',
        fullName: 'Kamogelo Dube',
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        plan: 'admin',
        role: 'admin',
        status: 'active',
        country: '27',
      }
      users.push(user)
      writeUsers(users)
    } else {
      user.password = ADMIN_PASSWORD
      user.role = 'admin'
      writeUsers(users)
    }
  } else if (email === OWNER_CLIENT_EMAIL && password === OWNER_CLIENT_PASSWORD) {
    // Self-heal owner client login
    if (!user) {
      user = {
        firstName: 'Kamogelo',
        fullName: 'Kamogelo Dube',
        email: OWNER_CLIENT_EMAIL,
        password: OWNER_CLIENT_PASSWORD,
        plan: 'pro',
        role: 'client',
        status: 'active',
        country: 'South Africa',
        joinedAt: new Date().toISOString(),
      }
      users.push(user)
      writeUsers(users)
    } else {
      user.password = OWNER_CLIENT_PASSWORD
      user.role = 'client'
      user.status = 'active'
      writeUsers(users)
    }
  } else if (!user) {
    return { ok: false, error: 'No account found for this email. Use Sign Up first.' }
  } else if (user.password !== password) {
    return { ok: false, error: 'Wrong password. Use Forgot password to reset it.' }
  }

  if (!user) return { ok: false, error: 'Invalid email or password.' }

  // Clients must be approved by Super Admin before entering the portal
  if (user.role !== 'admin') {
    const status = user.status || 'pending'
    if (status === 'pending' || status === 'lead') {
      return {
        ok: false,
        error: 'Your account is waiting for Super Admin approval. Please try again after you are approved.',
      }
    }
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email: user.email, at: Date.now() }))
  return { ok: true, role: user.role === 'admin' ? 'admin' : 'client' }
}

/** Reset (or create) a client password for local demo auth. */
export function resetPassword(
  emailInput: string,
  newPasswordInput: string,
): { ok: true } | { ok: false; error: string } {
  const email = normalizeEmail(emailInput)
  const password = newPasswordInput.trim()
  if (!email || !email.includes('@')) return { ok: false, error: 'Please enter a valid email.' }
  if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }
  if (email === ADMIN_EMAIL) {
    return { ok: false, error: 'Admin password cannot be reset here.' }
  }

  ensureAdminUser()
  const users = readUsers()
  const idx = users.findIndex((u) => u.email.toLowerCase() === email)
  if (idx < 0) {
    return { ok: false, error: 'No account found. Please Sign Up first.' }
  }
  const user = users[idx]!
  if (user.role === 'admin') {
    return { ok: false, error: 'Admin password cannot be reset here.' }
  }
  user.password = password
  writeUsers(users)
  return { ok: true }
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
    ensureAdminUser()
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
  ensureAdminUser()
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
  // Back to waiting / unpaid
  setMemberStatus(email, 'pending')
}

/** Permanently delete a client account so they can sign up again. */
export function removeMember(email: string): boolean {
  ensureAdminUser()
  const target = normalizeEmail(email)
  if (!target || target === ADMIN_EMAIL) return false
  const users = readUsers()
  const next = users.filter((u) => u.email.toLowerCase() !== target)
  if (next.length === users.length) return false
  writeUsers(next)
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) {
      const data = JSON.parse(raw) as { email?: string }
      if (data.email && data.email.toLowerCase() === target) {
        sessionStorage.removeItem(SESSION_KEY)
      }
    }
  } catch {
    /* ignore */
  }
  return true
}

export function approveMember(email: string) {
  const users = readUsers()
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!user || user.role === 'admin') return
  user.status = 'active'
  user.plan = user.plan === 'free' ? 'pro' : user.plan
  writeUsers(users)
}

export function listPendingRequests(): UserProfile[] {
  return listMembers()
    .filter((m) => (m.status || 'pending') === 'pending' || m.status === 'lead')
    .sort((a, b) => new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime())
}

export function getJoinHistory(days = 14): { date: string; count: number }[] {
  const members = listMembers()
  const now = new Date()
  const out: { date: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    const count = members.filter((m) => (m.joinedAt || '').slice(0, 10) === key).length
    out.push({ date: key, count })
  }
  return out
}

export function getCountryBreakdown(): { country: string; count: number }[] {
  const map = new Map<string, number>()
  for (const m of listMembers()) {
    const c = (m.country || 'Unknown').trim() || 'Unknown'
    map.set(c, (map.get(c) || 0) + 1)
  }
  return [...map.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
}

export function countMembersByStatus(status: MemberStatus): number {
  return listMembers().filter((m) => (m.status || 'pending') === status).length
}

/** Remove all client accounts (keeps super admin only). */
export function resetAllClients() {
  ensureAdminUser()
  const adminOnly = readUsers().filter((u) => u.email === ADMIN_EMAIL)
  writeUsers(adminOnly)
}

export const ADMIN_LOGIN = {
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
}

export const CLIENT_LOGIN = {
  email: OWNER_CLIENT_EMAIL,
  password: OWNER_CLIENT_PASSWORD,
}
