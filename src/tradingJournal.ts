import { getCurrentUser } from './auth'

export type TradeSide = 'Buy' | 'Sell'
export type TradeResult = 'Win' | 'Loss' | 'Breakeven' | 'Open'

export interface JournalEntry {
  id: string
  date: string
  symbol: string
  side: TradeSide
  entry: string
  exit: string
  stopLoss: string
  takeProfit: string
  result: TradeResult
  pnl: string
  notes: string
  createdAt: string
  updatedAt: string
}

const JOURNAL_KEY = 'pkfx_trading_journal_v1'

type JournalStore = Record<string, JournalEntry[]>

function readStore(): JournalStore {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as JournalStore
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: JournalStore) {
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(store))
  window.dispatchEvent(new CustomEvent('pkfx-journal-change', { detail: store }))
}

function ownerKey(): string {
  const user = getCurrentUser()
  return (user?.email || 'guest').toLowerCase()
}

export function listJournalEntries(): JournalEntry[] {
  const key = ownerKey()
  const entries = readStore()[key] || []
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export function addJournalEntry(
  input: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>,
): JournalEntry {
  const key = ownerKey()
  const store = readStore()
  const now = new Date().toISOString()
  const entry: JournalEntry = {
    ...input,
    id: `tj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  }
  store[key] = [entry, ...(store[key] || [])]
  writeStore(store)
  return entry
}

export function updateJournalEntry(id: string, patch: Partial<Omit<JournalEntry, 'id' | 'createdAt'>>): void {
  const key = ownerKey()
  const store = readStore()
  const list = store[key] || []
  const idx = list.findIndex((e) => e.id === id)
  if (idx < 0) return
  list[idx] = {
    ...list[idx]!,
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  store[key] = list
  writeStore(store)
}

export function deleteJournalEntry(id: string): void {
  const key = ownerKey()
  const store = readStore()
  store[key] = (store[key] || []).filter((e) => e.id !== id)
  writeStore(store)
}

export function journalStats(entries: JournalEntry[]) {
  const closed = entries.filter((e) => e.result !== 'Open')
  const wins = closed.filter((e) => e.result === 'Win').length
  const losses = closed.filter((e) => e.result === 'Loss').length
  const be = closed.filter((e) => e.result === 'Breakeven').length
  const open = entries.filter((e) => e.result === 'Open').length
  const decided = wins + losses
  const winRate = decided > 0 ? Math.round((wins / decided) * 100) : 0
  return { total: entries.length, wins, losses, be, open, winRate }
}
