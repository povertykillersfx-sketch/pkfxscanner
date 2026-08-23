import { useState } from 'react'
import { AlertsPanel } from '../components/AlertCard'
import { HowItWorksPanel } from '../components/HowItWorksPanel'
import { ScannerModal } from '../components/ScannerModal'
import { StatsRow } from '../components/StatsRow'
import { useScannerAlerts } from '../hooks/useScannerAlerts'
import './Dashboard.css'

export function Dashboard() {
  const [scannerOpen, setScannerOpen] = useState(false)
  const { todaysAlerts, alerts, symbols, loading, liveFeed, reloadWithSymbols } = useScannerAlerts()

  return (
    <div className="dashboard-page">
      <div className="dashboard-top">
        <AlertsPanel
          alerts={todaysAlerts}
          symbols={symbols}
          title="Today’s Alerts"
          todayOnly
          onEditScanner={() => setScannerOpen(true)}
          limit={24}
          loading={loading}
          liveFeed={liveFeed}
          emptyHint="No alerts for today yet. Add symbols or wait for the next session open."
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
