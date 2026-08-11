import { useState } from 'react'
import { INSTRUMENTS } from '../data/mockData'
import './ScannerModal.css'

interface ScannerModalProps {
  onClose: () => void
  current?: string
}

export function ScannerModal({ onClose, current = 'GOLD' }: ScannerModalProps) {
  const [selected, setSelected] = useState(current)
  const [open, setOpen] = useState(true)

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
        </p>

        <div className="scanner-select-wrap">
          <button
            type="button"
            className="scanner-select-trigger"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            Currently Scanning: <strong>{selected}</strong>
            <span className="chevron">{open ? '▴' : '▾'}</span>
          </button>

          {open && (
            <ul className="scanner-dropdown" role="listbox">
              {INSTRUMENTS.map((inst) => (
                <li key={inst}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={inst === selected}
                    className={inst === selected ? 'selected' : ''}
                    onClick={() => {
                      setSelected(inst)
                      setOpen(false)
                    }}
                  >
                    {inst}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="button" className="btn btn-primary scanner-save" onClick={onClose}>
          Save Scanner
        </button>
      </div>
    </div>
  )
}
