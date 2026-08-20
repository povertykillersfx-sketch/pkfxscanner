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
  /** External download URL (optional alternative to uploaded file) */
  url?: string
  /** True when the PDF blob is stored in IndexedDB under this id */
  hasFile?: boolean
  fileName?: string
  /** @deprecated legacy base64 in localStorage — avoided for new uploads */
  fileData?: string
}

export interface TelegramSettings {
  sample: string
  botToken: string
  chatId: string
}

/** Client dashboard “How it works?” video (shown under How it works) */
export interface HowItWorksVideo {
  url: string
  title: string
  subtitle: string
}

const REQUESTS_KEY = 'pkfx_admin_requests_live_v1'
const COURSES_KEY = 'pkfx_admin_courses_live_v1'
const EBOOKS_KEY = 'pkfx_admin_ebooks_live_v1'
const TELEGRAM_KEY = 'pkfx_admin_telegram_live_v1'
const HOW_IT_WORKS_KEY = 'pkfx_how_it_works_video_v1'

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
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(
      msg.includes('Quota') || msg.includes('quota')
        ? 'Browser storage is full. Remove an old ebook or use a smaller file / PDF URL.'
        : `Could not save: ${msg}`,
    )
  }
}

/** Persist ebook metadata only — never write large PDF payloads into localStorage. */
export function serializeEbookForStorage(book: AdminEbook): AdminEbook {
  const { fileData: _drop, ...rest } = book
  return {
    ...rest,
    hasFile: Boolean(book.hasFile || book.fileData),
    fileData: undefined,
  }
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
  const slim = books.map(serializeEbookForStorage)
  writeJson(EBOOKS_KEY, slim)
  window.dispatchEvent(new CustomEvent('pkfx-ebooks-change', { detail: slim }))
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

const DEFAULT_HOW_IT_WORKS: HowItWorksVideo = {
  url: '',
  title: 'How To Use PKFX',
  subtitle: '(Live market + AI alerts)',
}

export function getHowItWorksVideo(): HowItWorksVideo {
  const stored = readJson<Partial<HowItWorksVideo>>(HOW_IT_WORKS_KEY, {})
  return {
    url: (stored.url || '').trim(),
    title: (stored.title || '').trim() || DEFAULT_HOW_IT_WORKS.title,
    subtitle: (stored.subtitle || '').trim() || DEFAULT_HOW_IT_WORKS.subtitle,
  }
}

export function saveHowItWorksVideo(settings: HowItWorksVideo) {
  const next: HowItWorksVideo = {
    url: settings.url.trim(),
    title: settings.title.trim() || DEFAULT_HOW_IT_WORKS.title,
    subtitle: settings.subtitle.trim() || DEFAULT_HOW_IT_WORKS.subtitle,
  }
  writeJson(HOW_IT_WORKS_KEY, next)
  window.dispatchEvent(new CustomEvent('pkfx-how-it-works-change', { detail: next }))
}

/** Wipe admin content stores for a clean live start. */
export function resetAdminContent() {
  writeJson(REQUESTS_KEY, [])
  writeJson(COURSES_KEY, [])
  writeJson(EBOOKS_KEY, [])
  writeJson(TELEGRAM_KEY, { sample: '', botToken: '', chatId: '' })
  writeJson(HOW_IT_WORKS_KEY, { ...DEFAULT_HOW_IT_WORKS })
}
