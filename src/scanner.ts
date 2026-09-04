import { INSTRUMENTS, type Instrument } from './data/mockData'

const SCANNER_KEY = 'pkfx_scanner_symbols'

const DEFAULT_SYMBOLS: Instrument[] = ['GOLD']

function readSymbols(): string[] {
  try {
    const raw = localStorage.getItem(SCANNER_KEY)
    if (!raw) return [...DEFAULT_SYMBOLS]
    const parsed = JSON.parse(raw) as string[]
    if (!Array.isArray(parsed)) return [...DEFAULT_SYMBOLS]
    return parsed.filter((s) => (INSTRUMENTS as readonly string[]).includes(s))
  } catch {
    return [...DEFAULT_SYMBOLS]
  }
}

function writeSymbols(symbols: string[]) {
  localStorage.setItem(SCANNER_KEY, JSON.stringify(symbols))
  window.dispatchEvent(new CustomEvent('pkfx-scanner-change', { detail: symbols }))
}

export function getScannerSymbols(): string[] {
  return readSymbols()
}

export function setScannerSymbols(symbols: string[]) {
  const unique = [...new Set(symbols.filter((s) => (INSTRUMENTS as readonly string[]).includes(s)))]
  writeSymbols(unique)
}

export function addScannerSymbol(symbol: string) {
  const current = readSymbols()
  if (!current.includes(symbol) && (INSTRUMENTS as readonly string[]).includes(symbol)) {
    writeSymbols([...current, symbol])
  }
}

export function removeScannerSymbol(symbol: string) {
  writeSymbols(readSymbols().filter((s) => s !== symbol))
}

export function toggleScannerSymbol(symbol: string) {
  const current = readSymbols()
  if (current.includes(symbol)) {
    writeSymbols(current.filter((s) => s !== symbol))
  } else if ((INSTRUMENTS as readonly string[]).includes(symbol)) {
    writeSymbols([...current, symbol])
  }
}
