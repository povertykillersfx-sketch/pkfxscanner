import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  BarChart3,
  BookOpen,
  Video,
  Users,
  CalendarDays,
  Heart,
  CreditCard,
  User,
  LogOut,
} from 'lucide-react'
import { Logo } from './Logo'
import './Sidebar.css'

const primaryNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/alerts', label: 'My Alerts', icon: BarChart3 },
  { to: '/ebooks', label: 'E-Books', icon: BookOpen },
  { to: '/courses', label: 'Courses', icon: Video },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/economic-calendar', label: 'Economic Calendar', icon: CalendarDays },
]

const secondaryNav = [
  { to: '/favorites', label: 'My Favorites', icon: Heart },
  { to: '/billing', label: 'Billing', icon: CreditCard },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/logout', label: 'Logout', icon: LogOut },
]

interface SidebarProps {
  open?: boolean
  onNavigate?: () => void
}

export function Sidebar({ open = false, onNavigate }: SidebarProps) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-inner">
        <div className="sidebar-logo">
          <Logo size="md" />
        </div>

        <nav className="sidebar-nav primary" aria-label="Primary">
          {primaryNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onNavigate}
            >
              <Icon size={18} strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <nav className="sidebar-nav secondary" aria-label="Account">
          {secondaryNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item secondary-item ${isActive ? 'active' : ''}`}
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
