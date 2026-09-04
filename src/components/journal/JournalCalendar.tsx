import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  formatMoneyCompact,
  journalCalendarMonth,
  type AccountCurrency,
  type JournalEntry,
} from '../../tradingJournal'
import './JournalCalendar.css'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

interface JournalCalendarProps {
  entries: JournalEntry[]
  currency: AccountCurrency
  selectedDate?: string
  onSelectDate?: (date: string) => void
}

export function JournalCalendar({
  entries,
  currency,
  selectedDate,
  onSelectDate,
}: JournalCalendarProps) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const month = useMemo(
    () => journalCalendarMonth(entries, cursor.year, cursor.month, currency),
    [entries, cursor, currency],
  )

  function shift(step: number) {
    setCursor(({ year, month: m }) => {
      const next = new Date(year, m + step, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  return (
    <section className="journal-calendar panel">
      <header className="journal-calendar-head">
        <h3>
          <CalendarDays size={15} aria-hidden />
          {month.label}
        </h3>
        <div className="journal-calendar-nav">
          <button type="button" aria-label="Previous month" onClick={() => shift(-1)}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" aria-label="Next month" onClick={() => shift(1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

      <div className="journal-calendar-weekdays" aria-hidden>
        {WEEKDAYS.map((day, i) => (
          <span key={`${day}-${i}`}>{day}</span>
        ))}
      </div>

      <div className="journal-calendar-grid">
        {month.cells.map((cell, i) =>
          cell.date ? (
            <button
              key={cell.date}
              type="button"
              className={`journal-day-cell tone-${cell.tone}${cell.isToday ? ' is-today' : ''}${
                selectedDate === cell.date ? ' is-selected' : ''
              }`}
              onClick={() => onSelectDate?.(cell.date)}
              aria-label={`${cell.date}: ${cell.trades} trade${cell.trades === 1 ? '' : 's'}`}
            >
              <span className="journal-day-num">{cell.day}</span>
              {cell.trades > 0 && (
                <span className="journal-day-total">{formatMoneyCompact(cell.total)}</span>
              )}
            </button>
          ) : (
            <span key={`pad-${i}`} className="journal-day-cell is-pad" />
          ),
        )}
      </div>

      <footer className="journal-calendar-legend">
        <span className="legend-item tone-profit">Profit</span>
        <span className="legend-item tone-loss">Loss</span>
        <span className="legend-item tone-breakeven">Breakeven</span>
        <span className="legend-item tone-none">No trades</span>
      </footer>
    </section>
  )
}
