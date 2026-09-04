import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, RefreshCw, Search, Send, X } from 'lucide-react'
import { approveMember, listPendingRequests, revokeMemberAccess, syncMembersFromCloud } from '../../auth'
import { filterClients } from '../../adminSearch'
import { getTelegramSettings, saveTelegramSettings } from '../../adminStore'
import {
  fetchTelegramSettings,
  saveRemoteTelegramSettings,
  testRemoteTelegramSettings,
} from '../../telegram'
import './admin.css'

const DEFAULT_TEMPLATE = `PKFX Trade Idea

{{pair}} — {{direction_upper}} {{direction_emoji}}

📅 Date: {{date}}
⏰ Time: {{time}}
🌍 Session: {{session}}

Entry: {{entry}}

🎯 TP1: {{tp1}}
🎯 TP2: {{tp2}}
❌ SL: {{sl}}

Risk/Reward:
TP1 → {{rr1}}
TP2 → {{rr2}}

{{notes}}

⚠️ Disclaimer:
This is not financial advice. This Trade Idea is provided for educational purposes only. Trading involves risk, and past performance does not guarantee future results. Trade at your own risk.`

export function AdminRequests() {
  const [requests, setRequests] = useState(() => listPendingRequests())
  const local = getTelegramSettings()
  const [settings, setSettings] = useState({
    botToken: local.botToken || '',
    chatId: local.chatId || '',
    botUsername: local.botUsername || 'PovertyKillersFxBot',
    messageTemplate: local.messageTemplate || local.sample || DEFAULT_TEMPLATE,
  })
  const [placeholders, setPlaceholders] = useState<string[]>([
    'pair',
    'direction_upper',
    'direction_emoji',
    'date',
    'time',
    'session',
    'entry',
    'tp1',
    'tp2',
    'sl',
    'rr1',
    'rr2',
    'notes',
    'disclaimer',
  ])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')

  useEffect(() => {
    function refresh() {
      setRequests(listPendingRequests())
    }
    window.addEventListener('pkfx-users-change', refresh)
    window.addEventListener('storage', refresh)
    const id = window.setInterval(refresh, 2000)

    let cancelled = false
    async function pullCloud() {
      await syncMembersFromCloud()
      if (!cancelled) setRequests(listPendingRequests())
    }
    void pullCloud()
    const cloudId = window.setInterval(() => void pullCloud(), 8000)

    return () => {
      cancelled = true
      window.removeEventListener('pkfx-users-change', refresh)
      window.removeEventListener('storage', refresh)
      window.clearInterval(id)
      window.clearInterval(cloudId)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      const remote = await fetchTelegramSettings()
      if (cancelled) return
      if (remote.ok) {
        setSettings({
          botToken: remote.botToken,
          chatId: remote.chatId,
          botUsername: remote.botUsername || 'PovertyKillersFxBot',
          messageTemplate: remote.messageTemplate || DEFAULT_TEMPLATE,
        })
        if (remote.placeholders?.length) setPlaceholders(remote.placeholders)
        saveTelegramSettings({
          sample: remote.messageTemplate || DEFAULT_TEMPLATE,
          botToken: remote.botToken,
          chatId: remote.chatId,
          botUsername: remote.botUsername,
          messageTemplate: remote.messageTemplate,
        })
      } else if (remote.error) {
        setError(remote.error)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const visible = useMemo(() => filterClients(requests, appliedQuery), [requests, appliedQuery])

  function onSearch(e: FormEvent) {
    e.preventDefault()
    setAppliedQuery(query.trim())
  }

  function clearSearch() {
    setQuery('')
    setAppliedQuery('')
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    const result = await saveRemoteTelegramSettings(settings)
    setSaving(false)
    if (!result.ok) {
      setError(result.error || 'Could not save settings.')
      return
    }
    saveTelegramSettings({
      sample: settings.messageTemplate,
      botToken: settings.botToken,
      chatId: settings.chatId,
      botUsername: settings.botUsername,
      messageTemplate: settings.messageTemplate,
    })
    setMessage('Telegram notification settings saved.')
  }

  async function onTest() {
    setTesting(true)
    setMessage('')
    setError('')
    const result = await testRemoteTelegramSettings(settings)
    setTesting(false)
    if (!result.ok) {
      setError(result.error || 'Test failed.')
      return
    }
    setMessage(`Test message sent to ${settings.chatId}${result.messageId ? ` (#${result.messageId})` : ''}.`)
  }

  function approve(email: string) {
    void (async () => {
      await approveMember(email)
      setRequests(listPendingRequests())
    })()
  }

  function reject(email: string) {
    if (!window.confirm(`Reject / revoke access for ${email}?`)) return
    void (async () => {
      await revokeMemberAccess(email)
      setRequests(listPendingRequests())
    })()
  }

  return (
    <div className="admin-page">
      <div className="admin-two-col">
        <section className="admin-card">
          <div className="admin-card-head">
            <h2>Requests</h2>
            <span className="admin-muted">
              {appliedQuery ? `${visible.length} match` : `${requests.length} waiting`}
            </span>
          </div>

          <form className="admin-search" onSubmit={onSearch}>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, surname, email, or phone"
              aria-label="Search requests"
            />
            <button type="submit" className="admin-btn admin-search-btn">
              <Search size={15} /> Search
            </button>
            {appliedQuery && (
              <button type="button" className="admin-btn ghost admin-search-clear" onClick={clearSearch}>
                Clear
              </button>
            )}
          </form>

          {requests.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty-art" aria-hidden>
                🚀
              </div>
              <p>You don&apos;t have any pending requests 🚀</p>
              <p className="admin-muted">New signups and members who continue to payment appear here for approval.</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="admin-empty">
              <p>No requests match “{appliedQuery}”</p>
              <p className="admin-muted">Try a different name, surname, email, or phone number.</p>
            </div>
          ) : (
            <div className="admin-list">
              {visible.map((r) => (
                <div key={r.email} className="admin-list-row">
                  <div className="admin-list-main">
                    <h4>{r.fullName}</h4>
                    <p className="admin-muted">{r.email}</p>
                    {r.phone && <p className="admin-muted">Phone: {r.phone}</p>}
                    {r.country && <p className="admin-muted">Country: {r.country}</p>}
                    <p className="admin-muted">
                      Status: {r.status || 'pending'}
                      {r.status === 'lead' ? ' · Signed up' : ''}
                      {r.status === 'pending' ? ' · Payment started' : ''}
                      {r.joinedAt ? ` · Joined ${new Date(r.joinedAt).toLocaleString()}` : ''}
                    </p>
                  </div>
                  <button type="button" className="admin-btn" onClick={() => approve(r.email)}>
                    <Check size={15} /> Approve
                  </button>
                  <button type="button" className="admin-btn admin-btn-danger" onClick={() => reject(r.email)}>
                    <X size={15} /> Reject
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <h2>Notification Settings</h2>
          </div>
          <p className="admin-muted" style={{ marginBottom: '0.85rem' }}>
            Configure the Telegram bot, channel/group ID, and the exact Trade Idea message format posted on
            publish.
          </p>
          {loading ? (
            <p className="admin-muted">Loading Telegram settings…</p>
          ) : (
            <form className="admin-form" onSubmit={(e) => void onSave(e)}>
              <div className="admin-field">
                <label>Telegram Bot Token</label>
                <input
                  value={settings.botToken}
                  onChange={(e) => setSettings({ ...settings, botToken: e.target.value })}
                  placeholder="123456:ABC…"
                  autoComplete="off"
                />
              </div>
              <div className="admin-field">
                <label>Telegram Group / Channel ID</label>
                <input
                  value={settings.chatId}
                  onChange={(e) => setSettings({ ...settings, chatId: e.target.value })}
                  placeholder="-100…"
                  autoComplete="off"
                />
              </div>
              <div className="admin-field">
                <label>Bot Username</label>
                <input
                  value={settings.botUsername}
                  onChange={(e) => setSettings({ ...settings, botUsername: e.target.value })}
                  placeholder="PovertyKillersFxBot"
                  autoComplete="off"
                />
              </div>
              <div className="admin-field">
                <label>Trade Idea message format</label>
                <textarea
                  rows={18}
                  style={{ minHeight: 280, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13 }}
                  value={settings.messageTemplate}
                  onChange={(e) => setSettings({ ...settings, messageTemplate: e.target.value })}
                  placeholder="Use {{placeholders}} for dynamic fields"
                />
              </div>
              <p className="admin-muted" style={{ marginTop: '-0.35rem', marginBottom: '0.75rem', lineHeight: 1.45 }}>
                Placeholders:{' '}
                {placeholders.map((p) => (
                  <code key={p} style={{ marginRight: 6 }}>
                    {`{{${p}}}`}
                  </code>
                ))}
              </p>
              {message ? <p className="admin-muted">{message}</p> : null}
              {error ? (
                <p style={{ color: 'var(--bearish)', fontWeight: 650, marginBottom: '0.65rem' }}>{error}</p>
              ) : null}
              <div className="admin-actions">
                <button type="button" className="admin-btn ghost" disabled={testing || saving} onClick={() => void onTest()}>
                  <RefreshCw size={15} /> {testing ? 'Testing…' : 'Test Connection'}
                </button>
                <button type="submit" className="admin-btn" disabled={saving || testing}>
                  <Send size={15} /> {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
