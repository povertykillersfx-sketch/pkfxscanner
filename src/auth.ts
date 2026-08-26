import { avatarUrl } from './data/mockData'
import { cloudLogin, pullMembersFromCloud, pushAllLocalMembersToCloud, pushMemberToCloud } from './membersSync'

export type UserRole = 'client' | 'admin'

export interface UserProfile {
  firstName: string
  surname?: string
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
  /** Optional Telegram chat ID linked via Connect Telegram */
  telegramChatId?: string
  telegramUsername?: string
  telegramLinkedAt?: string
}

export type MemberStatus = 'lead' | 'pending' | 'active' | 'revoked'

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

/** Ensure a name always starts with a capital letter (also after spaces/hyphens). */
export function capitalizeName(raw: string): string {
  return raw.replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => `${sep}${ch.toUpperCase()}`)
}

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

function pushClientProfile(email: string, opts?: { admin?: boolean }) {
  const user = readUsers().find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (user && user.role !== 'admin') void pushMemberToCloud(user, opts)
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
      plan: 'Inner Circle',
      role: 'client',
      status: 'active',
      country: 'South Africa',
      joinedAt: new Date().toISOString(),
    })
    changed = true
  } else {
    const cur = users[clientIdx]!
    const nextPlan =
      cur.plan === 'admin' || cur.plan === 'free' || cur.plan === 'pro' ? 'Inner Circle' : cur.plan
    if (
      cur.role !== 'client' ||
      cur.password !== OWNER_CLIENT_PASSWORD ||
      cur.status !== 'active' ||
      cur.plan === 'admin' ||
      cur.plan === 'pro' ||
      cur.plan === 'free' ||
      !cur.joinedAt
    ) {
      users[clientIdx] = {
        ...cur,
        role: 'client',
        password: OWNER_CLIENT_PASSWORD,
        status: 'active',
        plan: nextPlan,
        joinedAt: cur.joinedAt || new Date().toISOString(),
      }
      changed = true
    }
  }

  if (changed) writeUsers(users)
}

ensureAdminUser()

export function register(input: {
  firstName: string
  surname: string
  email: string
  password: string
  phone: string
  country: string
  dialCode: string
}): { ok: true } | { ok: false; error: string } {
  const firstName = capitalizeName(input.firstName.trim())
  const surname = capitalizeName(input.surname.trim())
  const email = normalizeEmail(input.email)
  const password = input.password.trim()
  const phoneLocal = input.phone.replace(/\s+/g, '').trim()
  const dialCode = input.dialCode.trim() || '+27'
  const country = input.country.trim() || 'South Africa'

  if (!firstName) return { ok: false, error: 'Please enter your first name.' }
  if (!surname) return { ok: false, error: 'Please enter your surname.' }
  if (!email || !email.includes('@')) return { ok: false, error: 'Please enter a valid email.' }
  if (!phoneLocal || phoneLocal.length < 6) return { ok: false, error: 'Please enter a valid phone number.' }
  if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }
  if (email === ADMIN_EMAIL) {
    return { ok: false, error: 'That account already exists. Please sign in.' }
  }

  ensureAdminUser()
  const users = readUsers()
  if (users.some((u) => u.email.toLowerCase() === email)) {
    return { ok: false, error: 'An account with this email already exists. Please sign in.' }
  }

  const fullName = `${firstName} ${surname}`.trim()
  const phone = `${dialCode} ${phoneLocal}`
  users.push({
    firstName,
    surname,
    fullName,
    email,
    password,
    phone,
    country,
    plan: 'free',
    role: 'client',
    // Signup → lead in Members until they continue to payment
    status: 'lead',
    joinedAt: new Date().toISOString(),
  })
  writeUsers(users)
  setSignupFunnelEmail(email)
  pushClientProfile(email)

  // Do NOT start a session — Admin must approve first
  return { ok: true }
}

export type LoginResult =
  | { ok: true; role: UserRole }
  | {
      ok: false
      error: string
      reason?: 'awaiting_approval' | 'revoked'
      firstName?: string
      email?: string
    }

export function login(emailInput: string, passwordInput: string): LoginResult {
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
        plan: 'Inner Circle',
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
      if (user.plan === 'pro' || user.plan === 'free' || !user.plan) user.plan = 'Inner Circle'
      if (!user.joinedAt) user.joinedAt = new Date().toISOString()
      writeUsers(users)
    }
  } else if (!user) {
    return { ok: false, error: 'No account found for this email. Use Sign Up first.' }
  } else if (user.password !== password) {
    return { ok: false, error: 'Wrong password. Use Forgot password to reset it.' }
  }

  if (!user) return { ok: false, error: 'Invalid email or password.' }

  return finalizeLogin(user)
}

function finalizeLogin(user: UserProfile): LoginResult {
  // Clients must be approved by Admin before entering the portal
  if (user.role !== 'admin') {
    const status = user.status || 'pending'
    if (status === 'revoked') {
      return {
        ok: false,
        reason: 'revoked',
        error: 'Your access was revoked by Admin. Contact support if you need access again.',
      }
    }
    if (status === 'pending' || status === 'lead') {
      return {
        ok: false,
        reason: 'awaiting_approval',
        error: 'Your account is waiting for Admin approval. Please try again after you are approved.',
        firstName: user.firstName,
        email: user.email,
      }
    }
    if (status !== 'active') {
      return { ok: false, error: 'Your account does not have portal access yet.' }
    }
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email: user.email, at: Date.now() }))
  return { ok: true, role: user.role === 'admin' ? 'admin' : 'client' }
}

