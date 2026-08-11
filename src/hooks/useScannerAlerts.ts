import { useEffect, useState } from 'react'
import type { Alert } from '../data/mockData'
import { getAlerts, syncAlertsForSymbols } from '../alerts'
import { getScannerSymbols } from '../scanner'

/** Live market alert sync for dashboard / alerts pages. */
export function useScannerAlerts() {
  const [symbols, setSymbols] = useState<string[]>(() => getScannerSymbols())
  const [alerts, setAlerts] = useState<Alert[]>(() =>
    getAlerts().filter((a) => getScannerSymbols().includes(a.asset)),
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
        setAlerts(next)
        setLiveFeed(next.some((a) => a.live))
      } catch {
        if (!cancelled) setAlerts(getAlerts().filter((a) => syms.includes(a.asset)))
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
        setAlerts(detail)
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
    setAlerts(alertsNext)
    setLiveFeed(alertsNext.some((a) => a.live))
    setLoading(false)
  }

  return { symbols, setSymbols, alerts, setAlerts, loading, liveFeed, reloadWithSymbols }
}
