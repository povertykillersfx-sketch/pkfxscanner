/** Shared admin content sync — Supabase PostgREST, Edge Function, or local /api/sync. */

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
  /** Optional until Supabase trade_ideas column is live */
  tradeIdeas?: unknown[]
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

function supabaseBase(): string {
  return env('VITE_SUPABASE_URL').replace(/\/$/, '')
}

function supabaseHeaders(jsonBody: boolean): HeadersInit {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (jsonBody) headers['Content-Type'] = 'application/json'
  const anon = env('VITE_SUPABASE_ANON_KEY')
  if (anon) {
    headers.apikey = anon
    headers.Authorization = `Bearer ${anon}`
  }
  return headers
}

function localSyncUrl(): string {
  return env('VITE_SYNC_URL') || '/api/sync'
}

function edgeSyncUrl(): string | null {
  const base = supabaseBase()
  return base ? `${base}/functions/v1/sync` : null
}

function restSyncUrl(): string | null {
  const base = supabaseBase()
  return base ? `${base}/rest/v1/pkfx_shared?id=eq.default&select=*` : null
}

function rowToSnapshot(row: {
  community?: unknown
  courses?: unknown
  ebooks?: unknown
  how_it_works?: unknown
  trade_ideas?: unknown
  updated_at?: string
} | null): SharedSnapshot {
  return {
    updatedAt: row?.updated_at || new Date().toISOString(),
    community: (row?.community as SharedSnapshot['community']) ?? null,
    courses: Array.isArray(row?.courses) ? row!.courses : [],
    ebooks: Array.isArray(row?.ebooks) ? row!.ebooks : [],
    howItWorks: (row?.how_it_works as SharedSnapshot['howItWorks']) ?? null,
    tradeIdeas: 'trade_ideas' in (row || {}) 
      ? Array.isArray(row?.trade_ideas) ? row!.trade_ideas : []
      : undefined,
  }
}

function snapshotToRow(snapshot: Omit<SharedSnapshot, 'updatedAt'> & { updatedAt?: string }) {
  return {
    id: 'default',
    community: snapshot.community ?? null,
    courses: snapshot.courses ?? [],
    ebooks: snapshot.ebooks ?? [],
    how_it_works: snapshot.howItWorks ?? null,
    trade_ideas: Array.isArray(snapshot.tradeIdeas) ? snapshot.tradeIdeas : [],
    updated_at: snapshot.updatedAt || new Date().toISOString(),
  }
}

async function pullLocal(): Promise<SharedSnapshot | null> {
  try {
    const res = await fetch(localSyncUrl(), {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    return (await res.json()) as SharedSnapshot
  } catch {
    return null
  }
}

async function pushLocal(
  snapshot: Omit<SharedSnapshot, 'updatedAt'> & { updatedAt?: string },
): Promise<SharedSnapshot> {
  const res = await fetch(localSyncUrl(), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      ...snapshot,
      updatedAt: snapshot.updatedAt || new Date().toISOString(),
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Local sync push failed (${res.status})`)
  }
  return (await res.json()) as SharedSnapshot
}

async function pullEdge(): Promise<SharedSnapshot | null> {
  const url = edgeSyncUrl()
  if (!url) return null
  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: supabaseHeaders(false),
    })
    if (!res.ok) return null
    return (await res.json()) as SharedSnapshot
  } catch {
    return null
  }
}

async function pushEdge(
  snapshot: Omit<SharedSnapshot, 'updatedAt'> & { updatedAt?: string },
): Promise<SharedSnapshot | null> {
  const url = edgeSyncUrl()
  if (!url) return null
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: supabaseHeaders(true),
      body: JSON.stringify({
        ...snapshot,
        updatedAt: snapshot.updatedAt || new Date().toISOString(),
      }),
    })
    if (!res.ok) return null
    return (await res.json()) as SharedSnapshot
  } catch {
    return null
  }
}

async function pullRest(): Promise<SharedSnapshot | null> {
  const url = restSyncUrl()
  if (!url) return null
  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: supabaseHeaders(false),
    })
    if (!res.ok) return null
    const rows = (await res.json()) as unknown
    const row = Array.isArray(rows) ? rows[0] : rows
    if (!row) {
      return {
        updatedAt: new Date().toISOString(),
        community: null,
        courses: [],
        ebooks: [],
        howItWorks: null,
      }
    }
    return rowToSnapshot(row as Parameters<typeof rowToSnapshot>[0])
  } catch {
    return null
  }
}

async function pushRest(
  snapshot: Omit<SharedSnapshot, 'updatedAt'> & { updatedAt?: string },
): Promise<SharedSnapshot | null> {
  const base = supabaseBase()
  if (!base) return null
  const row = snapshotToRow(snapshot)
  try {
    const res = await fetch(`${base}/rest/v1/pkfx_shared?on_conflict=id`, {
      method: 'POST',
      headers: {
        ...supabaseHeaders(true),
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(row),
    })
    if (!res.ok) return null
    const rows = (await res.json()) as unknown
    const saved = Array.isArray(rows) ? rows[0] : rows
    if (!saved) return null
    return rowToSnapshot(saved as Parameters<typeof rowToSnapshot>[0])
  } catch {
    return null
  }
}

export async function pullSharedSnapshot(): Promise<SharedSnapshot | null> {
  return (await pullEdge()) || (await pullRest()) || (await pullLocal())
}

export async function pushSharedSnapshot(
  snapshot: Omit<SharedSnapshot, 'updatedAt'> & { updatedAt?: string },
) {
  const viaEdge = await pushEdge(snapshot)
  if (viaEdge) return viaEdge

  const viaRest = await pushRest(snapshot)
  if (viaRest) return viaRest

  // Edge Functions not deployed / RLS blocks writes → keep host sync working
  return pushLocal(snapshot)
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
  const hasTradeIdeas = (snapshot.tradeIdeas?.length || 0) > 0
  return !hasCommunity && !hasCourses && !hasEbooks && !hasHow && !hasTradeIdeas
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
