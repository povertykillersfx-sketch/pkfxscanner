import { useEffect, useState } from 'react'
import { AlertsPanel } from '../components/AlertCard'
import { ScannerModal } from '../components/ScannerModal'
import { StatsRow } from '../components/StatsRow'
import type { Alert } from '../data/mockData'
import { getAlertsForSymbols } from '../alerts'
import { getScannerSymbols } from '../scanner'
import './Dashboard.css'

export function AlertsPage() {
  const [scannerOpen, setScannerOpen] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>(() => getAlertsForSymbols(getScannerSymbols()))

  useEffect(() => {
    function refresh(next?: string[]) {
      const syms = next ?? getScannerSymbols()
      setAlerts(getAlertsForSymbols(syms))
    }
    function onScanner(e: Event) {
      const detail = (e as CustomEvent<string[]>).detail
      refresh(Array.isArray(detail) ? detail : undefined)
    }
    const timer = window.setInterval(() => refresh(), 60_000)
    window.addEventListener('pkfx-scanner-change', onScanner)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('pkfx-scanner-change', onScanner)
    }
  }, [])

  return (
    <div className="dashboard-page">
      <div className="dashboard-top">
        <AlertsPanel
          alerts={alerts}
          onEditScanner={() => setScannerOpen(true)}
          limit={12}
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
          onSaved={(next) => {
            setAlerts(getAlertsForSymbols(next))
          }}
        />
      )}
    </div>
  )
}
