import { useEffect, useMemo, useState } from 'react'
import type { Alert } from '../data/mockData'
import {
  getAlerts,
  getCurrentTrades,
  organizeAlertsForScanner,
  syncAlertsForSymbols,
} from '../alerts'
import { getScannerSymbols } from '../scanner'

/** Live market alert sync for dashboard / alerts pages. */
export function useScannerAlerts() {
  const [symbols, setSymbols] = useState<string[]>(() => getScannerSymbols())
  const [alerts, setAlerts] = useState<Alert[]>(() =>
    organizeAlertsForScanner(
      getAlerts().filter((a) => getScannerSymbols().includes(a.asset)),
      getScannerSymbols(),
    ),
  )
  const [loading, setLoading] = useState(true)
  const [liveFeed, setLiveFeed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function refresh(nextSymbols?: string[]) {
      const syms = nextSymbols ?? getScannerSymbols()
      if (!cancelled) {
        setSymbols(syms)
        setLoading(true)
      }
      try {
        const next = await syncAlertsForSymbols(syms)
        if (cancelled) return
        setAlerts(organizeAlertsForScanner(next, syms))
        setLiveFeed(next.some((a) => a.live))
      } catch {
        if (!cancelled) {
          setAlerts(
            organizeAlertsForScanner(
              getAlerts().filter((a) => syms.includes(a.asset)),
              syms,
            ),
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    function onScanner(e: Event) {
      const detail = (e as CustomEvent<string[]>).detail
      void refresh(Array.isArray(detail) ? detail : undefined)
    }

    function onAlerts(e: Event) {
      const detail = (e as CustomEvent<Alert[]>).detail
      if (Array.isArray(detail) && !cancelled) {
        const syms = getScannerSymbols()
        setAlerts(organizeAlertsForScanner(detail.filter((a) => syms.includes(a.asset)), syms))
        setLiveFeed(detail.some((a) => a.live))
        setLoading(false)
      }
    }

    void refresh()
    const timer = window.setInterval(() => void refresh(), 60_000)

    window.addEventListener('pkfx-scanner-change', onScanner)
    window.addEventListener('pkfx-alerts-change', onAlerts)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('pkfx-scanner-change', onScanner)
      window.removeEventListener('pkfx-alerts-change', onAlerts)
    }
  }, [])

  async function reloadWithSymbols(next: string[]) {
    setSymbols(next)
    setLoading(true)
    const alertsNext = await syncAlertsForSymbols(next)
    setAlerts(organizeAlertsForScanner(alertsNext, next))
    setLiveFeed(alertsNext.some((a) => a.live))
    setLoading(false)
  }

  const currentTrades = useMemo(() => getCurrentTrades(alerts, symbols), [alerts, symbols])

  return {
    symbols,
    setSymbols,
    alerts,
    currentTrades,
    setAlerts,
    loading,
    liveFeed,
    reloadWithSymbols,
  }
}
