import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { NotebookPen, Plus, Trash2 } from 'lucide-react'
import { INSTRUMENTS } from '../data/mockData'
import {
  ACCOUNT_CURRENCIES,
  addJournalEntry,
  currencyPrefix,
  deleteJournalEntry,
  formatPnl,
  journalStats,
  listJournalEntries,
  type AccountCurrency,
  type JournalEntry,
  type TradeResult,
  type TradeSide,
} from '../tradingJournal'
import './TradingJournal.css'

const RESULTS: TradeResult[] = ['Win', 'Loss', 'Breakeven']
const SIDES: TradeSide[] = ['Buy', 'Sell']

function todayInputValue(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function emptyForm() {
  return {
    date: todayInputValue(),
    symbol: 'GOLD',
    side: 'Buy' as TradeSide,
    entry: '',
    exit: '',
    stopLoss: '',
    takeProfit: '',
    result: 'Win' as TradeResult,
    currency: 'USD' as AccountCurrency,
    pnl: '',
    notes: '',
  }
}

export function TradingJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>(() => listJournalEntries())
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    function refresh() {
      setEntries(listJournalEntries())
    }
    window.addEventListener('pkfx-journal-change', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('pkfx-journal-change', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const stats = useMemo(() => journalStats(entries), [entries])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.symbol.trim()) {
      setError('Choose a symbol.')
      return
    }
    if (!form.entry.trim()) {
      setError('Enter your entry price.')
      return
    }
    if (!form.pnl.trim()) {
      setError('Enter your P/L amount.')
      return
    }
    addJournalEntry({
      date: form.date || todayInputValue(),
      symbol: form.symbol.trim().toUpperCase(),
      side: form.side,
      entry: form.entry.trim(),
      exit: form.exit.trim(),
      stopLoss: form.stopLoss.trim(),
      takeProfit: form.takeProfit.trim(),
      result: form.result,
      currency: form.currency,
      pnl: form.pnl.trim(),
      notes: form.notes.trim(),
    })
    setForm(emptyForm())
    setError('')
    setFormOpen(false)
    setEntries(listJournalEntries())
  }

  function onDelete(id: string) {
    if (!window.confirm('Delete this journal entry?')) return
    deleteJournalEntry(id)
    setEntries(listJournalEntries())
  }

  return (
    <div className="journal-page">
      <header className="journal-header animate-fade-up">
        <div>
          <h1 className="font-display">Trading Journal</h1>
          <p>Log your trades, review results, and build consistency.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary journal-add-btn"
          onClick={() => {
            setFormOpen((v) => !v)
            setError('')
          }}
        >
          <Plus size={16} /> {formOpen ? 'Close form' : 'New trade'}
        </button>
      </header>

      <div className="journal-stats animate-fade-up stagger-1">
        <article className="journal-stat panel">
          <span className="journal-stat-label">Trades</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="journal-stat panel">
          <span className="journal-stat-label">Win rate</span>
          <strong>{stats.winRate}%</strong>
        </article>
        <article className="journal-stat panel">
          <span className="journal-stat-label">Wins</span>
          <strong className="is-win">{stats.wins}</strong>
        </article>
        <article className="journal-stat panel">
          <span className="journal-stat-label">Losses</span>
          <strong className="is-loss">{stats.losses}</strong>
        </article>
        <article className="journal-stat panel">
          <span className="journal-stat-label">Breakeven</span>
          <strong>{stats.be}</strong>
        </article>
      </div>

      {formOpen && (
        <form className="journal-form panel panel-glow animate-fade-up" onSubmit={onSubmit}>
          <div className="journal-form-head">
            <NotebookPen size={18} />
            <h2>Log a trade</h2>
          </div>

          <div className="journal-form-grid">
            <label>
              <span>Date</span>
              <input
                className="field"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </label>
            <label>
              <span>Symbol</span>
              <select
                className="field"
                value={form.symbol}
                onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
              >
                {INSTRUMENTS.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Side</span>
              <select
                className="field"
                value={form.side}
                onChange={(e) => setForm((f) => ({ ...f, side: e.target.value as TradeSide }))}
              >
                {SIDES.map((side) => (
                  <option key={side} value={side}>
                    {side}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Result</span>
              <select
                className="field"
                value={form.result}
                onChange={(e) => setForm((f) => ({ ...f, result: e.target.value as TradeResult }))}
              >
                {RESULTS.map((result) => (
                  <option key={result} value={result}>
                    {result}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Entry</span>
              <input
                className="field"
                type="text"
                inputMode="decimal"
                placeholder="Entry price"
                value={form.entry}
                onChange={(e) => setForm((f) => ({ ...f, entry: e.target.value }))}
                required
              />
            </label>
            <label>
              <span>Exit</span>
              <input
                className="field"
                type="text"
                inputMode="decimal"
                placeholder="Exit price"
                value={form.exit}
                onChange={(e) => setForm((f) => ({ ...f, exit: e.target.value }))}
              />
            </label>
            <label>
              <span>Stop loss</span>
              <input
                className="field"
                type="text"
                inputMode="decimal"
                placeholder="SL"
                value={form.stopLoss}
                onChange={(e) => setForm((f) => ({ ...f, stopLoss: e.target.value }))}
              />
            </label>
            <label>
              <span>Take profit</span>
              <input
                className="field"
                type="text"
                inputMode="decimal"
                placeholder="TP"
                value={form.takeProfit}
                onChange={(e) => setForm((f) => ({ ...f, takeProfit: e.target.value }))}
              />
            </label>
            <label>
              <span>Account currency</span>
              <select
                className="field"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as AccountCurrency }))}
              >
                {ACCOUNT_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency} ({currencyPrefix(currency)})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>P/L amount</span>
              <div className="journal-pnl-input">
                <span className="journal-pnl-prefix" aria-hidden>
                  {currencyPrefix(form.currency)}
                </span>
                <input
                  className="field"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 120 or -45"
                  value={form.pnl}
                  onChange={(e) => setForm((f) => ({ ...f, pnl: e.target.value }))}
                  required
                />
              </div>
            </label>
            <label className="journal-notes-field">
              <span>Notes / lessons</span>
              <textarea
                className="field"
                rows={3}
                placeholder="What worked, what didn’t, emotions, setup…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>
          </div>

          {error ? <p className="journal-error">{error}</p> : null}

          <div className="journal-form-actions">
            <button type="submit" className="btn btn-primary">
              Save trade
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setForm(emptyForm())
                setFormOpen(false)
                setError('')
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="journal-list panel panel-glow animate-fade-up stagger-2">
        <div className="journal-list-head">
          <h2>Your trades</h2>
          <span className="text-muted">{entries.length} logged</span>
        </div>

        {entries.length === 0 ? (
          <div className="journal-empty">
            <NotebookPen size={28} />
            <p>No trades journaled yet.</p>
            <p className="text-muted">Click New trade to log your first setup.</p>
          </div>
        ) : (
          <div className="journal-entries">
            {entries.map((entry) => (
              <article key={entry.id} className="journal-entry">
                <div className="journal-entry-top">
                  <div className="journal-entry-title">
                    <strong>{entry.symbol}</strong>
                    <span className={`journal-side side-${entry.side.toLowerCase()}`}>{entry.side}</span>
                    <span className={`journal-result result-${entry.result.toLowerCase()}`}>{entry.result}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost journal-delete"
                    aria-label="Delete entry"
                    onClick={() => onDelete(entry.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="journal-entry-meta">
                  <span>{entry.date}</span>
                  <span>Entry {entry.entry}</span>
                  {entry.exit ? <span>Exit {entry.exit}</span> : null}
                  {entry.stopLoss ? <span>SL {entry.stopLoss}</span> : null}
                  {entry.takeProfit ? <span>TP {entry.takeProfit}</span> : null}
                  {entry.pnl ? (
                    <span className="journal-pnl">P/L {formatPnl(entry.pnl, entry.currency)}</span>
                  ) : null}
                </div>
                {entry.notes ? <p className="journal-entry-notes">{entry.notes}</p> : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
