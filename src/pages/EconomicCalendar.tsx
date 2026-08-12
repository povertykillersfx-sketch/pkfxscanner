import { useEffect, useMemo, useState } from 'react'
import {
  flagEmoji,
  loadForexCalendar,
  type CalendarEvent,
} from '../forexCalendar'
import './EconomicCalendar.css'

const TIME_ZONE = 'Africa/Johannesburg'

function formatDayLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: TIME_ZONE,
  }).format(date)
}

function formatDayKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: TIME_ZONE,
  }).format(date)
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TIME_ZONE,
  }).format(date)
}

function groupByDay(events: CalendarEvent[]): { key: string; label: string; events: CalendarEvent[] }[] {
  const map = new Map<string, { label: string; events: CalendarEvent[] }>()
  for (const event of events) {
    const key = formatDayKey(event.date)
    const existing = map.get(key)
    if (existing) existing.events.push(event)
    else map.set(key, { label: formatDayLabel(event.date), events: [event] })
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, value]) => ({
      key,
      label: value.label,
      events: value.events.sort((a, b) => a.date.getTime() - b.date.getTime()),
    }))
}

function ImpactBars({ impact }: { impact: CalendarEvent['impact'] }) {
  const level = impact === 'High' ? 3 : impact === 'Medium' ? 2 : impact === 'Holiday' ? 0 : 1
  return (
    <span className={`econ-impact impact-${impact.toLowerCase()}`} aria-label={`${impact} impact`} title={`${impact} impact`}>
      <i data-on={level >= 1} />
      <i data-on={level >= 2} />
      <i data-on={level >= 3} />
    </span>
  )
}

export function EconomicCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const next = await loadForexCalendar()
        if (!cancelled) setEvents(next)
      } catch {
        if (!cancelled) setError('Could not load the forex economic calendar. Try again shortly.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    const timer = window.setInterval(() => void load(), 5 * 60_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const days = useMemo(() => groupByDay(events), [events])

  return (
    <div className="econ-calendar-page">
      <header className="econ-calendar-header animate-fade-up">
        <h1 className="font-display">Economic Calendar</h1>
        <p>Live forex market events — USD, EUR, GBP, JPY, and major currencies (SAST).</p>
      </header>

      <div className="econ-calendar-frame panel panel-glow animate-fade-up stagger-1">
        {loading && events.length === 0 ? (
          <p className="econ-status">Loading calendar…</p>
        ) : null}
        {error ? <p className="econ-status econ-error">{error}</p> : null}

        {!loading && !error && days.length === 0 ? (
          <p className="econ-status">No forex events found for this week.</p>
        ) : null}

        <div className="econ-table" role="table" aria-label="Forex economic calendar">
          {days.map((day) => (
            <section key={day.key} className="econ-day">
              <div className="econ-day-head" role="row">
                <div className="econ-day-title" role="columnheader">
                  {day.label}
                </div>
                <div className="econ-h-actual" role="columnheader">
                  Actual
                </div>
                <div className="econ-h-forecast" role="columnheader">
                  Forecast
                </div>
                <div className="econ-h-prior" role="columnheader">
                  Prior
                </div>
              </div>

              {day.events.map((event, index) => {
                const prev = day.events[index - 1]
                const sameGroup =
                  !!prev &&
                  prev.date.getTime() === event.date.getTime() &&
                  prev.country === event.country

                return (
                  <div key={event.id} className="econ-row" role="row">
                    <div className="econ-time" role="cell">
                      {sameGroup ? '' : formatTime(event.date)}
                    </div>
                    <div className="econ-country" role="cell">
                      {sameGroup ? null : (
                        <>
                          <span className="econ-flag" aria-hidden>
                            {flagEmoji(event.country)}
                          </span>
                          <span className="econ-country-name">{event.countryName}</span>
                        </>
                      )}
                    </div>
                    <div className="econ-impact-cell" role="cell">
                      <ImpactBars impact={event.impact} />
                    </div>
                    <div className="econ-event" role="cell">
                      {event.title}
                    </div>
                    <div className="econ-actual" role="cell">
                      {event.actual}
                    </div>
                    <div className="econ-forecast" role="cell">
                      {event.forecast}
                    </div>
                    <div className="econ-prior" role="cell">
                      {event.prior}
                    </div>
                  </div>
                )
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
