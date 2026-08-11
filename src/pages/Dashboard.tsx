import { useEffect, useState } from 'react'
import { AlertsPanel } from '../components/AlertCard'
import { ScannerModal } from '../components/ScannerModal'
import { StatsRow } from '../components/StatsRow'
import type { Alert } from '../data/mockData'
import { getAlertsForSymbols } from '../alerts'
import { getScannerSymbols } from '../scanner'
import './Dashboard.css'

function useScannerAlerts() {
  const [symbols, setSymbols] = useState<string[]>(() => getScannerSymbols())
  const [alerts, setAlerts] = useState<Alert[]>(() => getAlertsForSymbols(getScannerSymbols()))

  useEffect(() => {
    function refresh(nextSymbols?: string[]) {
      const syms = nextSymbols ?? getScannerSymbols()
      setSymbols(syms)
      setAlerts(getAlertsForSymbols(syms))
    }

    function onScanner(e: Event) {
      const detail = (e as CustomEvent<string[]>).detail
      refresh(Array.isArray(detail) ? detail : undefined)
    }

    function onAlerts(e: Event) {
      const detail = (e as CustomEvent<Alert[]>).detail
      if (Array.isArray(detail)) setAlerts(detail)
      else refresh()
    }

    // Re-check sessions periodically so new session signals appear without wiping old ones
    const timer = window.setInterval(() => refresh(), 60_000)

    window.addEventListener('pkfx-scanner-change', onScanner)
    window.addEventListener('pkfx-alerts-change', onAlerts)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('pkfx-scanner-change', onScanner)
      window.removeEventListener('pkfx-alerts-change', onAlerts)
    }
  }, [])

  return { symbols, setSymbols, alerts, setAlerts }
}

export function Dashboard() {
  const [scannerOpen, setScannerOpen] = useState(false)
  const { alerts, setAlerts, setSymbols } = useScannerAlerts()

  return (
    <div className="dashboard-page">
      <div className="dashboard-top">
        <AlertsPanel
          alerts={alerts}
          onEditScanner={() => setScannerOpen(true)}
          limit={8}
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
            setSymbols(next)
            setAlerts(getAlertsForSymbols(next))
          }}
        />
      )}
    </div>
  )
}
