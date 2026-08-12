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
  /** External or object URL for download */
  url?: string
  /** Uploaded PDF as data URL (auto-published to client portal) */
  fileData?: string
  fileName?: string
}

export interface TelegramSettings {
  sample: string
  botToken: string
  chatId: string
}

const REQUESTS_KEY = 'pkfx_admin_requests_live_v1'
const COURSES_KEY = 'pkfx_admin_courses_live_v1'
const EBOOKS_KEY = 'pkfx_admin_ebooks_live_v1'
const TELEGRAM_KEY = 'pkfx_admin_telegram_live_v1'

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
  return readJson<AdminCourse[]>(COURSES_KEY, [])
}

export function saveAdminCourses(courses: AdminCourse[]) {
  writeJson(COURSES_KEY, courses)
  window.dispatchEvent(new CustomEvent('pkfx-courses-change', { detail: courses }))
}

export function getAdminEbooks(): AdminEbook[] {
  return readJson<AdminEbook[]>(EBOOKS_KEY, [])
}

export function saveAdminEbooks(books: AdminEbook[]) {
  writeJson(EBOOKS_KEY, books)
  window.dispatchEvent(new CustomEvent('pkfx-ebooks-change', { detail: books }))
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

/** Wipe admin content stores for a clean live start. */
export function resetAdminContent() {
  writeJson(REQUESTS_KEY, [])
  writeJson(COURSES_KEY, [])
  writeJson(EBOOKS_KEY, [])
  writeJson(TELEGRAM_KEY, { sample: '', botToken: '', chatId: '' })
}
