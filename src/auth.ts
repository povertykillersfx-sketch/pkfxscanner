import { DEMO_USER, avatarUrl } from './data/mockData'

export interface UserProfile {
  firstName: string
  fullName: string
  email: string
  password: string
  plan: string
}

const USERS_KEY = 'pkfx_users'
const SESSION_KEY = 'pkfx_auth'
const DEMO_EMAIL = DEMO_USER.email.toLowerCase()
const DEMO_PASSWORD = 'pkfxtest'

function readUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as UserProfile[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeUsers(users: UserProfile[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function ensureDemoUser() {
  const users = readUsers()
  if (!users.some((u) => u.email.toLowerCase() === DEMO_EMAIL)) {
    users.push({
      firstName: DEMO_USER.firstName,
      fullName: DEMO_USER.fullName,
      email: DEMO_USER.email,
      password: DEMO_PASSWORD,
      plan: DEMO_USER.plan,
    })
    writeUsers(users)
  }
}

ensureDemoUser()

export function register(input: {
  fullName: string
  email: string
  password: string
}): { ok: true } | { ok: false; error: string } {
  const fullName = input.fullName.trim()
  const email = input.email.trim().toLowerCase()
  const password = input.password

  if (!fullName) return { ok: false, error: 'Please enter your name.' }
  if (!email || !email.includes('@')) return { ok: false, error: 'Please enter a valid email.' }
  if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }

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
  })
  writeUsers(users)

  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email, at: Date.now() }))
  return { ok: true }
}

export function login(email: string, password: string): { ok: true } | { ok: false; error: string } {
  const normalizedEmail = email.trim().toLowerCase()
  ensureDemoUser()
  const users = readUsers()
  const user = users.find((u) => u.email.toLowerCase() === normalizedEmail)

  if (!user || user.password !== password) {
    return { ok: false, error: 'Invalid email or password.' }
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email: user.email, at: Date.now() }))
  return { ok: true }
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY)
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null
}

export function getCurrentUser(): (UserProfile & { avatar: string }) | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as { email?: string }
    if (!data.email) return null
    ensureDemoUser()
    const users = readUsers()
    const user = users.find((u) => u.email.toLowerCase() === data.email!.toLowerCase())
    if (!user) return null
    return {
      ...user,
      avatar: avatarUrl(user.firstName || user.email),
    }
  } catch {
    return null
  }
}
