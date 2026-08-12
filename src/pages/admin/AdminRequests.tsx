import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, RefreshCw, Send, X } from 'lucide-react'
import { approveMember, listPendingRequests, revokeMemberAccess } from '../../auth'
import { getTelegramSettings, saveTelegramSettings } from '../../adminStore'
import './admin.css'

export function AdminRequests() {
  const [requests, setRequests] = useState(() => listPendingRequests())
  const [settings, setSettings] = useState(() => getTelegramSettings())
  const [message, setMessage] = useState('')

  useEffect(() => {
    function refresh() {
      setRequests(listPendingRequests())
    }
    window.addEventListener('pkfx-users-change', refresh)
    window.addEventListener('storage', refresh)
    const id = window.setInterval(refresh, 2000)
    return () => {
      window.removeEventListener('pkfx-users-change', refresh)
      window.removeEventListener('storage', refresh)
      window.clearInterval(id)
    }
  }, [])

  function onSave(e: FormEvent) {
    e.preventDefault()
    saveTelegramSettings(settings)
    setMessage('Alert settings saved.')
  }

  function onTest() {
    saveTelegramSettings(settings)
    setMessage(
      settings.botToken && settings.chatId
        ? 'Test connection saved. Wire a backend Telegram send when you deploy.'
        : 'Add BotToken and ChatID first.',
    )
  }

  function approve(email: string) {
    approveMember(email)
    setRequests(listPendingRequests())
  }

  function reject(email: string) {
    if (!window.confirm(`Reject / revoke access for ${email}?`)) return
    revokeMemberAccess(email)
    setRequests(listPendingRequests())
  }

  return (
    <div className="admin-page">
      <div className="admin-two-col">
        <section className="admin-card">
          <div className="admin-card-head">
            <h2>Requests</h2>
            <span className="admin-muted">{requests.length} waiting</span>
          </div>
          {requests.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty-art" aria-hidden>
                🚀
              </div>
              <p>You don&apos;t have any pending requests 🚀</p>
              <p className="admin-muted">New client signups waiting for approval will show here.</p>
            </div>
          ) : (
            <div className="admin-list">
              {requests.map((r) => (
                <div key={r.email} className="admin-list-row">
                  <div className="admin-list-main">
                    <h4>{r.fullName}</h4>
                    <p className="admin-muted">{r.email}</p>
                    {r.phone && <p className="admin-muted">Phone: {r.phone}</p>}
                    {r.country && <p className="admin-muted">Country: {r.country}</p>}
                    <p className="admin-muted">
                      Status: {r.status || 'pending'}
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
            Enter your telegram chatID so you can be instantly notified when new alerts are scanned.
          </p>
          <form className="admin-form" onSubmit={onSave}>
            <div className="admin-field">
              <label>Alert sample</label>
              <textarea
                placeholder="Provide a sample of how you'd like the alerts to be structured."
                value={settings.sample}
                onChange={(e) => setSettings({ ...settings, sample: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label>Your Telegram BotToken</label>
              <input
                value={settings.botToken}
                onChange={(e) => setSettings({ ...settings, botToken: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label>Your Telegram ChatID</label>
              <input
                value={settings.chatId}
                onChange={(e) => setSettings({ ...settings, chatId: e.target.value })}
              />
            </div>
            {message && <p className="admin-muted">{message}</p>}
            <div className="admin-actions">
              <button type="button" className="admin-btn ghost" onClick={onTest}>
                <RefreshCw size={15} /> Test Connection
              </button>
              <button type="submit" className="admin-btn">
                <Send size={15} /> Save
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
