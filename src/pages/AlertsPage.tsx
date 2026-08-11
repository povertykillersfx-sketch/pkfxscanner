import { useState } from 'react'
import { AlertsPanel } from '../components/AlertCard'
import { ScannerModal } from '../components/ScannerModal'
import { StatsRow } from '../components/StatsRow'
import { ALERTS } from '../data/mockData'
import './Dashboard.css'

export function AlertsPage() {
  const [scannerOpen, setScannerOpen] = useState(false)

  return (
    <div className="dashboard-page">
      <div className="dashboard-top">
        <AlertsPanel
          alerts={ALERTS}
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
      <StatsRow />
      {scannerOpen && <ScannerModal onClose={() => setScannerOpen(false)} />}
    </div>
  )
}
