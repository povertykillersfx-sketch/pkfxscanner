import { useTheme } from '../theme'
import './Logo.css'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  /** Compact = icon + PKFX only feel via CSS crop; full shows poverty killers tagline */
  variant?: 'full' | 'compact'
}

export function Logo({ size = 'md', variant = 'full' }: LogoProps) {
  const { theme } = useTheme()
  const src = theme === 'light' ? '/brand/logo-light.png' : '/brand/logo-dark.png'

  return (
    <div className={`logo logo-${size} logo-${variant}`}>
      <img
        className="logo-img"
        src={src}
        alt="PKFX — Poverty Killers"
        draggable={false}
      />
    </div>
  )
}
