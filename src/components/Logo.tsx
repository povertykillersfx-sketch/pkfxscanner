import { useTheme } from '../theme'
import './Logo.css'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'full' | 'compact'
}

export function Logo({ size = 'md', variant = 'full' }: LogoProps) {
  const { theme } = useTheme()
  // Dark: PK is white · Light: PK is black — only that differs for the wordmark
  const src =
    theme === 'light' ? '/brand/logo-light.png?v=pkfx6' : '/brand/logo-dark.png?v=pkfx6'

  return (
    <div className={`logo logo-${size} logo-${variant}`}>
      <img className="logo-img" src={src} alt="PKFX — Poverty Killers" draggable={false} />
    </div>
  )
}
