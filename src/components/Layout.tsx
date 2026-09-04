import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ProfileModal } from './ProfileModal'
import './Layout.css'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const showProfile = location.pathname === '/profile'

  return (
    <div className="cyber-bg">
      <div className="app-shell">
        {sidebarOpen && (
          <button
            className="sidebar-backdrop"
            type="button"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
        <div className="main-area">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <div className="main-scroll">
            <Outlet />
          </div>
        </div>
      </div>

      {showProfile && (
        <ProfileModal
          onClose={() => {
            navigate('/dashboard')
          }}
        />
      )}
    </div>
  )
}
