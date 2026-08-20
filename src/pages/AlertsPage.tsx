import { useState } from 'react'
import { AlertsPanel } from '../components/AlertCard'
import { HowItWorksPanel } from '../components/HowItWorksPanel'
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
          limit={24}
          loading={loading}
          liveFeed={liveFeed}
        />
        <HowItWorksPanel />
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
