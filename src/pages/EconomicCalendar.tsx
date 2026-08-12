import { useEffect, useRef } from 'react'
import { useTheme } from '../theme'
import './EconomicCalendar.css'

const FOREX_CURRENCIES = 'USD,EUR,JPY,GBP,CHF,AUD,CAD,NZD,CNY'

export function EconomicCalendar() {
  const { theme } = useTheme()
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    host.innerHTML = ''

    const widget = document.createElement('div')
    widget.className = 'tradingview-widget-container__widget'
    host.appendChild(widget)

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      colorTheme: theme === 'light' ? 'light' : 'dark',
      isTransparent: true,
      width: '100%',
      height: '100%',
      locale: 'en',
      importanceFilter: '-1,0,1',
      currencyFilter: FOREX_CURRENCIES,
    })
    host.appendChild(script)

    return () => {
      host.innerHTML = ''
    }
  }, [theme])

  return (
    <div className="econ-calendar-page">
      <header className="econ-calendar-header animate-fade-up">
        <h1 className="font-display">Economic Calendar</h1>
        <p>Live forex market events — USD, EUR, GBP, JPY, and major currencies.</p>
      </header>

      <div className="econ-calendar-frame panel panel-glow animate-fade-up stagger-1">
        <div className="tradingview-widget-container econ-calendar-widget" ref={hostRef} />
      </div>
    </div>
  )
}
