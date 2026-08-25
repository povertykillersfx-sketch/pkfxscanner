import { useId, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { tradingViewSymbol } from '../data/mockData'
import './ChartModal.css'

declare global {
  interface Window {
    TradingView?: {
      widget: new (options: Record<string, unknown>) => unknown
    }
  }
}

interface PairChartModalProps {
  pair: string
  title?: string
  onClose: () => void
}

function loadTvScript(): Promise<void> {
  if (window.TradingView) return Promise.resolve()
  const existing = document.querySelector<HTMLScriptElement>('script[data-pkfx-tv]')
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('tv.js failed')))
      if (window.TradingView) resolve()
    })
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.dataset.pkfxTv = '1'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('tv.js failed'))
    document.body.appendChild(script)
  })
}

export function PairChartModal({ pair, title, onClose }: PairChartModalProps) {
  const symbol = tradingViewSymbol(pair)
  const containerId = `pkfx_tv_pair_${useId().replace(/:/g, '')}`
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.classList.add('chart-open')
    return () => {
      document.body.style.overflow = prev
      document.documentElement.classList.remove('chart-open')
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    setReady(false)
    setError('')
    void loadTvScript()
      .then(() => {
        if (cancelled || !window.TradingView) return
        const el = document.getElementById(containerId)
        if (el) el.innerHTML = ''
        // eslint-disable-next-line no-new
        new window.TradingView.widget({
          symbol,
          interval: '15',
          timezone: 'Africa/Johannesburg',
          theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#120424',
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          container_id: containerId,
          width: '100%',
          height: '100%',
        })
        if (!cancelled) setReady(true)
      })
      .catch(() => {
        if (!cancelled) setError('Chart failed to load.')
      })
    return () => {
      cancelled = true
    }
  }, [containerId, symbol])

  return createPortal(
    <div className="chart-desktop" role="dialog" aria-modal="true" aria-label={`${pair} chart`}>
      <header className="chart-desktop-bar">
        <h2 className="font-display">
          {title || pair} <span className="chart-symbol">{symbol}</span>
        </h2>
        <div className="chart-desktop-actions">
          <button
            type="button"
            className="chart-desktop-close"
            onClick={onClose}
            aria-label="Close chart"
          >
            <X size={18} />
          </button>
        </div>
      </header>
      <div className="chart-desktop-frame">
        {!ready && !error ? <p className="chart-loading">Loading chart…</p> : null}
        {error ? <p className="chart-loading">{error}</p> : null}
        <div id={containerId} className="chart-tv-host" />
      </div>
    </div>,
    document.body,
  )
}
