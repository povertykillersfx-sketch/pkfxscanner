import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ChevronRight, NotebookPen, Plus, Trash2, X } from 'lucide-react'
import {
  createJournal,
  deleteJournal,
  journalEntryCounts,
  listJournals,
  type Journal,
} from '../tradingJournal'
import './TradingJournal.css'

function formatCreated(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function TradingJournal() {
  const [journals, setJournals] = useState<Journal[]>(() => listJournals())
  const [counts, setCounts] = useState<Record<string, number>>(() => journalEntryCounts())
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    function refresh() {
      setJournals(listJournals())
      setCounts(journalEntryCounts())
    }
    window.addEventListener('pkfx-journal-change', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('pkfx-journal-change', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const total = useMemo(
    () => Object.values(counts).reduce((sum, n) => sum + n, 0),
    [counts],
  )

  function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Give your journal a name.')
      return
    }
    createJournal(name)
    setName('')
    setError('')
    setCreating(false)
    setJournals(listJournals())
    setCounts(journalEntryCounts())
  }

  function onDelete(journal: Journal) {
    const logged = counts[journal.id] || 0
    const warning = logged
      ? `Delete “${journal.name}” and its ${logged} logged trade${logged === 1 ? '' : 's'}?`
      : `Delete “${journal.name}”?`
    if (!window.confirm(warning)) return
    deleteJournal(journal.id)
    setJournals(listJournals())
    setCounts(journalEntryCounts())
  }

  return (
    <div className="journals-page">
      <header className="journals-header animate-fade-up">
        <div>
          <h1 className="font-display">Trading Journals</h1>
          <p>Create journals to track and analyze your trades.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary journals-new-btn"
          onClick={() => {
            setCreating((v) => !v)
            setError('')
          }}
        >
          {creating ? <X size={16} /> : <Plus size={16} />}
          {creating ? 'Cancel' : 'New Journal'}
        </button>
      </header>

      {creating && (
        <form className="journals-create panel panel-glow animate-fade-up" onSubmit={onCreate}>
          <label>
            <span>Journal name</span>
            <input
              className="field"
              type="text"
              placeholder="e.g. September Funding Pips P1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>
          {error ? <p className="journals-error">{error}</p> : null}
          <button type="submit" className="btn btn-primary">
            Create journal
          </button>
        </form>
      )}

      {journals.length === 0 ? (
        <section className="journals-empty panel animate-fade-up stagger-1">
          <NotebookPen size={28} />
          <p>No journals yet.</p>
          <p className="text-muted">
            Create one per account, challenge or month to keep your stats clean.
          </p>
        </section>
      ) : (
        <ul className="journals-list animate-fade-up stagger-1">
          {journals.map((journal) => (
            <li key={journal.id} className="journal-card panel">
              <Link to={`/trading-journal/${journal.id}`} className="journal-card-link">
                <span className="journal-card-icon" aria-hidden>
                  <BookOpen size={18} />
                </span>
                <span className="journal-card-copy">
                  <strong>{journal.name}</strong>
                  <span className="journal-card-meta">
                    Created {formatCreated(journal.createdAt)}
                    {counts[journal.id] ? ` · ${counts[journal.id]} trades` : ''}
                  </span>
                </span>
                <ChevronRight size={18} className="journal-card-arrow" aria-hidden />
              </Link>
              <button
                type="button"
                className="journal-card-delete"
                aria-label={`Delete ${journal.name}`}
                onClick={() => onDelete(journal)}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {total > 0 && (
        <p className="journals-footnote">
          {total} trade{total === 1 ? '' : 's'} logged across {journals.length} journal
          {journals.length === 1 ? '' : 's'}.
        </p>
      )}
    </div>
  )
}
