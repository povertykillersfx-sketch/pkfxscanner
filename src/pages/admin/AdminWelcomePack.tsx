import { useEffect, useMemo, useState } from 'react'
import { Package, Trash2 } from 'lucide-react'
import { publishSharedContent } from '../../adminStore'
import {
  WELCOME_PACK_STATUSES,
  deleteWelcomePackOrder,
  listWelcomePackOrders,
  statusLabel,
  updateWelcomePackOrder,
  type WelcomePackOrder,
  type WelcomePackStatus,
} from '../../welcomePack'
import './admin.css'

export function AdminWelcomePack() {
  const [orders, setOrders] = useState<WelcomePackOrder[]>(() => listWelcomePackOrders())
  const [message, setMessage] = useState('')
  const [syncNote, setSyncNote] = useState('Status changes sync to members and create in-app notifications.')
  const [filter, setFilter] = useState<'all' | WelcomePackStatus>('all')
  const [drafts, setDrafts] = useState<
    Record<string, { status: WelcomePackStatus; courier: string; trackingNumber: string }>
  >({})

  useEffect(() => {
    function onChange() {
      setOrders(listWelcomePackOrders())
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
    window.addEventListener('pkfx-welcome-pack-change', onChange)
    window.addEventListener('pkfx-sync-status', onSync)
    return () => {
      window.removeEventListener('pkfx-welcome-pack-change', onChange)
      window.removeEventListener('pkfx-sync-status', onSync)
    }
  }, [])

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev }
      for (const order of orders) {
        if (!next[order.id]) {
          next[order.id] = {
            status: order.status,
            courier: order.courier,
            trackingNumber: order.trackingNumber,
          }
        }
      }
      return next
    })
  }, [orders])

  const visible = useMemo(
    () => (filter === 'all' ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  )

  const counts = useMemo(() => {
    const base: Record<WelcomePackStatus | 'all', number> = {
      all: orders.length,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
    }
    for (const o of orders) base[o.status] += 1
    return base
  }, [orders])

  async function persist(note: string) {
    setMessage(note)
    setOrders(listWelcomePackOrders())
    await publishSharedContent()
  }

  async function saveOrder(id: string) {
    const draft = drafts[id]
    if (!draft) return
    const before = listWelcomePackOrders().find((o) => o.id === id)
    updateWelcomePackOrder(id, {
      status: draft.status,
      courier: draft.courier,
      trackingNumber: draft.trackingNumber,
    })
    await persist(
      before && before.status !== draft.status
        ? 'Status updated — member notified.'
        : 'Welcome Pack order updated.',
    )
  }

  async function onDelete(id: string) {
    if (!window.confirm('Delete this Welcome Pack order?')) return
    deleteWelcomePackOrder(id)
    setDrafts((d) => {
      const next = { ...d }
      delete next[id]
      return next
    })
    await persist('Welcome Pack order deleted.')
  }

  return (
    <div className="admin-page">
      <header>
        <h1 className="admin-title">Welcome Pack Orders</h1>
        <p className="admin-muted">{syncNote}</p>
        {message ? <p className="admin-success">{message}</p> : null}
      </header>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2>
            <Package size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: -3 }} />
            Member claims
          </h2>
          <div className="admin-welcome-filters">
            <button
              type="button"
              className={`admin-btn ghost${filter === 'all' ? ' is-on' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({counts.all})
            </button>
            {WELCOME_PACK_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                className={`admin-btn ghost${filter === status ? ' is-on' : ''}`}
                onClick={() => setFilter(status)}
              >
                {statusLabel(status)} ({counts[status]})
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="admin-muted">No Welcome Pack claims yet.</p>
        ) : (
          <div className="admin-welcome-list">
            {visible.map((order) => {
              const draft = drafts[order.id] || {
                status: order.status,
                courier: order.courier,
                trackingNumber: order.trackingNumber,
              }
              return (
                <article key={order.id} className="admin-welcome-row">
                  <div className="admin-welcome-main">
                    <div className="admin-welcome-title">
                      <strong>{order.name}</strong>
                      <span className={`admin-pill status-${order.status}`}>
                        {statusLabel(order.status)}
                      </span>
                    </div>
                    <p className="admin-welcome-meta">
                      {order.email} · {order.phone}
                      <br />
                      {order.address}, {order.province}, {order.postalCode}
                      <br />
                      Tee {order.shirtSize} · {order.shirtColor}
                      <br />
                      MT5 {order.mt5Account || '—'}
                      <br />
                      Claimed {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="admin-welcome-edit">
                    <label>
                      <span>Status</span>
                      <select
                        value={draft.status}
                        onChange={(e) =>
                          setDrafts((d) => ({
                            ...d,
                            [order.id]: {
                              ...draft,
                              status: e.target.value as WelcomePackStatus,
                            },
                          }))
                        }
                      >
                        {WELCOME_PACK_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {statusLabel(s)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Courier</span>
                      <input
                        value={draft.courier}
                        onChange={(e) =>
                          setDrafts((d) => ({
                            ...d,
                            [order.id]: { ...draft, courier: e.target.value },
                          }))
                        }
                        placeholder="e.g. The Courier Guy"
                      />
                    </label>
                    <label>
                      <span>Tracking number</span>
                      <input
                        value={draft.trackingNumber}
                        onChange={(e) =>
                          setDrafts((d) => ({
                            ...d,
                            [order.id]: { ...draft, trackingNumber: e.target.value },
                          }))
                        }
                        placeholder="Tracking #"
                      />
                    </label>
                    <div className="admin-welcome-actions">
                      <button type="button" className="admin-btn primary" onClick={() => void saveOrder(order.id)}>
                        Save & notify
                      </button>
                      <button
                        type="button"
                        className="admin-btn danger"
                        onClick={() => void onDelete(order.id)}
                        aria-label="Delete order"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
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
