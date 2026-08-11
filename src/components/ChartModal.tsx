import { useEffect, useRef } from 'react'
import { tradingViewSymbol } from '../data/mockData'
import './ChartModal.css'

interface ChartModalProps {
  asset: string
  onClose: () => void
}

export function ChartModal({ asset, onClose }: ChartModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const symbol = tradingViewSymbol(asset)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    el.innerHTML = ''
    const widget = document.createElement('div')
    widget.className = 'tradingview-widget-container__widget'
    widget.style.height = '100%'
    widget.style.width = '100%'
    el.appendChild(widget)

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: '60',
      timezone: 'Etc/UTC',
      theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark',
      style: '1',
      locale: 'en',
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
    })
    el.appendChild(script)

    return () => {
      el.innerHTML = ''
    }
  }, [symbol])

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div
        className="modal chart-modal animate-fade-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chart-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chart-modal-header">
          <h2 id="chart-title" className="font-display">
            {asset} <span className="chart-symbol">· TradingView</span>
          </h2>
          <button type="button" className="modal-close chart-close" aria-label="Close chart" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="chart-frame tradingview-widget-container" ref={containerRef} />
        <a
          className="chart-open-tv"
          href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`}
          target="_blank"
          rel="noreferrer"
        >
          Open in TradingView ↗
        </a>
      </div>
    </div>
  )
}
