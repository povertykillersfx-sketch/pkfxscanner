import { getCurrentUser } from './auth'

export type TradeSide = 'Buy' | 'Sell'
export type TradeResult = 'Win' | 'Loss' | 'Breakeven'
/** Trading account currencies for P/L. */
export type AccountCurrency = 'USD' | 'ZAR' | 'GBP' | 'EUR'

export interface JournalEntry {
  id: string
  /** Journal this trade belongs to. */
  journalId: string
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
  /** Self-rating of trade execution, 1–5. 0 means unrated. */
  rating: number
  notes: string
  createdAt: string
  updatedAt: string
}

export interface Journal {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export const ACCOUNT_CURRENCIES: AccountCurrency[] = ['USD', 'ZAR', 'GBP', 'EUR']

const JOURNAL_KEY = 'pkfx_trading_journal_v1'
const JOURNALS_KEY = 'pkfx_trading_journals_v1'

type JournalStore = Record<string, JournalEntry[]>
type JournalsStore = Record<string, Journal[]>

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

function readJournals(): JournalsStore {
  try {
    const raw = localStorage.getItem(JOURNALS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as JournalsStore
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeJournals(store: JournalsStore) {
  localStorage.setItem(JOURNALS_KEY, JSON.stringify(store))
  window.dispatchEvent(new CustomEvent('pkfx-journal-change', { detail: store }))
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
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

function normalizeRating(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.min(5, Math.max(0, Math.round(n)))
}

function normalizeEntry(raw: Partial<JournalEntry> & { id: string }): JournalEntry {
  return {
    id: raw.id,
    journalId: raw.journalId || '',
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
    rating: normalizeRating(raw.rating),
    notes: raw.notes || '',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  }
}

function normalizeJournal(raw: Partial<Journal> & { id: string }): Journal {
  return {
    id: raw.id,
    name: raw.name || 'Untitled journal',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  }
}

export function listJournals(): Journal[] {
  const key = ownerKey()
  const journals = (readJournals()[key] || []).map((j) => normalizeJournal(j))
  return [...journals].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getJournal(id: string): Journal | null {
  return listJournals().find((j) => j.id === id) ?? null
}

export function createJournal(name: string): Journal {
  const key = ownerKey()
  const store = readJournals()
  const now = new Date().toISOString()
  const journal = normalizeJournal({
    id: newId('jr'),
    name: name.trim() || 'Untitled journal',
    createdAt: now,
    updatedAt: now,
  })
  store[key] = [journal, ...(store[key] || [])]
  writeJournals(store)
  return journal
}

export function renameJournal(id: string, name: string): void {
  const key = ownerKey()
  const store = readJournals()
  const list = store[key] || []
  const idx = list.findIndex((j) => j.id === id)
  if (idx < 0) return
  list[idx] = normalizeJournal({ ...list[idx]!, name, id, updatedAt: new Date().toISOString() })
  store[key] = list
  writeJournals(store)
}

/** Deletes a journal and every trade logged inside it. */
export function deleteJournal(id: string): void {
  const key = ownerKey()
  const journals = readJournals()
  journals[key] = (journals[key] || []).filter((j) => j.id !== id)
  writeJournals(journals)

  const entries = readStore()
  entries[key] = (entries[key] || []).filter((e) => e.journalId !== id)
  writeStore(entries)
}

/**
 * Trades logged before journals existed have no journalId. Move them into a
 * single carry-over journal so nothing disappears from a member's history.
 */
function migrateLooseEntries(): void {
  const key = ownerKey()
  const store = readStore()
  const list = (store[key] || []).map((e) => normalizeEntry(e))
  const loose = list.filter((e) => !e.journalId)
  if (loose.length === 0) return

  const journals = readJournals()
  const owned = (journals[key] || []).map((j) => normalizeJournal(j))
  let target = owned.find((j) => j.name === 'My Trades')
  if (!target) {
    const now = new Date().toISOString()
    target = normalizeJournal({ id: newId('jr'), name: 'My Trades', createdAt: now, updatedAt: now })
    journals[key] = [target, ...owned]
    writeJournals(journals)
  }

  store[key] = list.map((e) => (e.journalId ? e : { ...e, journalId: target!.id }))
  writeStore(store)
}

export function listJournalEntries(journalId?: string): JournalEntry[] {
  migrateLooseEntries()
  const key = ownerKey()
  const entries = (readStore()[key] || []).map((e) => normalizeEntry(e))
  const scoped = journalId ? entries.filter((e) => e.journalId === journalId) : entries
  return [...scoped].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

/** Trade counts per journal, for the journals list page. */
export function journalEntryCounts(): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const entry of listJournalEntries()) {
    counts[entry.journalId] = (counts[entry.journalId] || 0) + 1
  }
  return counts
}

export function addJournalEntry(
  input: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>,
): JournalEntry {
  const key = ownerKey()
  const store = readStore()
  const now = new Date().toISOString()
  const entry = normalizeEntry({
    ...input,
    id: newId('tj'),
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

/** Currencies present in a set of trades, most-used first. */
export function journalCurrencies(entries: JournalEntry[]): AccountCurrency[] {
  const counts = new Map<AccountCurrency, number>()
  for (const entry of entries) {
    counts.set(entry.currency, (counts.get(entry.currency) || 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([currency]) => currency)
}

export interface JournalPoint {
  date: string
  value: number
}

export interface SymbolTotal {
  symbol: string
  total: number
  trades: number
}

export interface JournalAnalytics {
  currency: AccountCurrency
  totalTrades: number
  totalPnl: number
  wins: number
  losses: number
  breakeven: number
  winRate: number
  avgRating: number | null
  longs: number
  shorts: number
  cumulative: JournalPoint[]
  daily: JournalPoint[]
  bySymbol: SymbolTotal[]
  avgWin: number
  avgLoss: number
  profitFactor: number
  bestDay: JournalPoint | null
}

/**
 * Performance summary for one journal. Scoped to a single account currency so
 * totals are never produced by adding different currencies together.
 */
export function journalAnalytics(
  entries: JournalEntry[],
  currency?: AccountCurrency,
): JournalAnalytics {
  const active = currency ?? journalCurrencies(entries)[0] ?? 'USD'
  const scoped = entries.filter((e) => e.currency === active)

  const wins = scoped.filter((e) => e.result === 'Win').length
  const losses = scoped.filter((e) => e.result === 'Loss').length
  const breakeven = scoped.filter((e) => e.result === 'Breakeven').length
  const decided = wins + losses

  const rated = scoped.filter((e) => e.rating > 0)
  const avgRating = rated.length
    ? rated.reduce((sum, e) => sum + e.rating, 0) / rated.length
    : null

  const dayTotals = new Map<string, number>()
  const symbolTotals = new Map<string, { total: number; trades: number }>()
  let grossProfit = 0
  let grossLoss = 0
  let totalPnl = 0

  for (const entry of scoped) {
    const amount = parsePnlAmount(entry.pnl)
    if (!Number.isFinite(amount)) continue
    totalPnl += amount
    if (amount > 0) grossProfit += amount
    if (amount < 0) grossLoss += Math.abs(amount)

    const dayKey = entry.date || 'unknown'
    dayTotals.set(dayKey, (dayTotals.get(dayKey) || 0) + amount)

    const symbol = entry.symbol || '—'
    const prev = symbolTotals.get(symbol) || { total: 0, trades: 0 }
    symbolTotals.set(symbol, { total: prev.total + amount, trades: prev.trades + 1 })
  }

  const daily = [...dayTotals.entries()]
    .filter(([date]) => date !== 'unknown')
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, value]) => ({ date, value }))

  let running = 0
  const cumulative = daily.map(({ date, value }) => {
    running += value
    return { date, value: running }
  })

  const bySymbol = [...symbolTotals.entries()]
    .map(([symbol, v]) => ({ symbol, total: v.total, trades: v.trades }))
    .sort((a, b) => b.total - a.total)

  const winAmounts = scoped
    .filter((e) => e.result === 'Win')
    .map((e) => parsePnlAmount(e.pnl))
    .filter((n) => Number.isFinite(n))
  const lossAmounts = scoped
    .filter((e) => e.result === 'Loss')
    .map((e) => parsePnlAmount(e.pnl))
    .filter((n) => Number.isFinite(n))

  const bestDay = daily.length
    ? daily.reduce((best, day) => (day.value > best.value ? day : best), daily[0]!)
    : null

  return {
    currency: active,
    totalTrades: scoped.length,
    totalPnl,
    wins,
    losses,
    breakeven,
    winRate: decided > 0 ? Math.round((wins / decided) * 100) : 0,
    avgRating,
    longs: scoped.filter((e) => e.side === 'Buy').length,
    shorts: scoped.filter((e) => e.side === 'Sell').length,
    cumulative,
    daily,
    bySymbol,
    avgWin: winAmounts.length ? winAmounts.reduce((a, b) => a + b, 0) / winAmounts.length : 0,
    avgLoss: lossAmounts.length ? lossAmounts.reduce((a, b) => a + b, 0) / lossAmounts.length : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : 0,
    bestDay,
  }
}

/** Money label with no forced sign, e.g. `$-328.39`. */
export function formatMoney(amount: number, currency: AccountCurrency): string {
  const prefix = currencyPrefix(currency)
  const rounded = Math.abs(amount) < 0.005 ? 0 : amount
  const body = Math.abs(rounded).toFixed(2)
  return rounded < 0 ? `${prefix}-${body}` : `${prefix}${body}`
}

/** Compact money label for chart axes and calendar cells, e.g. `-328`. */
export function formatMoneyCompact(amount: number): string {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`
  return `${sign}${Math.round(abs)}`
}

export type CalendarDayTone = 'profit' | 'loss' | 'breakeven' | 'none'

export interface CalendarCell {
  /** ISO `YYYY-MM-DD`, or empty for leading/trailing padding cells. */
  date: string
  day: number
  total: number
  trades: number
  tone: CalendarDayTone
  isToday: boolean
}

export interface CalendarMonth {
  year: number
  month: number
  label: string
  cells: CalendarCell[]
  total: number
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Month grid (Sunday-first) with per-day P/L for the calendar heatmap. */
export function journalCalendarMonth(
  entries: JournalEntry[],
  year: number,
  month: number,
  currency?: AccountCurrency,
): CalendarMonth {
  const active = currency ?? journalCurrencies(entries)[0] ?? 'USD'
  const totals = new Map<string, { total: number; trades: number }>()

  for (const entry of entries) {
    if (entry.currency !== active) continue
    if (!entry.date) continue
    const amount = parsePnlAmount(entry.pnl)
    const prev = totals.get(entry.date) || { total: 0, trades: 0 }
    totals.set(entry.date, {
      total: prev.total + (Number.isFinite(amount) ? amount : 0),
      trades: prev.trades + 1,
    })
  }

  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = (() => {
    const now = new Date()
    return dateKey(now.getFullYear(), now.getMonth(), now.getDate())
  })()

  const cells: CalendarCell[] = []
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ date: '', day: 0, total: 0, trades: 0, tone: 'none', isToday: false })
  }

  let monthTotal = 0
  for (let day = 1; day <= daysInMonth; day++) {
    const key = dateKey(year, month, day)
    const stat = totals.get(key)
    const total = stat?.total ?? 0
    const trades = stat?.trades ?? 0
    monthTotal += total
    cells.push({
      date: key,
      day,
      total,
      trades,
      tone: trades === 0 ? 'none' : total > 0 ? 'profit' : total < 0 ? 'loss' : 'breakeven',
      isToday: key === todayKey,
    })
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: '', day: 0, total: 0, trades: 0, tone: 'none', isToday: false })
  }

  return {
    year,
    month,
    label: new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    cells,
    total: monthTotal,
  }
}
