/** Shared admin content that syncs across every device on this app host. */

export interface SharedSnapshot {
  updatedAt: string
  community: {
    channels: unknown[]
    sessions: unknown[]
    resources: unknown[]
  } | null
  courses: unknown[]
  ebooks: unknown[]
  howItWorks: {
    url: string
    title: string
    subtitle: string
  } | null
}

const POLL_MS = 8_000

function env(name: string): string {
  try {
    return (
      (typeof import.meta !== 'undefined' &&
        (import.meta.env[name] as string | undefined)?.trim()) ||
      ''
    )
  } catch {
    return ''
  }
}

/** Prefer Supabase Edge Function, then VITE_SYNC_URL, then local Vite /api/sync. */
function syncUrl(): string {
  const supabaseUrl = env('VITE_SUPABASE_URL').replace(/\/$/, '')
  if (supabaseUrl) return `${supabaseUrl}/functions/v1/sync`

  const custom = env('VITE_SYNC_URL')
  return custom || '/api/sync'
}

function syncHeaders(method: 'GET' | 'PUT'): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (method === 'PUT') headers['Content-Type'] = 'application/json'

  const anon = env('VITE_SUPABASE_ANON_KEY')
  if (anon && env('VITE_SUPABASE_URL')) {
    headers.apikey = anon
    headers.Authorization = `Bearer ${anon}`
  }
  return headers
}

export async function pullSharedSnapshot(): Promise<SharedSnapshot | null> {
  try {
    const res = await fetch(syncUrl(), {
      method: 'GET',
      cache: 'no-store',
      headers: syncHeaders('GET'),
    })
    if (!res.ok) return null
    return (await res.json()) as SharedSnapshot
  } catch {
    return null
  }
}

export async function pushSharedSnapshot(
  snapshot: Omit<SharedSnapshot, 'updatedAt'> & { updatedAt?: string },
) {
  const res = await fetch(syncUrl(), {
    method: 'PUT',
    headers: syncHeaders('PUT'),
    body: JSON.stringify({
      ...snapshot,
      updatedAt: snapshot.updatedAt || new Date().toISOString(),
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Sync push failed (${res.status})`)
  }
  return (await res.json()) as SharedSnapshot
}

type SyncListener = (snapshot: SharedSnapshot) => void

const listeners = new Set<SyncListener>()
let lastSeenUpdatedAt = ''
let pollTimer: number | null = null
let started = false

export function onSharedSnapshot(listener: SyncListener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit(snapshot: SharedSnapshot) {
  for (const listener of listeners) {
    try {
      listener(snapshot)
    } catch {
      /* ignore listener errors */
    }
  }
}

export async function refreshSharedSnapshot(force = false): Promise<SharedSnapshot | null> {
  const snapshot = await pullSharedSnapshot()
  if (!snapshot) return null
  if (!force && snapshot.updatedAt && snapshot.updatedAt === lastSeenUpdatedAt) return snapshot
  lastSeenUpdatedAt = snapshot.updatedAt || lastSeenUpdatedAt
  emit(snapshot)
  return snapshot
}

export function noteSharedUpdatedAt(updatedAt: string) {
  if (updatedAt) lastSeenUpdatedAt = updatedAt
}

function isRemoteEmpty(snapshot: SharedSnapshot) {
  const hasCommunity =
    snapshot.community &&
    ((snapshot.community.channels?.length || 0) > 0 ||
      (snapshot.community.sessions?.length || 0) > 0 ||
      (snapshot.community.resources?.length || 0) > 0)
  const hasCourses = (snapshot.courses?.length || 0) > 0
  const hasEbooks = (snapshot.ebooks?.length || 0) > 0
  const hasHow = Boolean(snapshot.howItWorks?.url?.trim())
  return !hasCommunity && !hasCourses && !hasEbooks && !hasHow
}

/** Start background pull so phones/tablets pick up admin edits. */
export function startCloudSyncPolling(opts?: {
  onEmptyRemote?: () => void | Promise<void>
}) {
  if (started || typeof window === 'undefined') return
  started = true

  void (async () => {
    const first = await pullSharedSnapshot()
    if (first && !isRemoteEmpty(first)) {
      lastSeenUpdatedAt = first.updatedAt || ''
      emit(first)
    } else if (opts?.onEmptyRemote) {
      await opts.onEmptyRemote()
    } else if (first) {
      lastSeenUpdatedAt = first.updatedAt || ''
      emit(first)
    }
  })()

  pollTimer = window.setInterval(() => {
    void refreshSharedSnapshot(false)
  }, POLL_MS)
  window.addEventListener('focus', () => {
    void refreshSharedSnapshot(false)
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refreshSharedSnapshot(false)
  })
}

export function stopCloudSyncPolling() {
  if (pollTimer != null) window.clearInterval(pollTimer)
  pollTimer = null
  started = false
}
