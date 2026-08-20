import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  CalendarClock,
  ExternalLink,
  MessageCircle,
  Radio,
  Send,
  Users,
  Video,
} from 'lucide-react'
import { getCommunitySettings, type CommunityChannel, type CommunitySettings } from '../adminStore'
import {
  channelAccent,
  getUpcomingSessions,
  type CommunityChannelKind,
} from '../config/community'
import './Community.css'

function ChannelIcon({ kind }: { kind: CommunityChannelKind }) {
  const size = 22
  switch (kind) {
    case 'telegram':
      return <Send size={size} />
    case 'discord':
      return <MessageCircle size={size} />
    case 'youtube':
      return <Video size={size} />
    default:
      return <Users size={size} />
  }
}

function openUrl(url: string) {
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function Community() {
  const [settings, setSettings] = useState<CommunitySettings>(() => getCommunitySettings())
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    function refresh(e?: Event) {
      const detail = (e as CustomEvent<CommunitySettings> | undefined)?.detail
      setSettings(detail || getCommunitySettings())
    }
    window.addEventListener('pkfx-community-change', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('pkfx-community-change', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const upcoming = useMemo(
    () => getUpcomingSessions(settings.sessions, 6, now),
    [settings.sessions, now],
  )

  const featured = settings.channels.filter((c) => c.featured)
  const otherChannels = settings.channels.filter((c) => !c.featured)
  const brokers = settings.resources.filter((r) => r.category === 'broker')
  const props = settings.resources.filter((r) => r.category === 'prop')
  const otherResources = settings.resources.filter((r) => r.category === 'other')

  return (
    <div className="community-page">
      <header className="community-hero animate-fade-up">
        <p className="community-kicker">PKFX Inner Circle</p>
        <h1 className="font-display">Community</h1>
        <p className="community-lead">
          Jump straight into the channels, see the next live sessions, and grab the links members use most.
        </p>
      </header>

      <section className="community-section animate-fade-up" style={{ animationDelay: '60ms' }}>
        <div className="community-section-head">
          <h2 className="font-display">Join the channels</h2>
          <p>One tap into Telegram, Discord, and live stream rooms.</p>
        </div>

        <div className="community-cta-grid">
          {featured.map((channel) => (
            <ChannelCta key={channel.id} channel={channel} prominent />
          ))}
        </div>

        {otherChannels.length > 0 && (
          <div className="community-channel-row">
            {otherChannels.map((channel) => (
              <ChannelCta key={channel.id} channel={channel} />
            ))}
          </div>
        )}
      </section>

      <section className="community-section animate-fade-up" style={{ animationDelay: '120ms' }}>
        <div className="community-section-head">
          <h2 className="font-display">Upcoming live sessions</h2>
          <p>Next sessions in SAST — times update automatically.</p>
        </div>

        {upcoming.length === 0 ? (
          <p className="community-empty">No live sessions scheduled yet. Check back soon.</p>
        ) : (
          <ul className="community-sessions">
            {upcoming.map((item) => {
              const live = item.relative === 'Live now'
              const join = item.session.joinUrl?.trim()
              return (
                <li key={`${item.session.id}-${item.startsAt.toISOString()}`} className="community-session">
                  <div className="community-session-time">
                    <CalendarClock size={18} aria-hidden />
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.timeLabel}</span>
                    </div>
                  </div>
                  <div className="community-session-main">
                    <div className="community-session-title-row">
                      <h3>{item.session.title}</h3>
                      <span className={`community-pill ${live ? 'is-live' : ''}`}>
                        {live ? (
                          <>
                            <Radio size={12} aria-hidden /> Live now
                          </>
                        ) : (
                          item.relative
                        )}
                      </span>
                    </div>
                    {item.session.description && <p>{item.session.description}</p>}
                  </div>
                  {join ? (
                    <button type="button" className="btn btn-primary community-session-join" onClick={() => openUrl(join)}>
                      Join session
                      <ExternalLink size={15} aria-hidden />
                    </button>
                  ) : (
                    <span className="community-session-hint">Details in Telegram / Discord</span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="community-section animate-fade-up" style={{ animationDelay: '180ms' }}>
        <div className="community-section-head">
          <h2 className="font-display">Brokers &amp; prop firms</h2>
          <p>Quick links members look for when opening accounts or challenges.</p>
        </div>

        <div className="community-resources">
          {brokers.length > 0 && (
            <div className="community-resource-group">
              <h3>
                <Building2 size={16} aria-hidden /> Broker sign-up
              </h3>
              <div className="community-resource-list">
                {brokers.map((r) => (
                  <a
                    key={r.id}
                    className="community-resource"
                    href={r.url || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={!r.url}
                    onClick={(e) => {
                      if (!r.url) e.preventDefault()
                    }}
                  >
                    <div>
                      <strong>{r.title}</strong>
                      <span>{r.description}</span>
                    </div>
                    <ExternalLink size={16} aria-hidden />
                  </a>
                ))}
              </div>
            </div>
          )}

          {props.length > 0 && (
            <div className="community-resource-group">
              <h3>
                <Building2 size={16} aria-hidden /> Prop firms
              </h3>
              <div className="community-resource-list">
                {props.map((r) => (
                  <a
                    key={r.id}
                    className="community-resource"
                    href={r.url || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={!r.url}
                    onClick={(e) => {
                      if (!r.url) e.preventDefault()
                    }}
                  >
                    <div>
                      <strong>{r.title}</strong>
                      <span>{r.description}</span>
                    </div>
                    <ExternalLink size={16} aria-hidden />
                  </a>
                ))}
              </div>
            </div>
          )}

          {otherResources.map((r) => (
            <a
              key={r.id}
              className="community-resource"
              href={r.url || undefined}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div>
                <strong>{r.title}</strong>
                <span>{r.description}</span>
              </div>
              <ExternalLink size={16} aria-hidden />
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}

function ChannelCta({ channel, prominent = false }: { channel: CommunityChannel; prominent?: boolean }) {
  const ready = Boolean(channel.url?.trim())
  const accent = channelAccent(channel.kind)

  return (
    <button
      type="button"
      className={`community-cta ${prominent ? 'is-prominent' : ''} ${ready ? '' : 'is-disabled'}`}
      style={{ ['--cta-accent' as string]: accent }}
      onClick={() => openUrl(channel.url)}
      disabled={!ready}
      title={ready ? channel.cta : 'Admin can add this link under Events'}
    >
      <span className="community-cta-icon" aria-hidden>
        <ChannelIcon kind={channel.kind} />
      </span>
      <span className="community-cta-copy">
        <strong>{channel.name}</strong>
        <span>{ready ? channel.description : 'Link not set yet — ask admin to paste the invite URL.'}</span>
      </span>
      <span className="community-cta-action">
        {ready ? channel.cta : 'Coming soon'}
        {ready && <ExternalLink size={15} aria-hidden />}
      </span>
    </button>
  )
}
