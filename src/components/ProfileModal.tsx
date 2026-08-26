import { useEffect, useState } from 'react'
import { getCurrentUser, setMemberTelegramLink } from '../auth'
import {
  createTelegramConnectLink,
  disconnectTelegram,
  fetchTelegramLinkStatus,
} from '../telegram'
import './ProfileModal.css'

interface ProfileModalProps {
  onClose: () => void
}

function formatJoinedDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function displayPlan(plan: string, role: string): string {
  if (role === 'admin') return 'Admin'
  if (plan === 'admin') return 'Admin'
  return 'Inner Circle'
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const [user, setUser] = useState(() => getCurrentUser())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    function refresh() {
      setUser(getCurrentUser())
    }
    window.addEventListener('pkfx-users-change', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('pkfx-users-change', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  useEffect(() => {
    if (!user || user.role !== 'client') return
    let cancelled = false
    void (async () => {
      const status = await fetchTelegramLinkStatus(user.email)
      if (cancelled) return
      if (status.linked && status.chatId) {
        setMemberTelegramLink(user.email, {
          chatId: status.chatId,
          username: status.username,
          linkedAt: status.linkedAt,
        })
        setUser(getCurrentUser())
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.email, user?.role])

  if (!user) return null

  const linked = Boolean(user.telegramChatId)

  async function onConnect() {
    const current = getCurrentUser()
    if (!current) return
    setBusy(true)
    setError('')
    setMessage('')
    const result = await createTelegramConnectLink({
      email: current.email,
      fullName: current.fullName,
    })
    setBusy(false)
    if (!result.ok || !result.url) {
      setError(result.error || 'Could not start Telegram connect.')
      return
    }
    setMessage('Finish linking in Telegram, then come back here.')
    window.open(result.url, '_blank', 'noopener,noreferrer')

    // Poll briefly for completion
    const started = Date.now()
    const timer = window.setInterval(() => {
      void (async () => {
        const status = await fetchTelegramLinkStatus(current.email)
        if (status.linked && status.chatId) {
          setMemberTelegramLink(current.email, {
            chatId: status.chatId,
            username: status.username,
            linkedAt: status.linkedAt,
          })
          setUser(getCurrentUser())
          setMessage('Telegram connected.')
          window.clearInterval(timer)
        } else if (Date.now() - started > 90_000) {
          window.clearInterval(timer)
        }
      })()
    }, 2500)
  }

  async function onDisconnect() {
    const current = getCurrentUser()
    if (!current) return
    setBusy(true)
    setError('')
    setMessage('')
    const result = await disconnectTelegram(current.email)
    setBusy(false)
    if (!result.ok) {
      setError(result.error || 'Could not disconnect.')
      return
    }
    setMemberTelegramLink(current.email, null)
    setUser(getCurrentUser())
    setMessage('Telegram disconnected.')
  }

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div
        className="modal modal-profile animate-fade-up animate-pulse-neon"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-name"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        <div className="profile-avatar-wrap">
          <img src={user.avatar} alt="" className="profile-avatar" />
        </div>

        <h2 id="profile-name" className="profile-name font-display">
          {user.fullName}
        </h2>

        <p className="profile-section-title">Basic Information</p>

        <div className="profile-fields">
          <div className="profile-field">
            <label>Email Address</label>
            <p>{user.email}</p>
          </div>
          <div className="profile-field">
            <label>Current Plan</label>
            <p>{displayPlan(user.plan, user.role)}</p>
          </div>
          <div className="profile-field">
            <label>Joined</label>
            <p>{formatJoinedDate(user.joinedAt)}</p>
          </div>

          {user.role === 'client' ? (
            <div className="profile-field profile-telegram">
              <label>Telegram</label>
              <p className="profile-telegram-status">
                {linked
                  ? `Connected${user.telegramUsername ? ` (@${user.telegramUsername})` : ''}`
                  : 'Not connected'}
              </p>
              <div className="profile-telegram-actions">
                {linked ? (
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={busy}
                    onClick={() => void onDisconnect()}
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => void onConnect()}
                  >
                    {busy ? 'Opening…' : 'Connect Telegram'}
                  </button>
                )}
              </div>
              {message ? <p className="profile-telegram-msg">{message}</p> : null}
              {error ? <p className="profile-telegram-error">{error}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
