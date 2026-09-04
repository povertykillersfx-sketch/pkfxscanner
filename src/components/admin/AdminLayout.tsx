import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AdminSidebar } from './AdminSidebar'
import { Header } from '../Header'
import './AdminLayout.css'

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="admin-shell">
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <AdminSidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <div className="admin-main">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <div className="admin-scroll">
          <Outlet />
        </div>
      </div>
    </div>
  )
} 
//gadhi