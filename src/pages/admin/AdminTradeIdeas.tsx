import { useEffect, useState } from 'react'
import { Pencil, Save, Send, Trash2, EyeOff } from 'lucide-react'
import { publishSharedContent } from '../../adminStore'
import {
  TRADE_IDEA_PAIRS,
  createTradeIdea,
  deleteTradeIdea,
  listTradeIdeas,
  publishTradeIdea,
  unpublishTradeIdea,
  updateTradeIdea,
  type TradeDirection,
  type TradeIdea,
} from '../../tradeIdeas'
import './admin.css'

type FormState = {
  pair: string
  direction: TradeDirection
  entryZone: string
  stopLoss: string
  tp1: string
  tp2: string
  notes: string
}

function emptyForm(): FormState {
  return {
    pair: 'EURUSD',
    direction: 'Buy',
    entryZone: '',
    stopLoss: '',
    tp1: '',
    tp2: '',
    notes: '',
  }
}

export function AdminTradeIdeas() {
  const [ideas, setIdeas] = useState<TradeIdea[]>(() => listTradeIdeas())
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [syncNote, setSyncNote] = useState('Publish syncs Trade Ideas to every client device.')

  useEffect(() => {
    function onIdeas() {
      setIdeas(listTradeIdeas())
    }
    function onSync(e: Event) {
      const detail = (e as CustomEvent<{ ok: boolean; at?: string; error?: string }>).detail
      if (!detail) return
      if (detail.ok) {
        setSyncNote(
          detail.at
            ? `Synced to all devices · ${new Date(detail.at).toLocaleString()}`
            : 'Synced to all devices',
        )
      } else {
        setSyncNote(detail.error || 'Sync failed — changes are saved on this device only')
      }
    }
    window.addEventListener('pkfx-trade-ideas-change', onIdeas)
    window.addEventListener('pkfx-sync-status', onSync)
    return () => {
      window.removeEventListener('pkfx-trade-ideas-change', onIdeas)
      window.removeEventListener('pkfx-sync-status', onSync)
    }
  }, [])

  async function persistNote(note: string) {
    setMessage(note)
    setIdeas(listTradeIdeas())
    await publishSharedContent()
  }

  function startEdit(idea: TradeIdea) {
    setEditingId(idea.id)
    setForm({
      pair: idea.pair,
      direction: idea.direction,
      entryZone: idea.entryZone,
      stopLoss: idea.stopLoss,
      tp1: idea.tp1,
      tp2: idea.tp2,
      notes: idea.notes,
    })
    setError('')
    setMessage('')
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm())
    setError('')
  }

  async function save(publish: boolean) {
    if (!form.pair.trim()) {
      setError('Choose a currency pair.')
      return
    }
    if (!form.entryZone.trim()) {
      setError('Enter an entry zone or price.')
      return
    }
    if (!form.stopLoss.trim() || !form.tp1.trim() || !form.tp2.trim()) {
      setError('Stop Loss, TP1, and TP2 are required.')
      return
    }

    if (editingId) {
      const existing = listTradeIdeas().find((i) => i.id === editingId)
      updateTradeIdea(editingId, {
        pair: form.pair,
        direction: form.direction,
        entryZone: form.entryZone,
        stopLoss: form.stopLoss,
        tp1: form.tp1,
        tp2: form.tp2,
        notes: form.notes,
        publishedAt: publish ? new Date().toISOString() : existing?.publishedAt ?? null,
        archived: publish ? false : existing?.archived,
      })
      await persistNote(publish ? 'Trade Idea updated and published.' : 'Trade Idea saved.')
    } else {
      createTradeIdea({
        pair: form.pair,
        direction: form.direction,
        entryZone: form.entryZone,
        stopLoss: form.stopLoss,
        tp1: form.tp1,
        tp2: form.tp2,
        notes: form.notes,
        publish,
      })
      await persistNote(publish ? 'Trade Idea published to clients.' : 'Draft Trade Idea saved.')
    }

    resetForm()
    setError('')
  }

  async function onPublish(id: string) {
    publishTradeIdea(id)
    await persistNote('Trade Idea published to clients.')
  }

  async function onUnpublish(id: string) {
    unpublishTradeIdea(id)
    await persistNote('Trade Idea unpublished.')
  }

  async function onDelete(id: string) {
    if (!window.confirm('Delete this Trade Idea?')) return
    deleteTradeIdea(id)
    if (editingId === id) resetForm()
    await persistNote('Trade Idea deleted.')
  }

  return (
    <div className="admin-page">
      <header>
        <h1 className="admin-title">Trade Ideas</h1>
        <p className="admin-muted">{syncNote}</p>
        {message ? <p className="admin-success">{message}</p> : null}
      </header>

      <form
        className="admin-card"
        onSubmit={(e) => {
          e.preventDefault()
          void save(true)
        }}
      >
        <div className="admin-card-head">
          <h2>{editingId ? 'Edit Trade Idea' : 'Create Trade Idea'}</h2>
          {editingId ? (
            <button type="button" className="admin-btn ghost" onClick={resetForm}>
              Cancel edit
            </button>
          ) : null}
        </div>

        <div className="admin-form-grid">
          <label>
            <span>Currency pair</span>
            <select
              value={form.pair}
              onChange={(e) => setForm((f) => ({ ...f, pair: e.target.value }))}
              required
            >
              {TRADE_IDEA_PAIRS.map((pair) => (
                <option key={pair} value={pair}>
                  {pair}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Direction</span>
            <select
              value={form.direction}
              onChange={(e) =>
                setForm((f) => ({ ...f, direction: e.target.value as TradeDirection }))
              }
            >
              <option value="Buy">Buy</option>
              <option value="Sell">Sell</option>
            </select>
          </label>
          <label className="admin-span-2">
            <span>Entry zone</span>
            <input
              value={form.entryZone}
              onChange={(e) => setForm((f) => ({ ...f, entryZone: e.target.value }))}
              placeholder="e.g. 1.0850 or 1.0840 - 1.0860"
              required
            />
          </label>
          <label>
            <span>Stop Loss</span>
            <input
              value={form.stopLoss}
              onChange={(e) => setForm((f) => ({ ...f, stopLoss: e.target.value }))}
              placeholder="e.g. 1.0820"
              required
            />
          </label>
          <label>
            <span>TP1</span>
            <input
              value={form.tp1}
              onChange={(e) => setForm((f) => ({ ...f, tp1: e.target.value }))}
              placeholder="e.g. 1.0900"
              required
            />
          </label>
          <label>
            <span>TP2</span>
            <input
              value={form.tp2}
              onChange={(e) => setForm((f) => ({ ...f, tp2: e.target.value }))}
              placeholder="e.g. 1.0950"
              required
            />
          </label>
          <label className="admin-span-2">
            <span>Notes</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Setup context, invalidation, session notes…"
            />
          </label>
        </div>

        {error ? <p className="admin-error">{error}</p> : null}

        <div className="admin-actions">
          <button type="submit" className="admin-btn primary">
            <Send size={16} /> Publish to clients
          </button>
          <button type="button" className="admin-btn ghost" onClick={() => void save(false)}>
            <Save size={16} /> Save draft
          </button>
        </div>
      </form>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2>All Trade Ideas</h2>
          <span className="admin-muted">{ideas.length} total</span>
        </div>

        {ideas.length === 0 ? (
          <p className="admin-muted">No Trade Ideas yet. Create and publish one above.</p>
        ) : (
          <div className="admin-idea-list">
            {ideas.map((idea) => {
              const live = Boolean(idea.publishedAt) && !idea.archived
              return (
                <article key={idea.id} className="admin-idea-row">
                  <div className="admin-idea-main">
                    <div className="admin-idea-title">
                      <strong>{idea.pair}</strong>
                      <span className={`admin-pill ${idea.direction === 'Buy' ? 'buy' : 'sell'}`}>
                        {idea.direction}
                      </span>
                      <span className={`admin-pill ${live ? 'live' : 'draft'}`}>
                        {live ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <p className="admin-idea-levels">
                      Entry {idea.entryZone || '—'} · SL {idea.stopLoss || '—'} · TP1{' '}
                      {idea.tp1 || '—'} · TP2 {idea.tp2 || '—'}
                    </p>
                    {idea.notes ? <p className="admin-idea-notes">{idea.notes}</p> : null}
                  </div>
                  <div className="admin-idea-actions">
                    <button type="button" className="admin-btn ghost" onClick={() => startEdit(idea)}>
                      <Pencil size={15} /> Edit
                    </button>
                    {live ? (
                      <button
                        type="button"
                        className="admin-btn ghost"
                        onClick={() => void onUnpublish(idea.id)}
                      >
                        <EyeOff size={15} /> Unpublish
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="admin-btn ghost"
                        onClick={() => void onPublish(idea.id)}
                      >
                        <Send size={15} /> Publish
                      </button>
                    )}
                    <button
                      type="button"
                      className="admin-btn ghost danger"
                      onClick={() => void onDelete(idea.id)}
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
