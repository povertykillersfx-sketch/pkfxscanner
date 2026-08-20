import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Bell, Clock3, Hourglass, Link2 } from 'lucide-react'
import {
  countMembersByStatus,
  getCountryBreakdown,
  getJoinHistory,
  listPendingRequests,
} from '../../auth'
import { getTodayVisitCount } from '../../analytics'
import { getHowItWorksVideo, saveHowItWorksVideo } from '../../adminStore'
import './admin.css'

function shortDay(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })
}

function readDash() {
  const joins = getJoinHistory(14)
  const countries = getCountryBreakdown().slice(0, 6)
  return {
    pending: listPendingRequests().length,
    activeUsers: countMembersByStatus('active'),
    todayVisits: getTodayVisitCount(),
    joins,
    maxJoin: Math.max(1, ...joins.map((j) => j.count)),
    countries,
    maxCountry: Math.max(1, ...countries.map((c) => c.count)),
  }
}

export function AdminDashboard() {
  const [dash, setDash] = useState(readDash)
  const [howItWorks, setHowItWorks] = useState(() => getHowItWorksVideo())
  const [howMsg, setHowMsg] = useState('')

  useEffect(() => {
    function refresh() {
      setDash(readDash())
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

  function saveHowVideo(e: FormEvent) {
    e.preventDefault()
    saveHowItWorksVideo(howItWorks)
    setHowMsg(howItWorks.url.trim() ? 'How it works video saved for the client dashboard.' : 'Video link cleared.')
  }

  const { pending, activeUsers, todayVisits, joins, maxJoin, countries, maxCountry } = dash

  return (
    <div className="admin-page">
      <div className="admin-kpi-row">
        <article className="admin-card admin-kpi">
          <div className="admin-kpi-icon">
            <Bell size={20} />
          </div>
          <div>
            <div className="admin-kpi-label">Requests</div>
            <div className="admin-kpi-value">{pending}</div>
            <div className="admin-kpi-sub">Reached payment · awaiting approval</div>
          </div>
        </article>
        <article className="admin-card admin-kpi">
          <div className="admin-kpi-icon">
            <Clock3 size={20} />
          </div>
          <div>
            <div className="admin-kpi-label">Active Users</div>
            <div className="admin-kpi-value">{activeUsers}</div>
            <div className="admin-kpi-sub">Approved / paid</div>
          </div>
        </article>
        <article className="admin-card admin-kpi">
          <div className="admin-kpi-icon">
            <Hourglass size={20} />
          </div>
          <div>
            <div className="admin-kpi-label">Daily visits</div>
            <div className="admin-kpi-value">{todayVisits}</div>
            <div className="admin-kpi-sub">Site visits today</div>
          </div>
        </article>
      </div>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2>How it works video</h2>
          <span className="admin-muted">Shown on the client Dashboard under “How it works?”</span>
        </div>
        <form className="admin-form" onSubmit={saveHowVideo}>
          <div className="admin-field">
            <label htmlFor="how-video-url">Video link (YouTube, Vimeo, or direct URL)</label>
            <input
              id="how-video-url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/…"
              value={howItWorks.url}
              onChange={(e) => setHowItWorks({ ...howItWorks, url: e.target.value })}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="how-video-title">Title</label>
            <input
              id="how-video-title"
              value={howItWorks.title}
              onChange={(e) => setHowItWorks({ ...howItWorks, title: e.target.value })}
              placeholder="How To Use PKFX"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="how-video-sub">Subtitle</label>
            <input
              id="how-video-sub"
              value={howItWorks.subtitle}
              onChange={(e) => setHowItWorks({ ...howItWorks, subtitle: e.target.value })}
              placeholder="(Live market + AI alerts)"
            />
          </div>
          <button type="submit" className="admin-btn">
            <Link2 size={16} /> Save video link
          </button>
          {howMsg && (
            <p className="admin-muted" style={{ marginTop: '0.5rem' }}>
              {howMsg}
            </p>
          )}
        </form>
      </section>

      <div className="admin-dash-grid">
        <section className="admin-card">
          <div className="admin-card-head">
            <h2>Growth Overview</h2>
            <span className="admin-muted">New members joined (14 days)</span>
          </div>
          {joins.every((j) => j.count === 0) ? (
            <div className="admin-empty">
              <p className="admin-muted">No new signups yet. Growth bars appear as clients register.</p>
            </div>
          ) : (
            <div className="growth-bars" role="img" aria-label="Join growth bar chart">
              {joins.map((j) => (
                <div key={j.date} className="growth-col">
                  <div className="growth-bar-track">
                    <div
                      className="growth-bar"
                      style={{ height: `${Math.max(6, (j.count / maxJoin) * 100)}%` }}
                      title={`${j.count} joined`}
                    />
                  </div>
                  <span className="growth-count">{j.count}</span>
                  <span className="growth-label">{shortDay(j.date)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <h2>User Demographics</h2>
          </div>
          {countries.length === 0 ? (
            <div className="admin-empty">
              <p className="admin-muted">Country breakdown appears when members join.</p>
            </div>
          ) : (
            <div className="demo-bars">
              {countries.map((c) => (
                <div key={c.country} className="demo-row">
                  <span className="demo-name">{c.country}</span>
                  <div className="demo-track">
                    <div className="demo-fill" style={{ width: `${(c.count / maxCountry) * 100}%` }} />
                  </div>
                  <span className="demo-count">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
