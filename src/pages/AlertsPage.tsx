import { useEffect, useState } from 'react'
import { AlertsPanel } from '../components/AlertCard'
import { ScannerModal } from '../components/ScannerModal'
import { StatsRow } from '../components/StatsRow'
import { alertsForSymbols } from '../data/mockData'
import { getScannerSymbols } from '../scanner'
import './Dashboard.css'

export function AlertsPage() {
  const [scannerOpen, setScannerOpen] = useState(false)
  const [symbols, setSymbols] = useState<string[]>(() => getScannerSymbols())

  useEffect(() => {
    function onChange(e: Event) {
      const detail = (e as CustomEvent<string[]>).detail
      setSymbols(Array.isArray(detail) ? detail : getScannerSymbols())
    }
    window.addEventListener('pkfx-scanner-change', onChange)
    return () => window.removeEventListener('pkfx-scanner-change', onChange)
  }, [])

  const alerts = alertsForSymbols(symbols)

  return (
    <div className="dashboard-page">
      <div className="dashboard-top">
        <AlertsPanel
          alerts={alerts}
          onEditScanner={() => setScannerOpen(true)}
          limit={6}
        />
        <aside className="how-it-works panel animate-fade-up stagger-2">
          <h2 className="font-display">How it works?</h2>
          <div className="video-frame">
            <div className="video-thumb">
              <div className="video-thumb-content">
                <p className="video-eyebrow">PKFX PROTOCOL</p>
                <p className="video-title">How To Use PKFX</p>
                <p className="video-sub">(AI Powered Alerts)</p>
              </div>
              <button type="button" className="play-btn" aria-label="Play video">
                ▶
              </button>
            </div>
          </div>
        </aside>
      </div>
      <StatsRow savedAlerts={alerts.length} />
      {scannerOpen && (
        <ScannerModal
          onClose={() => setScannerOpen(false)}
          onSaved={(next) => setSymbols(next)}
        />
      )}
    </div>
  )
}
