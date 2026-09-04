import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Percent,
  PieChart,
  Plus,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  X,
} from 'lucide-react'
import { INSTRUMENTS } from '../data/mockData'
import { CumulativeChart, DailyBars, DonutChart, SymbolBars } from '../components/journal/JournalCharts'
import { JournalCalendar } from '../components/journal/JournalCalendar'
import {
  ACCOUNT_CURRENCIES,
  addJournalEntry,
  currencyPrefix,
  deleteJournalEntry,
  formatMoney,
  formatMoneyCompact,
  getJournal,
  groupJournalByDay,
  journalAnalytics,
  journalCurrencies,
  listJournalEntries,
  parsePnlAmount,
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
    rating: 0,
    notes: '',
  }
}

/** Keep Loss P/L amounts negative; strip forced minus for Win/Breakeven. */
function applyResultToPnl(result: TradeResult, pnl: string): string {
  const raw = pnl.trim()
  if (!raw) return result === 'Loss' ? '-' : ''
  const unsigned = raw.replace(/^[+-]+/, '').trim()
  if (!unsigned) return result === 'Loss' ? '-' : ''
  return result === 'Loss' ? `-${unsigned}` : unsigned
}

export function JournalDetail() {
  const { journalId = '' } = useParams()
  const navigate = useNavigate()
  const journal = useMemo(() => getJournal(journalId), [journalId])

  const [entries, setEntries] = useState<JournalEntry[]>(() => listJournalEntries(journalId))
  const [form, setForm] = useState(emptyForm)
  const [formOpen, setFormOpen] = useState(false)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [currency, setCurrency] = useState<AccountCurrency | null>(null)

  useEffect(() => {
    function refresh() {
      setEntries(listJournalEntries(journalId))
    }
    window.addEventListener('pkfx-journal-change', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('pkfx-journal-change', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [journalId])

  const currencies = useMemo(() => journalCurrencies(entries), [entries])
  const activeCurrency = currency && currencies.includes(currency) ? currency : (currencies[0] ?? 'USD')
  const stats = useMemo(() => journalAnalytics(entries, activeCurrency), [entries, activeCurrency])

  const visibleEntries = useMemo(
    () => entries.filter((e) => e.currency === activeCurrency),
    [entries, activeCurrency],
  )
  const dayGroups = useMemo(() => {
    const groups = groupJournalByDay(visibleEntries)
    return selectedDate ? groups.filter((g) => g.date === selectedDate) : groups
  }, [visibleEntries, selectedDate])

  if (!journal) {
    return (
      <div className="journals-page">
        <section className="journals-empty panel animate-fade-up">
          <p>That journal no longer exists.</p>
          <Link className="btn btn-primary" to="/trading-journal">
            Back to journals
          </Link>
        </section>
      </div>
    )
  }

  function setResult(result: TradeResult) {
    setForm((f) => ({ ...f, result, pnl: applyResultToPnl(result, f.pnl) }))
  }

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
    const pnl = applyResultToPnl(form.result, form.pnl)
    if (!pnl || pnl === '-' || pnl === '+') {
      setError('Enter your P/L amount.')
      return
    }
    addJournalEntry({
      journalId,
      date: form.date || todayInputValue(),
      symbol: form.symbol.trim().toUpperCase(),
      side: form.side,
      entry: form.entry.trim(),
      exit: form.exit.trim(),
      stopLoss: form.stopLoss.trim(),
      takeProfit: form.takeProfit.trim(),
      result: form.result,
      currency: form.currency,
      pnl,
      rating: form.rating,
      notes: form.notes.trim(),
    })
    setForm(emptyForm())
    setError('')
    setFormOpen(false)
    setCurrency(form.currency)
    setEntries(listJournalEntries(journalId))
  }

  function onDelete(id: string) {
    if (!window.confirm('Delete this journal entry?')) return
    deleteJournalEntry(id)
    setEntries(listJournalEntries(journalId))
  }

  const pnlTone = stats.totalPnl > 0 ? 'is-profit' : stats.totalPnl < 0 ? 'is-loss' : ''

  return (
    <div className="journal-detail-page">
      <header className="journal-detail-head animate-fade-up">
        <div className="journal-detail-title">
          <button
            type="button"
            className="journal-back"
            aria-label="Back to journals"
            onClick={() => navigate('/trading-journal')}
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-display">{journal.name}</h1>
        </div>
        <div className="journal-detail-actions">
          {currencies.length > 1 && (
            <select
              className="field journal-currency-select"
              aria-label="Account currency"
              value={activeCurrency}
              onChange={(e) => setCurrency(e.target.value as AccountCurrency)}
            >
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>
            <Plus size={16} /> Add Entry
          </button>
        </div>
      </header>

      <div className="journal-kpis animate-fade-up stagger-1">
        <article className="journal-kpi panel">
          <span className="journal-kpi-icon tone-neutral">
            <Activity size={15} />
          </span>
          <span className="journal-kpi-label">Total trades</span>
          <strong>{stats.totalTrades}</strong>
        </article>
        <article className="journal-kpi panel">
          <span className={`journal-kpi-icon ${stats.totalPnl < 0 ? 'tone-loss' : 'tone-profit'}`}>
            {stats.totalPnl < 0 ? <TrendingDown size={15} /> : <TrendingUp size={15} />}
          </span>
          <span className="journal-kpi-label">Total P&amp;L</span>
          <strong className={pnlTone}>{formatMoney(stats.totalPnl, activeCurrency)}</strong>
        </article>
        <article className="journal-kpi panel">
          <span className="journal-kpi-icon tone-warn">
            <Target size={15} />
          </span>
          <span className="journal-kpi-label">Win rate</span>
          <strong>{stats.winRate}%</strong>
        </article>
        <article className="journal-kpi panel">
          <span className="journal-kpi-icon tone-accent">
            <Star size={15} />
          </span>
          <span className="journal-kpi-label">Avg rating</span>
          <strong>{stats.avgRating === null ? '—' : stats.avgRating.toFixed(1)}</strong>
        </article>
      </div>

      <div className="journal-charts-row animate-fade-up stagger-2">
        <section className="journal-chart panel">
          <header className="journal-chart-head">
            <h3>
              <TrendingUp size={15} aria-hidden className="tone-profit" /> Cumulative P&amp;L
            </h3>
            <p>Running total of profit and loss over time</p>
          </header>
          <CumulativeChart points={stats.cumulative} />
        </section>

        <section className="journal-chart panel">
          <header className="journal-chart-head">
            <h3>
              <Target size={15} aria-hidden className="tone-warn" /> Win rate
            </h3>
            <p>
              {stats.wins}W · {stats.losses}L · {stats.breakeven}BE
            </p>
          </header>
          <DonutChart
            segments={[
              { value: stats.wins, tone: 'profit' },
              { value: stats.losses, tone: 'loss' },
              { value: stats.breakeven, tone: 'neutral' },
            ]}
            label={`${stats.winRate}%`}
            caption="win rate"
            emptyTone="neutral"
          />
        </section>
      </div>

      <div className="journal-charts-row is-triple animate-fade-up stagger-2">
        <section className="journal-chart panel">
          <header className="journal-chart-head">
            <h3>
              <PieChart size={15} aria-hidden className="tone-accent" /> Long / Short ratio
            </h3>
            <p>Direction distribution of trades</p>
          </header>
          <DonutChart
            segments={[
              { value: stats.longs, tone: 'profit' },
              { value: stats.shorts, tone: 'loss' },
            ]}
            label={String(stats.totalTrades)}
            caption="trades"
          />
          <ul className="journal-chart-legend">
            <li className="tone-profit">Long {stats.longs}</li>
            <li className="tone-loss">Short {stats.shorts}</li>
          </ul>
        </section>

        <section className="journal-chart panel">
          <header className="journal-chart-head">
            <h3>
              <Trophy size={15} aria-hidden className="tone-accent" /> Most lucrative instrument
            </h3>
            <p>P&amp;L by symbol</p>
          </header>
          <SymbolBars rows={stats.bySymbol} />
        </section>

        <section className="journal-chart panel">
          <header className="journal-chart-head">
            <h3>
              <BarChart3 size={15} aria-hidden className="tone-accent" /> Daily P&amp;L
            </h3>
            <p>Profit and loss per trading day</p>
          </header>
          <DailyBars points={stats.daily} />
        </section>
      </div>

      <div className="journal-kpis is-secondary animate-fade-up stagger-3">
        <article className="journal-kpi panel">
          <span className="journal-kpi-icon tone-profit">
            <TrendingUp size={15} />
          </span>
          <span className="journal-kpi-label">Avg win</span>
          <strong className="is-profit">
            {stats.avgWin > 0 ? `+${formatMoney(stats.avgWin, activeCurrency)}` : formatMoney(0, activeCurrency)}
          </strong>
        </article>
        <article className="journal-kpi panel">
          <span className="journal-kpi-icon tone-loss">
            <TrendingDown size={15} />
          </span>
          <span className="journal-kpi-label">Avg loss</span>
          <strong className={stats.avgLoss < 0 ? 'is-loss' : ''}>
            {formatMoney(stats.avgLoss, activeCurrency)}
          </strong>
        </article>
        <article className="journal-kpi panel">
          <span className="journal-kpi-icon tone-warn">
            <Percent size={15} />
          </span>
          <span className="journal-kpi-label">Profit factor</span>
          <strong>{stats.profitFactor.toFixed(2)}</strong>
        </article>
        <article className="journal-kpi panel">
          <span className="journal-kpi-icon tone-neutral">
            <BarChart3 size={15} />
          </span>
          <span className="journal-kpi-label">Best day</span>
          <strong className={stats.bestDay && stats.bestDay.value > 0 ? 'is-profit' : ''}>
            {stats.bestDay
              ? `${currencyPrefix(activeCurrency)}${formatMoneyCompact(stats.bestDay.value)}`
              : '—'}
          </strong>
        </article>
      </div>

      <div className="animate-fade-up stagger-3">
        <JournalCalendar
          entries={visibleEntries}
          currency={activeCurrency}
          selectedDate={selectedDate}
          onSelectDate={(date) => setSelectedDate((prev) => (prev === date ? '' : date))}
        />
      </div>

      <section className="journal-list panel animate-fade-up stagger-3">
        <div className="journal-list-head">
          <h2>{selectedDate ? 'Trades on selected day' : 'Trade log'}</h2>
          {selectedDate ? (
            <button type="button" className="btn btn-ghost journal-clear-day" onClick={() => setSelectedDate('')}>
              Show all
            </button>
          ) : (
            <span className="text-muted">{visibleEntries.length} logged</span>
          )}
        </div>

        {dayGroups.length === 0 ? (
          <div className="journal-empty">
            <p>{selectedDate ? 'No trades on that day.' : 'No trades logged in this journal yet.'}</p>
            <p className="text-muted">Use Add Entry to record your first trade.</p>
          </div>
        ) : (
          <div className="journal-days">
            {dayGroups.map((day) => (
              <section key={day.date} className="journal-day" aria-label={day.label}>
                <header className="journal-day-head">
                  <div className="journal-day-title">
                    <h3>{day.label}</h3>
                    <span className="text-muted">
                      {day.entries.length} trade{day.entries.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {day.totals.map((total) => (
                    <div
                      key={total.currency}
                      className={`journal-day-pnl ${total.total > 0 ? 'is-win' : total.total < 0 ? 'is-loss' : ''}`}
                    >
                      <span className="journal-day-pnl-label">Day P/L</span>
                      <strong>{formatMoney(total.total, total.currency)}</strong>
                    </div>
                  ))}
                </header>

                <div className="journal-entries">
                  {day.entries.map((entry) => (
                    <article key={entry.id} className="journal-entry">
                      <div className="journal-entry-top">
                        <div className="journal-entry-title">
                          <strong>{entry.symbol}</strong>
                          <span className={`journal-side side-${entry.side.toLowerCase()}`}>
                            {entry.side === 'Buy' ? 'Long' : 'Short'}
                          </span>
                          <span className={`journal-result result-${entry.result.toLowerCase()}`}>
                            {entry.result}
                          </span>
                          {entry.rating > 0 && (
                            <span className="journal-entry-rating" aria-label={`Rated ${entry.rating} of 5`}>
                              {'★'.repeat(entry.rating)}
                              <span className="is-dim">{'★'.repeat(5 - entry.rating)}</span>
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost journal-delete"
                          aria-label="Delete entry"
                          onClick={() => onDelete(entry.id)}
                        >
                          <X size={15} />
                        </button>
                      </div>
                      <div className="journal-entry-meta">
                        <span>Entry {entry.entry}</span>
                        {entry.exit ? <span>Exit {entry.exit}</span> : null}
                        {entry.stopLoss ? <span>SL {entry.stopLoss}</span> : null}
                        {entry.takeProfit ? <span>TP {entry.takeProfit}</span> : null}
                        <span className="journal-pnl">
                          P/L {formatMoney(parsePnlAmount(entry.pnl) || 0, entry.currency)}
                        </span>
                      </div>
                      {entry.notes ? <p className="journal-entry-notes">{entry.notes}</p> : null}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      {formOpen &&
        createPortal(
          <div className="overlay journal-overlay" onClick={() => setFormOpen(false)}>
            <div
              className="modal modal-wide journal-modal animate-fade-up"
              role="dialog"
              aria-modal="true"
              aria-labelledby="journal-entry-title"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={() => setFormOpen(false)}
              >
                <X size={16} />
              </button>
              <h2 id="journal-entry-title" className="font-display">
                Add entry
              </h2>
              <p className="journal-modal-sub">Logging to {journal.name}</p>

              <form className="journal-form" onSubmit={onSubmit}>
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
                    <span>Direction</span>
                    <select
                      className="field"
                      value={form.side}
                      onChange={(e) => setForm((f) => ({ ...f, side: e.target.value as TradeSide }))}
                    >
                      {SIDES.map((side) => (
                        <option key={side} value={side}>
                          {side === 'Buy' ? 'Long (Buy)' : 'Short (Sell)'}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Result</span>
                    <select
                      className="field"
                      value={form.result}
                      onChange={(e) => setResult(e.target.value as TradeResult)}
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
                      onChange={(e) =>
                        setForm((f) => ({ ...f, currency: e.target.value as AccountCurrency }))
                      }
                    >
                      {ACCOUNT_CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c} ({currencyPrefix(c)})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>P/L amount</span>
                    <div className={`journal-pnl-input ${form.result === 'Loss' ? 'is-loss' : ''}`}>
                      <span className="journal-pnl-prefix" aria-hidden>
                        {form.result === 'Loss'
                          ? `-${currencyPrefix(form.currency)}`
                          : currencyPrefix(form.currency)}
                      </span>
                      <input
                        className="field"
                        type="text"
                        inputMode="decimal"
                        placeholder={form.result === 'Loss' ? 'e.g. 45' : 'e.g. 120'}
                        value={form.result === 'Loss' ? form.pnl.replace(/^-/, '') : form.pnl}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, pnl: applyResultToPnl(f.result, e.target.value) }))
                        }
                        required
                      />
                    </div>
                  </label>
                  <fieldset className="journal-rating-field">
                    <legend>Execution rating</legend>
                    <div className="journal-rating">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`journal-star ${form.rating >= value ? 'is-on' : ''}`}
                          aria-label={`Rate ${value} of 5`}
                          aria-pressed={form.rating === value}
                          onClick={() =>
                            setForm((f) => ({ ...f, rating: f.rating === value ? 0 : value }))
                          }
                        >
                          <Star size={17} fill={form.rating >= value ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                    </div>
                  </fieldset>
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
                  <button type="button" className="btn btn-outline" onClick={() => setFormOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save trade
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
