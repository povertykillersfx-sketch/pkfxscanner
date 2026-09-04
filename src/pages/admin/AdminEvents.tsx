import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import {
  getCommunitySettings,
  saveCommunitySettings,
  type CommunityChannel,
  type CommunityResource,
  type CommunitySettings,
  type LiveSession,
} from '../../adminStore'
import { DEFAULT_COMMUNITY } from '../../config/community'
import './admin.css'

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function AdminEvents() {
  const [settings, setSettings] = useState<CommunitySettings>(() => getCommunitySettings())
  const [message, setMessage] = useState('')
  const [syncNote, setSyncNote] = useState('Syncing across devices via this app host…')

  useEffect(() => {
    function onCommunity(e: Event) {
      const detail = (e as CustomEvent<CommunitySettings>).detail
      if (detail) setSettings(detail)
      else setSettings(getCommunitySettings())
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
    window.addEventListener('pkfx-community-change', onCommunity)
    window.addEventListener('pkfx-sync-status', onSync)
    return () => {
      window.removeEventListener('pkfx-community-change', onCommunity)
      window.removeEventListener('pkfx-sync-status', onSync)
    }
  }, [])

  function persist(next: CommunitySettings, note = 'Community page updated.') {
    setSettings(next)
    saveCommunitySettings(next)
    setMessage(note)
  }

  function patchChannel(id: string, patch: Partial<CommunityChannel>) {
    setSettings((prev) => ({
      ...prev,
      channels: prev.channels.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }))
  }

  function patchSession(id: string, patch: Partial<LiveSession>) {
    setSettings((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
  }

  function patchResource(id: string, patch: Partial<CommunityResource>) {
    setSettings((prev) => ({
      ...prev,
      resources: prev.resources.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }))
  }

  function saveAll() {
    persist(settings, 'Saved. Client Community page is updated.')
  }

  function addChannel(e: FormEvent) {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const data = new FormData(form)
    const channel: CommunityChannel = {
      id: newId('ch'),
      name: String(data.get('name') || '').trim() || 'New channel',
      description: String(data.get('description') || '').trim(),
      url: String(data.get('url') || '').trim(),
      kind: (String(data.get('kind') || 'telegram') as CommunityChannel['kind']),
      cta: String(data.get('cta') || '').trim() || 'Open',
      featured: data.get('featured') === 'on',
    }
    const next = { ...settings, channels: [...settings.channels, channel] }
    persist(next, 'Channel added.')
    form.reset()
  }

  function removeChannel(id: string) {
    persist(
      { ...settings, channels: settings.channels.filter((c) => c.id !== id) },
      'Channel removed.',
    )
  }

  function addSession(e: FormEvent) {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const data = new FormData(form)
    const mode = String(data.get('mode') || 'weekdays')
    const session: LiveSession = {
      id: newId('sess'),
      title: String(data.get('title') || '').trim() || 'Live session',
      time: String(data.get('time') || '09:00').trim(),
      timezone: String(data.get('timezone') || 'Africa/Johannesburg').trim(),
      durationMinutes: Number(data.get('duration') || 60) || 60,
      description: String(data.get('description') || '').trim(),
      joinUrl: String(data.get('joinUrl') || '').trim() || undefined,
      weekdaysOnly: mode === 'weekdays',
      weekday: mode === 'weekday' ? Number(data.get('weekday') || 0) : undefined,
    }
    if (mode !== 'weekday') delete session.weekday
    if (mode === 'daily') session.weekdaysOnly = false
    persist({ ...settings, sessions: [...settings.sessions, session] }, 'Session added.')
    form.reset()
  }

  function removeSession(id: string) {
    persist(
      { ...settings, sessions: settings.sessions.filter((s) => s.id !== id) },
      'Session removed.',
    )
  }

  function addResource(e: FormEvent) {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const data = new FormData(form)
    const resource: CommunityResource = {
      id: newId('res'),
      title: String(data.get('title') || '').trim() || 'Resource',
      description: String(data.get('description') || '').trim(),
      url: String(data.get('url') || '').trim(),
      category: (String(data.get('category') || 'broker') as CommunityResource['category']),
    }
    persist({ ...settings, resources: [...settings.resources, resource] }, 'Link added.')
    form.reset()
  }

  function removeResource(id: string) {
    persist(
      { ...settings, resources: settings.resources.filter((r) => r.id !== id) },
      'Link removed.',
    )
  }

  function resetDefaults() {
    persist(structuredClone(DEFAULT_COMMUNITY), 'Restored default community content.')
  }

  return (
    <div className="admin-page">
      <h1 className="admin-title">Events &amp; Community</h1>
      <p className="admin-muted" style={{ marginTop: '-0.35rem' }}>
        Manage channel CTAs, live session times, and broker / prop firm links shown on the client Community page.
        Changes sync to every device using this same app link.
      </p>
      <p className="admin-muted">{syncNote}</p>
      <div className="admin-actions" style={{ marginBottom: '0.25rem' }}>
        <button type="button" className="admin-btn" onClick={saveAll}>
          <Save size={15} /> Save all changes
        </button>
        <button type="button" className="admin-btn ghost" onClick={resetDefaults}>
          Reset defaults
        </button>
      </div>
      {message && <p className="admin-muted">{message}</p>}

      <section className="admin-card">
        <div className="admin-card-head">
          <h2>Channels (CTA buttons)</h2>
        </div>
        {settings.channels.length === 0 ? (
          <div className="admin-empty">
            <p>No channels yet.</p>
            <p className="admin-muted">
              Add a channel with an invite URL below — only those appear on the client Community page.
            </p>
          </div>
        ) : null}
        <div className="admin-list">
          {settings.channels.map((c) => (
            <div key={c.id} className="admin-list-row" style={{ alignItems: 'stretch' }}>
              <div className="admin-list-main" style={{ flex: 1 }}>
                <div className="admin-form" style={{ gap: '0.55rem' }}>
                  <div className="admin-field">
                    <label>Name</label>
                    <input value={c.name} onChange={(e) => patchChannel(c.id, { name: e.target.value })} />
                  </div>
                  <div className="admin-field">
                    <label>Invite / channel URL</label>
                    <input
                      value={c.url}
                      placeholder="https://t.me/… or https://discord.gg/…"
                      onChange={(e) => patchChannel(c.id, { url: e.target.value })}
                    />
                  </div>
                  <div className="admin-field">
                    <label>Description</label>
                    <input
                      value={c.description}
                      onChange={(e) => patchChannel(c.id, { description: e.target.value })}
                    />
                  </div>
                  <div className="admin-field">
                    <label>Button label</label>
                    <input value={c.cta} onChange={(e) => patchChannel(c.id, { cta: e.target.value })} />
                  </div>
                  <label className="admin-muted" style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(c.featured)}
                      onChange={(e) => patchChannel(c.id, { featured: e.target.checked })}
                    />
                    Featured (large CTA)
                  </label>
                </div>
              </div>
              <button type="button" className="admin-btn admin-btn-danger" onClick={() => removeChannel(c.id)}>
                <Trash2 size={15} /> Remove
              </button>
            </div>
          ))}
        </div>
        <form className="admin-form" onSubmit={addChannel} style={{ marginTop: '1rem' }}>
          <h3>Add channel</h3>
          <div className="admin-field">
            <label>Name</label>
            <input name="name" placeholder="Inner Circle Telegram" required />
          </div>
          <div className="admin-field">
            <label>URL</label>
            <input name="url" placeholder="https://t.me/…" />
          </div>
          <div className="admin-field">
            <label>Description</label>
            <input name="description" placeholder="Private member chat" />
          </div>
          <div className="admin-field">
            <label>Type</label>
            <select name="kind" defaultValue="telegram">
              <option value="telegram">Telegram</option>
              <option value="discord">Discord</option>
              <option value="youtube">YouTube</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="web">Web</option>
            </select>
          </div>
          <div className="admin-field">
            <label>Button label</label>
            <input name="cta" placeholder="Open Telegram" />
          </div>
          <label className="admin-muted" style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
            <input type="checkbox" name="featured" /> Featured
          </label>
          <div className="admin-actions">
            <button type="submit" className="admin-btn">
              <Plus size={15} /> Add channel
            </button>
          </div>
        </form>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2>Live sessions</h2>
        </div>
        {settings.sessions.length === 0 ? (
          <div className="admin-empty">
            <p>No live sessions yet.</p>
            <p className="admin-muted">
              Add a session below — only then will upcoming times appear on the client Community page.
            </p>
          </div>
        ) : null}
        <div className="admin-list">
          {settings.sessions.map((s) => (
            <div key={s.id} className="admin-list-row" style={{ alignItems: 'stretch' }}>
              <div className="admin-list-main" style={{ flex: 1 }}>
                <div className="admin-form" style={{ gap: '0.55rem' }}>
                  <div className="admin-field">
                    <label>Title</label>
                    <input value={s.title} onChange={(e) => patchSession(s.id, { title: e.target.value })} />
                  </div>
                  <div className="admin-field">
                    <label>Time (24h)</label>
                    <input
                      value={s.time}
                      placeholder="09:00"
                      onChange={(e) => patchSession(s.id, { time: e.target.value })}
                    />
                  </div>
                  <div className="admin-field">
                    <label>Timezone</label>
                    <input
                      value={s.timezone}
                      onChange={(e) => patchSession(s.id, { timezone: e.target.value })}
                    />
                  </div>
                  <div className="admin-field">
                    <label>Duration (minutes)</label>
                    <input
                      type="number"
                      min={15}
                      value={s.durationMinutes}
                      onChange={(e) =>
                        patchSession(s.id, { durationMinutes: Number(e.target.value) || 60 })
                      }
                    />
                  </div>
                  <div className="admin-field">
                    <label>Join URL (optional)</label>
                    <input
                      value={s.joinUrl || ''}
                      placeholder="https://…"
                      onChange={(e) => patchSession(s.id, { joinUrl: e.target.value })}
                    />
                  </div>
                  <div className="admin-field">
                    <label>Description</label>
                    <input
                      value={s.description || ''}
                      onChange={(e) => patchSession(s.id, { description: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <button type="button" className="admin-btn admin-btn-danger" onClick={() => removeSession(s.id)}>
                <Trash2 size={15} /> Remove
              </button>
            </div>
          ))}
        </div>
        <form className="admin-form" onSubmit={addSession} style={{ marginTop: '1rem' }}>
          <h3>Add live session</h3>
          <div className="admin-field">
            <label>Title</label>
            <input name="title" placeholder="Daily Live Trading" required />
          </div>
          <div className="admin-field">
            <label>Schedule</label>
            <select name="mode" defaultValue="weekdays">
              <option value="weekdays">Weekdays (Mon–Fri)</option>
              <option value="daily">Every day</option>
              <option value="weekday">Specific weekday</option>
            </select>
          </div>
          <div className="admin-field">
            <label>Weekday (if specific)</label>
            <select name="weekday" defaultValue="0">
              <option value="0">Sunday</option>
              <option value="1">Monday</option>
              <option value="2">Tuesday</option>
              <option value="3">Wednesday</option>
              <option value="4">Thursday</option>
              <option value="5">Friday</option>
              <option value="6">Saturday</option>
            </select>
          </div>
          <div className="admin-field">
            <label>Time</label>
            <input name="time" type="time" defaultValue="09:00" required />
          </div>
          <div className="admin-field">
            <label>Timezone</label>
            <input name="timezone" defaultValue="Africa/Johannesburg" />
          </div>
          <div className="admin-field">
            <label>Duration (minutes)</label>
            <input name="duration" type="number" min={15} defaultValue={60} />
          </div>
          <div className="admin-field">
            <label>Join URL</label>
            <input name="joinUrl" placeholder="Optional stream / room link" />
          </div>
          <div className="admin-field">
            <label>Description</label>
            <input name="description" placeholder="What happens on this call" />
          </div>
          <div className="admin-actions">
            <button type="submit" className="admin-btn">
              <Plus size={15} /> Add session
            </button>
          </div>
        </form>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2>Broker &amp; prop firm links</h2>
        </div>
        <div className="admin-list">
          {settings.resources.map((r) => (
            <div key={r.id} className="admin-list-row" style={{ alignItems: 'stretch' }}>
              <div className="admin-list-main" style={{ flex: 1 }}>
                <div className="admin-form" style={{ gap: '0.55rem' }}>
                  <div className="admin-field">
                    <label>Title</label>
                    <input value={r.title} onChange={(e) => patchResource(r.id, { title: e.target.value })} />
                  </div>
                  <div className="admin-field">
                    <label>URL</label>
                    <input value={r.url} onChange={(e) => patchResource(r.id, { url: e.target.value })} />
                  </div>
                  <div className="admin-field">
                    <label>Description</label>
                    <input
                      value={r.description}
                      onChange={(e) => patchResource(r.id, { description: e.target.value })}
                    />
                  </div>
                  <div className="admin-field">
                    <label>Category</label>
                    <select
                      value={r.category}
                      onChange={(e) =>
                        patchResource(r.id, {
                          category: e.target.value as CommunityResource['category'],
                        })
                      }
                    >
                      <option value="broker">Broker</option>
                      <option value="prop">Prop firm</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
              <button type="button" className="admin-btn admin-btn-danger" onClick={() => removeResource(r.id)}>
                <Trash2 size={15} /> Remove
              </button>
            </div>
          ))}
        </div>
        <form className="admin-form" onSubmit={addResource} style={{ marginTop: '1rem' }}>
          <h3>Add link</h3>
          <div className="admin-field">
            <label>Title</label>
            <input name="title" placeholder="Broker sign-up — Exness" required />
          </div>
          <div className="admin-field">
            <label>URL</label>
            <input name="url" placeholder="https://…" required />
          </div>
          <div className="admin-field">
            <label>Description</label>
            <input name="description" placeholder="Short note for members" />
          </div>
          <div className="admin-field">
            <label>Category</label>
            <select name="category" defaultValue="broker">
              <option value="broker">Broker</option>
              <option value="prop">Prop firm</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="admin-actions">
            <button type="submit" className="admin-btn">
              <Save size={15} /> Add link
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