/** Login with cloud fallback when the account was created on another device. */
export async function loginAsync(emailInput: string, passwordInput: string): Promise<LoginResult> {
  const local = login(emailInput, passwordInput)
  if (local.ok || local.reason === 'awaiting_approval' || local.reason === 'revoked') {
    return local
  }

  const email = normalizeEmail(emailInput)
  const password = passwordInput.trim()
  if (!email || !password || email === ADMIN_EMAIL) return local

  const remote = await cloudLogin(email, password)
  if (!remote.ok) {
    // Prefer clearer local error when account exists locally with wrong password
    return local
  }

  ensureAdminUser()
  const users = readUsers()
  const idx = users.findIndex((u) => u.email.toLowerCase() === email)
  const merged: UserProfile = {
    ...(idx >= 0 ? users[idx]! : ({} as UserProfile)),
    ...remote.member,
    email,
    password: remote.member.password || password,
    role: 'client',
  }
  if (idx >= 0) users[idx] = merged
  else users.push(merged)
  writeUsers(users)
  return finalizeLogin(merged)
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
  pushClientProfile(email)
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

/** Save or clear Telegram link fields on a member profile (local store). */
export function setMemberTelegramLink(
  email: string,
  link: { chatId: string; username?: string; linkedAt?: string } | null,
) {
  const users = readUsers()
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!user) return
  if (!link) {
    delete user.telegramChatId
    delete user.telegramUsername
    delete user.telegramLinkedAt
  } else {
    user.telegramChatId = link.chatId
    user.telegramUsername = link.username
    user.telegramLinkedAt = link.linkedAt || new Date().toISOString()
  }
  writeUsers(users)
  pushClientProfile(email)
}

export function hasPortalAccess(user: Pick<UserProfile, 'role' | 'status'> | null | undefined): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return (user.status || 'pending') === 'active'
}

export function revokeMemberAccess(email: string) {
  // Cut paid/portal access — does not delete the account
  const users = readUsers()
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!user || user.role === 'admin') return
  user.status = 'revoked'
  user.plan = 'free'
  writeUsers(users)
  pushClientProfile(email, { admin: true })
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
  user.plan = 'Inner Circle'
  if (!user.joinedAt) user.joinedAt = new Date().toISOString()
  writeUsers(users)
  pushClientProfile(email, { admin: true })
}

const FUNNEL_KEY = 'pkfx_signup_funnel_v1'

export function setSignupFunnelEmail(email: string) {
  try {
    sessionStorage.setItem(FUNNEL_KEY, normalizeEmail(email))
  } catch {
    /* ignore */
  }
}

export function getSignupFunnelEmail(): string {
  try {
    return normalizeEmail(sessionStorage.getItem(FUNNEL_KEY) || '')
  } catch {
    return ''
  }
}

/**
 * Lead clicked through to payment → show under Requests + Members as pending.
 */
export function markPaymentStarted(emailInput?: string): boolean {
  ensureAdminUser()
  const email = normalizeEmail(emailInput || getSignupFunnelEmail())
  if (!email || email === ADMIN_EMAIL) return false

  const users = readUsers()
  const user = users.find((u) => u.email.toLowerCase() === email)
  if (!user || user.role === 'admin') return false

  // Keep active / revoked as-is; upgrade leads (and bare statuses) to pending
  if (user.status === 'active' || user.status === 'revoked') {
    setSignupFunnelEmail(email)
    return true
  }

  user.status = 'pending'
  writeUsers(users)
  setSignupFunnelEmail(email)
  pushClientProfile(email)
  return true
}

/** Clients awaiting Admin approval (signed up and/or reached payment). */
export function listPendingRequests(): UserProfile[] {
  return listMembers()
    .filter((m) => {
      const status = m.status || 'pending'
      return status === 'pending' || status === 'lead'
    })
    .sort((a, b) => new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime())
}

/** Pull cloud members into local store so Admin sees signups from other devices. */
export async function syncMembersFromCloud(): Promise<number> {
  ensureAdminUser()
  // First push any local clients so other devices / this cloud store stay complete
  await pushAllLocalMembersToCloud(listMembers())

  const remote = await pullMembersFromCloud()
  if (remote.length === 0) return 0

  const users = readUsers()
  let changed = 0
  for (const member of remote) {
    if (!member?.email || member.role === 'admin') continue
    const email = normalizeEmail(member.email)
    const idx = users.findIndex((u) => u.email.toLowerCase() === email)
    if (idx < 0) {
      users.push({
        ...member,
        email,
        role: 'client',
        password: typeof member.password === 'string' ? member.password : '',
        status: member.status || 'lead',
      })
      changed += 1
      continue
    }
    const cur = users[idx]!
    const next: UserProfile = {
      ...cur,
      ...member,
      email,
      role: 'client',
      password:
        typeof member.password === 'string' && member.password
          ? member.password
          : cur.password,
    }
    if (JSON.stringify(cur) !== JSON.stringify(next)) {
      users[idx] = next
      changed += 1
    }
  }
  if (changed > 0) writeUsers(users)
  return changed
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
