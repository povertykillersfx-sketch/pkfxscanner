import { Menu } from 'lucide-react'
import { USER } from '../data/mockData'
import './Header.css'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="app-header animate-fade-up">
      <button className="menu-toggle" type="button" aria-label="Open menu" onClick={onMenuClick}>
        <Menu size={22} />
      </button>
      <img className="header-avatar" src={USER.avatar} alt="" width={40} height={40} />
      <h1 className="header-welcome">
        Welcome <span className="name">{USER.firstName}</span>{' '}
        <span className="wave" aria-hidden>
          👋
        </span>
      </h1>
    </header>
  )
}
