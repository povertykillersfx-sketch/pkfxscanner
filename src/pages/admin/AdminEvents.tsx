import './admin.css'

export function AdminEvents() {
  return (
    <div className="admin-page">
      <h1 className="admin-title">Events</h1>
      <section className="admin-card">
        <div className="admin-empty">
          <div className="admin-empty-art" aria-hidden>
            📅
          </div>
          <p>No events scheduled yet.</p>
          <p className="admin-muted">Create webinars and community events here.</p>
        </div>
      </section>
    </div>
  )
}
