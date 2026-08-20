import './Logo.css'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'full' | 'compact'
}

export function Logo({ size = 'md', variant = 'full' }: LogoProps) {
  // Official brand lockup — used exactly as provided (bull + FX)
  const src = '/brand/IMG_6021.PNG?v=pkfx5'

  return (
    <div className={`logo logo-${size} logo-${variant}`}>
      <img className="logo-img" src={src} alt="PKFX" draggable={false} />
    </div>
  )
}
