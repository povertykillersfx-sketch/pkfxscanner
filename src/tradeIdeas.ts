import { INSTRUMENTS, type Alert, type MarketSession } from './data/mockData'
import { publishSharedContent } from './adminStore'

export type TradeDirection = 'Buy' | 'Sell'

export interface TradeIdea {
  id: string
  pair: string
  direction: TradeDirection
  /** Approximate entry price or zone */
  entry: string
  stopLoss: string
  tp1: string
  tp2: string
  notes: string
  session: MarketSession
  /** ISO timestamp when published to clients; null = draft */
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  archived?: boolean
}

const TRADE_IDEAS_KEY = 'pkfx_trade_ideas_v1'
const SESSIONS: MarketSession[] = ['Sydney', 'Asian', 'London', 'New York']

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

function normalizeSession(raw: unknown): MarketSession {
  return SESSIONS.includes(raw as MarketSession) ? (raw as MarketSession) : 'New York'
}

function normalizeIdea(
  raw: Partial<TradeIdea> & { id: string; entryZone?: string },
): TradeIdea {
  const direction = raw.direction === 'Sell' ? 'Sell' : 'Buy'
  return {
    id: raw.id,
    pair: (raw.pair || 'EURUSD').trim().toUpperCase(),
    direction,
    entry: (raw.entry || raw.entryZone || '').trim(),
    stopLoss: (raw.stopLoss || '').trim(),
    tp1: (raw.tp1 || '').trim(),
    tp2: (raw.tp2 || '').trim(),
    notes: (raw.notes || '').trim(),
    session: normalizeSession(raw.session),
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
export const TRADE_IDEA_SESSIONS: MarketSession[] = [...SESSIONS]

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
    entry: input.entry,
    stopLoss: input.stopLoss,
    tp1: input.tp1,
    tp2: input.tp2,
    notes: input.notes,
    session: input.session,
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

function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').trim()
  if (!cleaned) return null
  // Midpoint if a zone like "1.08 - 1.09"
  const parts = cleaned.split(/\s*[-–—to]+\s*/i).map((p) => Number(p.trim()))
  const nums = parts.filter((n) => Number.isFinite(n))
  if (nums.length === 0) return null
  if (nums.length === 1) return nums[0]!
  return (nums[0]! + nums[nums.length - 1]!) / 2
}

/**
 * Overall risk-to-reward using TP2.
 * Buy: reward = TP2 - entry, risk = entry - SL
 * Sell: reward = entry - TP2, risk = SL - entry
 * Returns e.g. "1:2.0" or null if levels are invalid.
 */
export function calculateRiskReward(
  entryRaw: string,
  stopLossRaw: string,
  tp2Raw: string,
  direction: TradeDirection,
): string | null {
  const entry = parsePrice(entryRaw)
  const sl = parsePrice(stopLossRaw)
  const tp2 = parsePrice(tp2Raw)
  if (entry == null || sl == null || tp2 == null) return null

  const risk = direction === 'Buy' ? entry - sl : sl - entry
  const reward = direction === 'Buy' ? tp2 - entry : entry - tp2
  if (!(risk > 0) || !(reward > 0)) return null

  const ratio = reward / risk
  const formatted = ratio >= 10 ? ratio.toFixed(1) : ratio.toFixed(2).replace(/\.?0+$/, '') || ratio.toFixed(1)
  return `1:${formatted}`
}

/** Map a published Trade Idea into the AlertCard visual format. */
export function tradeIdeaToAlert(idea: TradeIdea, opts?: { trending?: boolean }): Alert {
  const noticedAt = idea.publishedAt || idea.updatedAt || idea.createdAt

  return {
    id: idea.id,
    asset: idea.pair,
    sentiment: idea.direction === 'Sell' ? 'Bearish' : 'Bullish',
    strategy: 'Trade Idea',
    date: noticedAt.slice(0, 10),
    noticedAt,
    session: idea.session,
    trending: Boolean(opts?.trending),
    targets: [idea.tp1, idea.tp2].filter(Boolean),
    reversals: [idea.stopLoss].filter(Boolean),
    entry: idea.entry || undefined,
    aiNote: idea.notes.trim() || undefined,
    live: true,
    levelsLocked: true,
    riskReward: calculateRiskReward(idea.entry, idea.stopLoss, idea.tp2, idea.direction) || undefined,
  }
}

export function publishedTradeIdeasAsAlerts(): Alert[] {
  const ideas = listPublishedTradeIdeas()
  return ideas.map((idea, index) => tradeIdeaToAlert(idea, { trending: index === 0 }))
}
