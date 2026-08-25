import {
  DEFAULT_COMMUNITY,
  type CommunitySettings,
  type CommunityChannel,
  type CommunityResource,
  type LiveSession,
} from './config/community'
import {
  noteSharedUpdatedAt,
  pushSharedSnapshot,
  type SharedSnapshot,
} from './cloudSync'
import { listTradeIdeas, replaceTradeIdeasFromSync } from './tradeIdeas'

export type { CommunitySettings, CommunityChannel, CommunityResource, LiveSession }

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
const COMMUNITY_KEY = 'pkfx_community_live_v3'
const COMMUNITY_LEGACY_KEYS = ['pkfx_community_live_v2', 'pkfx_community_live_v1'] as const

const SEEDED_CHANNEL_IDS = new Set([
  'telegram-inner',
  'discord',
  'telegram-free',
  'youtube',
])
const SEEDED_SESSION_IDS = new Set(['daily-live', 'london-open', 'ny-open', 'weekly-qa'])

/** Keep only admin-real channels: custom ids, or seeded ones that have a real URL. */
function sanitizeChannels(channels: CommunityChannel[] | undefined): CommunityChannel[] {
  if (!Array.isArray(channels)) return []
  return channels.filter((c) => {
    const hasUrl = Boolean(c.url?.trim())
    if (SEEDED_CHANNEL_IDS.has(c.id)) return hasUrl
    return true
  })
}

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
  void publishSharedContent()
}

export function getAdminEbooks(): AdminEbook[] {
  return readJson<AdminEbook[]>(EBOOKS_KEY, [])
}

export function saveAdminEbooks(books: AdminEbook[]) {
  const slim = books.map(serializeEbookForStorage)
  writeJson(EBOOKS_KEY, slim)
  window.dispatchEvent(new CustomEvent('pkfx-ebooks-change', { detail: slim }))
  void publishSharedContent()
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
  void publishSharedContent()
}

function mergeCommunity(stored: Partial<CommunitySettings> | null): CommunitySettings {
  const base = DEFAULT_COMMUNITY
  if (!stored) return structuredClone(base)
  return {
    // Respect explicit lists (including empty) — never re-seed removed channels/sessions
    channels: Array.isArray(stored.channels)
      ? sanitizeChannels(stored.channels)
      : structuredClone(base.channels),
    sessions: Array.isArray(stored.sessions) ? stored.sessions : structuredClone(base.sessions),
    resources: Array.isArray(stored.resources) && stored.resources.length
      ? stored.resources
      : structuredClone(base.resources),
  }
}

function migrateLegacyCommunity(legacy: Partial<CommunitySettings>): CommunitySettings {
  return {
    channels: sanitizeChannels(legacy.channels),
    sessions: Array.isArray(legacy.sessions)
      ? legacy.sessions.filter((s) => !SEEDED_SESSION_IDS.has(s.id))
      : [],
    resources:
      Array.isArray(legacy.resources) && legacy.resources.length
        ? legacy.resources
        : structuredClone(DEFAULT_COMMUNITY.resources),
  }
}

export function getCommunitySettings(): CommunitySettings {
  const stored = readJson<Partial<CommunitySettings> | null>(COMMUNITY_KEY, null)
  if (stored) return mergeCommunity(stored)

  for (const key of COMMUNITY_LEGACY_KEYS) {
    const legacy = readJson<Partial<CommunitySettings> | null>(key, null)
    if (!legacy) continue
    const migrated = migrateLegacyCommunity(legacy)
    writeJson(COMMUNITY_KEY, migrated)
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
    return migrated
  }

  return mergeCommunity(null)
}

export function saveCommunitySettings(settings: CommunitySettings) {
  const next: CommunitySettings = {
    channels: settings.channels.map((c) => ({
      ...c,
      name: c.name.trim(),
      description: c.description.trim(),
      url: c.url.trim(),
      cta: c.cta.trim() || 'Open',
    })),
    sessions: settings.sessions.map((s) => ({
      ...s,
      title: s.title.trim(),
      time: s.time.trim(),
      timezone: s.timezone.trim() || 'Africa/Johannesburg',
      description: (s.description || '').trim(),
      joinUrl: (s.joinUrl || '').trim() || undefined,
    })),
    resources: settings.resources.map((r) => ({
      ...r,
      title: r.title.trim(),
      description: r.description.trim(),
      url: r.url.trim(),
    })),
  }
  writeJson(COMMUNITY_KEY, next)
  window.dispatchEvent(new CustomEvent('pkfx-community-change', { detail: next }))
  void publishSharedContent()
}

