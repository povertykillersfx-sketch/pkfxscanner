import { useMemo, useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { INSTRUMENTS } from '../data/mockData'
import { getScannerSymbols, setScannerSymbols } from '../scanner'
import './ScannerModal.css'

interface ScannerModalProps {
  onClose: () => void
  onSaved?: (symbols: string[]) => void
}

export function ScannerModal({ onClose, onSaved }: ScannerModalProps) {
  const [selected, setSelected] = useState<string[]>(() => getScannerSymbols())
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase()
    if (!q) return [...INSTRUMENTS]
    return INSTRUMENTS.filter((s) => s.includes(q))
  }, [query])

  function toggle(symbol: string) {
    setSelected((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol],
    )
  }

  function remove(symbol: string) {
    setSelected((prev) => prev.filter((s) => s !== symbol))
  }

  function addAllVisible() {
    setSelected((prev) => [...new Set([...prev, ...filtered])])
  }

  function clearAll() {
    setSelected([])
  }

  function handleSave() {
    setScannerSymbols(selected)
    onSaved?.(selected)
    onClose()
  }

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div
        className="modal modal-wide scanner-modal animate-fade-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scanner-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        <h2 id="scanner-title" className="scanner-title font-display">
          Create your Scanner <span aria-hidden>🚀</span>
        </h2>
        <p className="scanner-desc">
          Every time a trade alert for your selected instruments is identified, we will notify you.
          Add or remove symbols below — they appear on your dashboard.
        </p>

        <div className="scanner-selected">
          <div className="scanner-selected-head">
            <span>
              Currently Scanning: <strong>{selected.length ? selected.join(', ') : 'None'}</strong>
            </span>
            {selected.length > 0 && (
              <button type="button" className="scanner-clear" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>
          <div className="scanner-chips">
            {selected.length === 0 && <p className="scanner-empty">No symbols selected yet.</p>}
            {selected.map((symbol) => (
              <button
                key={symbol}
                type="button"
                className="scanner-chip"
                onClick={() => remove(symbol)}
                title={`Remove ${symbol}`}
              >
                {symbol}
                <Trash2 size={12} />
              </button>
            ))}
          </div>
        </div>

        <div className="scanner-search-row">
          <input
            className="field scanner-search"
            type="search"
            placeholder="Search symbols…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="btn btn-ghost scanner-add-visible" onClick={addAllVisible}>
            <Plus size={14} /> Add visible
          </button>
        </div>

        <ul className="scanner-dropdown scanner-list" role="listbox" aria-multiselectable="true">
          {filtered.map((inst) => {
            const isOn = selected.includes(inst)
            return (
              <li key={inst}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isOn}
                  className={isOn ? 'selected' : ''}
                  onClick={() => toggle(inst)}
                >
                  <span>{inst}</span>
                  <span className="scanner-option-action">
                    {isOn ? (
                      <>
                        <Check size={14} /> Selected
                      </>
                    ) : (
                      <>
                        <Plus size={14} /> Add
                      </>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
          {filtered.length === 0 && <li className="scanner-empty-row">No symbols match “{query}”</li>}
        </ul>

        <button type="button" className="btn btn-primary scanner-save" onClick={handleSave}>
          Save Scanner ({selected.length})
        </button>
      </div>
    </div>
  )
}
