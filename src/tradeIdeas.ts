import { INSTRUMENTS } from './data/mockData'
import { publishSharedContent } from './adminStore'

export type TradeDirection = 'Buy' | 'Sell'

export interface TradeIdea {
  id: string
  pair: string
  direction: TradeDirection
  stopLoss: string
  tp1: string
  tp2: string
  notes: string
  /** ISO timestamp when published to clients; null = draft */
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  archived?: boolean
}

const TRADE_IDEAS_KEY = 'pkfx_trade_ideas_v1'

function readAll(): TradeIdea[] {
  try {
    const raw = localStorage.getItem(TRADE_IDEAS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TradeIdea[]
    return Array.isArray(parsed) ? parsed.map(normalizeIdea) : []
  } catch {
    return []
  }
}

function writeAll(ideas: TradeIdea[], opts?: { silent?: boolean; skipPublish?: boolean }) {
  localStorage.setItem(TRADE_IDEAS_KEY, JSON.stringify(ideas))
  if (!opts?.silent) {
    window.dispatchEvent(new CustomEvent('pkfx-trade-ideas-change', { detail: ideas }))
  }
  if (!opts?.skipPublish) {
    void publishSharedContent()
  }
}

function normalizeIdea(raw: Partial<TradeIdea> & { id: string }): TradeIdea {
  const direction = raw.direction === 'Sell' ? 'Sell' : 'Buy'
  return {
    id: raw.id,
    pair: (raw.pair || 'EURUSD').trim().toUpperCase(),
    direction,
    stopLoss: (raw.stopLoss || '').trim(),
    tp1: (raw.tp1 || '').trim(),
    tp2: (raw.tp2 || '').trim(),
    notes: (raw.notes || '').trim(),
    publishedAt: raw.publishedAt ?? null,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    archived: Boolean(raw.archived),
  }
}

function newId() {
  return `ti_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export const TRADE_IDEA_PAIRS: string[] = [...INSTRUMENTS]

/** All ideas for admin (newest first). */
export function listTradeIdeas(): TradeIdea[] {
  return [...readAll()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

/** Published ideas for client portal (newest publish first). */
export function listPublishedTradeIdeas(): TradeIdea[] {
  return listTradeIdeas()
    .filter((idea) => Boolean(idea.publishedAt) && !idea.archived)
    .sort(
      (a, b) =>
        new Date(b.publishedAt || b.updatedAt).getTime() -
        new Date(a.publishedAt || a.updatedAt).getTime(),
    )
}

export function getTradeIdea(id: string): TradeIdea | null {
  return readAll().find((idea) => idea.id === id) ?? null
}

export function createTradeIdea(
  input: Omit<TradeIdea, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'archived'> & {
    publish?: boolean
  },
): TradeIdea {
  const now = new Date().toISOString()
  const idea = normalizeIdea({
    id: newId(),
    pair: input.pair,
    direction: input.direction,
    stopLoss: input.stopLoss,
    tp1: input.tp1,
    tp2: input.tp2,
    notes: input.notes,
    publishedAt: input.publish ? now : null,
    createdAt: now,
    updatedAt: now,
    archived: false,
  })
  writeAll([idea, ...readAll()])
  return idea
}

export function updateTradeIdea(
  id: string,
  patch: Partial<Omit<TradeIdea, 'id' | 'createdAt'>>,
): TradeIdea | null {
  const all = readAll()
  const idx = all.findIndex((idea) => idea.id === id)
  if (idx < 0) return null
  const next = normalizeIdea({
    ...all[idx]!,
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  })
  all[idx] = next
  writeAll(all)
  return next
}

export function publishTradeIdea(id: string): TradeIdea | null {
  return updateTradeIdea(id, { publishedAt: new Date().toISOString(), archived: false })
}

export function unpublishTradeIdea(id: string): TradeIdea | null {
  return updateTradeIdea(id, { publishedAt: null })
}

export function archiveTradeIdea(id: string): TradeIdea | null {
  return updateTradeIdea(id, { archived: true, publishedAt: null })
}

export function deleteTradeIdea(id: string): void {
  writeAll(readAll().filter((idea) => idea.id !== id))
}

/** Replace local store from shared sync (does not re-publish). */
export function replaceTradeIdeasFromSync(ideas: unknown[], opts?: { silent?: boolean }) {
  const next = Array.isArray(ideas)
    ? ideas
        .filter((item): item is Partial<TradeIdea> & { id: string } =>
          Boolean(item && typeof item === 'object' && 'id' in item),
        )
        .map((item) => normalizeIdea(item))
    : []
  writeAll(next, { silent: opts?.silent, skipPublish: true })
}

export function formatTradeIdeaTime(iso: string | null | undefined): string {
  if (!iso) return 'Draft'
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
