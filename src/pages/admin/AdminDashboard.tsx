import { useEffect, useState } from 'react'
import { Bell, Clock3, Hourglass } from 'lucide-react'
import {
  countMembersByStatus,
  getCountryBreakdown,
  getJoinHistory,
  listPendingRequests,
} from '../../auth'
import { getTodayVisitCount } from '../../analytics'
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
            <div className="admin-kpi-sub">Waiting for approval</div>
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
