import { useState } from 'react'
import { AlertsPanel } from '../components/AlertCard'
import { ScannerModal } from '../components/ScannerModal'
import { StatsRow } from '../components/StatsRow'
import { useScannerAlerts } from '../hooks/useScannerAlerts'
import './Dashboard.css'

export function AlertsPage() {
  const [scannerOpen, setScannerOpen] = useState(false)
  const { alerts, symbols, loading, liveFeed, reloadWithSymbols } = useScannerAlerts()

  return (
    <div className="dashboard-page">
      <div className="dashboard-top">
        <AlertsPanel
          alerts={alerts}
          symbols={symbols}
          onEditScanner={() => setScannerOpen(true)}
          limit={12}
          loading={loading}
          liveFeed={liveFeed}
        />
        <aside className="how-it-works panel animate-fade-up stagger-2">
          <h2 className="font-display">How it works?</h2>
          <div className="video-frame">
            <div className="video-thumb">
              <div className="video-thumb-content">
                <p className="video-eyebrow">PKFX PROTOCOL</p>
                <p className="video-title">How To Use PKFX</p>
                <p className="video-sub">(Live market + AI alerts)</p>
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
            void reloadWithSymbols(next)
          }}
        />
      )}
    </div>
  )
}
