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
          title="My Alerts"
          onEditScanner={() => setScannerOpen(true)}
          limit={40}
          loading={loading}
          liveFeed={liveFeed}
          emptyHint="No saved alerts for your symbols in the last 5 trading days. Add symbols to start scanning."
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
