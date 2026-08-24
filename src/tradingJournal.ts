import { getCurrentUser } from './auth'

export type TradeSide = 'Buy' | 'Sell'
export type TradeResult = 'Win' | 'Loss' | 'Breakeven'
/** Trading account currencies for P/L. */
export type AccountCurrency = 'USD' | 'ZAR' | 'GBP' | 'EUR'

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
  currency: AccountCurrency
  pnl: string
  notes: string
  createdAt: string
  updatedAt: string
}

export const ACCOUNT_CURRENCIES: AccountCurrency[] = ['USD', 'ZAR', 'GBP', 'EUR']

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

function normalizeCurrency(value: unknown): AccountCurrency {
  if (value === 'USD' || value === 'ZAR' || value === 'GBP' || value === 'EUR') return value
  if (value === 'RURUSD' || value === 'EURUSD') return 'EUR'
  return 'USD'
}

function normalizeResult(value: unknown): TradeResult {
  if (value === 'Win' || value === 'Loss' || value === 'Breakeven') return value
  return 'Breakeven'
}

function normalizeEntry(raw: Partial<JournalEntry> & { id: string }): JournalEntry {
  return {
    id: raw.id,
    date: raw.date || '',
    symbol: raw.symbol || '',
    side: raw.side === 'Sell' ? 'Sell' : 'Buy',
    entry: raw.entry || '',
    exit: raw.exit || '',
    stopLoss: raw.stopLoss || '',
    takeProfit: raw.takeProfit || '',
    result: normalizeResult(raw.result),
    currency: normalizeCurrency(raw.currency),
    pnl: raw.pnl || '',
    notes: raw.notes || '',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  }
}

export function listJournalEntries(): JournalEntry[] {
  const key = ownerKey()
  const entries = (readStore()[key] || []).map((e) => normalizeEntry(e))
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
  const entry = normalizeEntry({
    ...input,
    id: `tj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  })
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
  list[idx] = normalizeEntry({
    ...list[idx]!,
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  })
  store[key] = list
  writeStore(store)
}

export function deleteJournalEntry(id: string): void {
  const key = ownerKey()
  const store = readStore()
  store[key] = (store[key] || []).filter((e) => e.id !== id)
  writeStore(store)
}

export function currencyPrefix(currency: AccountCurrency): string {
  switch (currency) {
    case 'USD':
      return '$'
    case 'ZAR':
      return 'R'
    case 'GBP':
      return '£'
    case 'EUR':
      return '€'
    default:
      return ''
  }
}

/** Format a numeric P/L amount with the selected account currency. */
export function formatPnl(amount: string, currency: AccountCurrency): string {
  const raw = amount.trim()
  if (!raw) return ''
  const prefix = currencyPrefix(currency)
  const cleaned = raw.replace(/[^\d.+-]/g, '')
  const signed = cleaned.match(/^([+-]?)(.*)$/)
  const sign = signed?.[1] || ''
  const body = (signed?.[2] || '').replace(/^[+\-]+/, '').trim()
  if (!body) return `${sign}${prefix}`
  return `${sign}${prefix}${body}`
}

export function journalStats(entries: JournalEntry[]) {
  const wins = entries.filter((e) => e.result === 'Win').length
  const losses = entries.filter((e) => e.result === 'Loss').length
  const be = entries.filter((e) => e.result === 'Breakeven').length
  const decided = wins + losses
  const winRate = decided > 0 ? Math.round((wins / decided) * 100) : 0
  return { total: entries.length, wins, losses, be, winRate }
}

/** Parse a stored P/L string into a signed number (NaN if empty/invalid). */
export function parsePnlAmount(amount: string): number {
  const cleaned = amount.trim().replace(/[^\d.+-]/g, '')
  if (!cleaned || cleaned === '+' || cleaned === '-') return Number.NaN
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : Number.NaN
}

export function formatPnlTotal(total: number, currency: AccountCurrency): string {
  const prefix = currencyPrefix(currency)
  const abs = Math.abs(total)
  const body = Number.isInteger(abs) ? String(abs) : abs.toFixed(2).replace(/\.?0+$/, '')
  if (total < 0) return `-${prefix}${body}`
  if (total > 0) return `+${prefix}${body}`
  return `${prefix}${body}`
}

export interface DayPnlTotal {
  currency: AccountCurrency
  total: number
}

export interface JournalDayGroup {
  date: string
  label: string
  entries: JournalEntry[]
  totals: DayPnlTotal[]
}

function formatJournalDayLabel(dateKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!match) return dateKey || 'Unknown date'
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  const date = new Date(y, m - 1, d)
  if (Number.isNaN(date.getTime())) return dateKey
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Group entries by trade date (newest first) with per-currency day P/L totals. */
export function groupJournalByDay(entries: JournalEntry[]): JournalDayGroup[] {
  const order: string[] = []
  const map = new Map<string, JournalEntry[]>()

  for (const entry of entries) {
    const key = entry.date || 'unknown'
    if (!map.has(key)) {
      map.set(key, [])
      order.push(key)
    }
    map.get(key)!.push(entry)
  }

  return order.map((date) => {
    const dayEntries = map.get(date) || []
    const totalsMap = new Map<AccountCurrency, number>()
    for (const entry of dayEntries) {
      const n = parsePnlAmount(entry.pnl)
      if (!Number.isFinite(n)) continue
      totalsMap.set(entry.currency, (totalsMap.get(entry.currency) || 0) + n)
    }
    const currencyOrder: AccountCurrency[] = ['USD', 'ZAR', 'GBP', 'EUR']
    const totals: DayPnlTotal[] = currencyOrder
      .filter((c) => totalsMap.has(c))
      .map((currency) => ({ currency, total: totalsMap.get(currency)! }))

    return {
      date,
      label: formatJournalDayLabel(date),
      entries: dayEntries,
      totals,
    }
  })
}