/** Apply a shared snapshot from the server onto this device. */
export function applySharedSnapshot(snapshot: SharedSnapshot, opts?: { silent?: boolean }) {
  if (snapshot.community) {
    const community = mergeCommunity(snapshot.community as Partial<CommunitySettings>)
    writeJson(COMMUNITY_KEY, community)
    if (!opts?.silent) {
      window.dispatchEvent(new CustomEvent('pkfx-community-change', { detail: community }))
    }
  }

  if (Array.isArray(snapshot.courses)) {
    const courses = snapshot.courses as AdminCourse[]
    writeJson(COURSES_KEY, courses)
    if (!opts?.silent) {
      window.dispatchEvent(new CustomEvent('pkfx-courses-change', { detail: courses }))
    }
  }

  if (Array.isArray(snapshot.ebooks)) {
    const slim = (snapshot.ebooks as AdminEbook[]).map(serializeEbookForStorage)
    writeJson(EBOOKS_KEY, slim)
    if (!opts?.silent) {
      window.dispatchEvent(new CustomEvent('pkfx-ebooks-change', { detail: slim }))
    }
  }

  if (snapshot.howItWorks) {
    const how: HowItWorksVideo = {
      url: (snapshot.howItWorks.url || '').trim(),
      title: (snapshot.howItWorks.title || '').trim() || DEFAULT_HOW_IT_WORKS.title,
      subtitle: (snapshot.howItWorks.subtitle || '').trim() || DEFAULT_HOW_IT_WORKS.subtitle,
    }
    writeJson(HOW_IT_WORKS_KEY, how)
    if (!opts?.silent) {
      window.dispatchEvent(new CustomEvent('pkfx-how-it-works-change', { detail: how }))
    }
  }

  if (Array.isArray(snapshot.tradeIdeas)) {
    replaceTradeIdeasFromSync(snapshot.tradeIdeas, { silent: opts?.silent })
  }

  if (snapshot.updatedAt) noteSharedUpdatedAt(snapshot.updatedAt)
}

function buildSharedSnapshot(): Omit<SharedSnapshot, 'updatedAt'> & { updatedAt?: string } {
  return {
    community: getCommunitySettings(),
    courses: getAdminCourses(),
    ebooks: getAdminEbooks(),
    howItWorks: getHowItWorksVideo(),
    tradeIdeas: listTradeIdeas(),
  }
}

/** Push local admin content so every device can pull the same data. */
export async function publishSharedContent() {
  try {
    const saved = await pushSharedSnapshot(buildSharedSnapshot())
    if (saved?.updatedAt) noteSharedUpdatedAt(saved.updatedAt)
    window.dispatchEvent(
      new CustomEvent('pkfx-sync-status', {
        detail: { ok: true, at: saved?.updatedAt || new Date().toISOString() },
      }),
    )
    return saved
  } catch (err) {
    window.dispatchEvent(
      new CustomEvent('pkfx-sync-status', {
        detail: {
          ok: false,
          error: err instanceof Error ? err.message : 'Sync failed',
        },
      }),
    )
    return null
  }
}

/** Wipe admin content stores for a clean live start. */
export function resetAdminContent() {
  writeJson(REQUESTS_KEY, [])
  writeJson(COURSES_KEY, [])
  writeJson(EBOOKS_KEY, [])
  writeJson(TELEGRAM_KEY, { sample: '', botToken: '', chatId: '' })
  writeJson(HOW_IT_WORKS_KEY, { ...DEFAULT_HOW_IT_WORKS })
  writeJson(COMMUNITY_KEY, structuredClone(DEFAULT_COMMUNITY))
  for (const key of COMMUNITY_LEGACY_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  }
  void publishSharedContent()
}
