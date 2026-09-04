import './Logo.css'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'full' | 'compact'
}

export function Logo({ size = 'md', variant = 'full' }: LogoProps) {
  // Exact brand lockup provided by user (bull + FX) — do not swap artwork
  const src = '/brand/IMG_6021.PNG?v=pkfx7'

  return (
    <div className={`logo logo-${size} logo-${variant}`}>
      <img className="logo-img" src={src} alt="PKFX" draggable={false} />
    </div>
  )
}
