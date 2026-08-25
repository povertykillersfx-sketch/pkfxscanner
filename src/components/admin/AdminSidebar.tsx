import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ListOrdered,
  BookOpen,
  CalendarDays,
  Users,
  CreditCard,
  LogOut,
} from 'lucide-react'
import { Logo } from '../Logo'
import './AdminSidebar.css'

const primaryNav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/requests', label: 'Requests', icon: ListOrdered },
  { to: '/admin/tutorials', label: 'Tutorials', icon: BookOpen },
  { to: '/admin/events', label: 'Events', icon: CalendarDays },
  { to: '/admin/members', label: 'Members', icon: Users },
]

const secondaryNav = [
  { to: '/billing', label: 'View Subscription', icon: CreditCard },
  { to: '/logout', label: 'Logout', icon: LogOut },
]

interface AdminSidebarProps {
  open?: boolean
  onNavigate?: () => void
}

export function AdminSidebar({ open = false, onNavigate }: AdminSidebarProps) {
  return (
    <aside className={`admin-sidebar ${open ? 'open' : ''}`}>
      <div className="admin-sidebar-inner">
        <div className="admin-sidebar-brand">
          <Logo size="md" />
          <span className="admin-portal-badge">Admin Portal</span>
        </div>

        <nav className="admin-nav" aria-label="Admin">
          {primaryNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
              onClick={onNavigate}
            >
              <Icon size={18} strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <nav className="admin-nav admin-nav-foot" aria-label="Account">
          {secondaryNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `admin-nav-item quiet ${isActive ? 'active' : ''}`}
              onClick={onNavigate}
            >
              <Icon size={18} strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  )
}
