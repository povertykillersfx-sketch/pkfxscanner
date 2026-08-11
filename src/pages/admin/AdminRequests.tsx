import { useState } from 'react'
import type { FormEvent } from 'react'
import { RefreshCw, Send } from 'lucide-react'
import { getRequests, getTelegramSettings, saveTelegramSettings } from '../../adminStore'
import './admin.css'

export function AdminRequests() {
  const requests = getRequests().filter((r) => r.status === 'pending')
  const [settings, setSettings] = useState(() => getTelegramSettings())
  const [message, setMessage] = useState('')

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

  return (
    <div className="admin-page">
      <div className="admin-two-col">
        <section className="admin-card">
          <div className="admin-card-head">
            <h2>Requests</h2>
          </div>
          {requests.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty-art" aria-hidden>
                🚀
              </div>
              <p>You don&apos;t have any pending requests 🚀</p>
            </div>
          ) : (
            <div className="admin-list">
              {requests.map((r) => (
                <div key={r.id} className="admin-list-row">
                  <div className="admin-list-main">
                    <h4>{r.name}</h4>
                    <p className="admin-muted">{r.email}</p>
                    <p className="admin-muted">{r.note}</p>
                  </div>
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
            <button type="submit" className="admin-btn">
              <Send size={16} /> Setup Alerts
            </button>
            <button type="button" className="admin-btn" onClick={onTest}>
              <RefreshCw size={16} /> Test Connection
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
