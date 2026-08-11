export interface AccessRequest {
  id: string
  name: string
  email: string
  note: string
  createdAt: string
  status: 'pending' | 'approved' | 'rejected'
}

export interface AdminCourse {
  id: string
  title: string
  category: string
  vimeoUrl?: string
  description?: string
}

export interface AdminEbook {
  id: string
  title: string
  coverUrl?: string
  description?: string
  category?: string
  url?: string
}

export interface TelegramSettings {
  sample: string
  botToken: string
  chatId: string
}

const REQUESTS_KEY = 'pkfx_admin_requests'
const COURSES_KEY = 'pkfx_admin_courses'
const EBOOKS_KEY = 'pkfx_admin_ebooks'
const TELEGRAM_KEY = 'pkfx_admin_telegram'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getRequests(): AccessRequest[] {
  return readJson<AccessRequest[]>(REQUESTS_KEY, []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export function saveRequests(requests: AccessRequest[]) {
  writeJson(REQUESTS_KEY, requests)
}

export function getAdminCourses(): AdminCourse[] {
  const seeded: AdminCourse[] = [
    { id: 'c1', title: 'What is forex?', category: 'Introduction', description: 'Intro to forex markets' },
    { id: 'c2', title: 'Breakouts', category: 'Technical Analysis', description: 'How breakouts work' },
  ]
  const stored = readJson<AdminCourse[] | null>(COURSES_KEY, null)
  if (!stored) {
    writeJson(COURSES_KEY, seeded)
    return seeded
  }
  return stored
}

export function saveAdminCourses(courses: AdminCourse[]) {
  writeJson(COURSES_KEY, courses)
}

export function getAdminEbooks(): AdminEbook[] {
  const seeded: AdminEbook[] = [
    { id: 'b1', title: 'Candlestick Patterns', category: 'Technical Analysis', url: '#', description: 'Candlestick guide' },
    { id: 'b2', title: 'What is Forex?', category: 'Introduction', url: '#', description: 'Forex basics' },
  ]
  const stored = readJson<AdminEbook[] | null>(EBOOKS_KEY, null)
  if (!stored) {
    writeJson(EBOOKS_KEY, seeded)
    return seeded
  }
  return stored
}

export function saveAdminEbooks(books: AdminEbook[]) {
  writeJson(EBOOKS_KEY, books)
}

export function getTelegramSettings(): TelegramSettings {
  return readJson<TelegramSettings>(TELEGRAM_KEY, {
    sample: '',
    botToken: '',
    chatId: '',
  })
}

export function saveTelegramSettings(settings: TelegramSettings) {
  writeJson(TELEGRAM_KEY, settings)
}
