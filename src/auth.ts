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

const ADMIN_EMAIL = 'povertykillersfx2@gmail.com'
const ADMIN_PASSWORD = 'pkfx-admin'

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

  const users = readUsers()
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

  const idx = users.findIndex((u) => u.email === ADMIN_EMAIL)
  if (idx < 0) {
    users.push(admin)
    writeUsers(users)
  } else {
    const cur = users[idx]!
    if (cur.password !== ADMIN_PASSWORD || cur.role !== 'admin') {
      users[idx] = { ...cur, ...admin }
      writeUsers(users)
    }
  }
}

ensureAdminUser()

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
  } else if (!user || user.password !== password) {
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
