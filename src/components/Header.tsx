import { CircleUserRound, Menu } from 'lucide-react'
import { getCurrentUser } from '../auth'
import './Header.css'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const user = getCurrentUser()
  const firstName = user?.firstName ?? 'Trader'

  return (
    <header className="app-header animate-fade-up">
      <button className="menu-toggle" type="button" aria-label="Open menu" onClick={onMenuClick}>
        <Menu size={22} />
      </button>
      <span className="header-avatar" aria-hidden>
        <CircleUserRound size={26} strokeWidth={1.75} />
      </span>
      <h1 className="header-welcome">
        Welcome <span className="name">{firstName}</span>{' '}
        <span className="wave" aria-hidden>
          👋
        </span>
      </h1>
    </header>
  )
}
