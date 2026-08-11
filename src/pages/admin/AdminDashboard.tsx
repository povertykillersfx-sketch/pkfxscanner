import { Bell, Clock3, Hourglass, Settings2 } from 'lucide-react'
import { listMembers } from '../../auth'
import { getRequests } from '../../adminStore'
import './admin.css'

export function AdminDashboard() {
  const pending = getRequests().filter((r) => r.status === 'pending').length
  const activeUsers = listMembers().length

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
          </div>
        </article>
        <article className="admin-card admin-kpi">
          <div className="admin-kpi-icon">
            <Clock3 size={20} />
          </div>
          <div>
            <div className="admin-kpi-label">Active Users</div>
            <div className="admin-kpi-value">{activeUsers}</div>
          </div>
        </article>
        <article className="admin-card admin-kpi">
          <div className="admin-kpi-icon">
            <Hourglass size={20} />
          </div>
          <div>
            <div className="admin-kpi-label">Avg. Daily visits</div>
            <div className="admin-kpi-value">0</div>
          </div>
        </article>
      </div>

      <div className="admin-dash-grid">
        <section className="admin-card">
          <div className="admin-card-head">
            <h2>Growth Overview</h2>
            <button type="button" className="admin-btn admin-btn-outline">
              <Settings2 size={16} /> Edit Scanner
            </button>
          </div>
          <div className="admin-empty">
            <div className="admin-empty-art" aria-hidden>
              🚀
            </div>
            <p>Charts</p>
            <p className="admin-muted">Growth charts will appear here as members and visits increase.</p>
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <h2>User Demographics</h2>
          </div>
          <div className="admin-empty">
            <p className="admin-muted">Country and plan breakdown will show here once more members join.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
