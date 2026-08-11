import './Logo.css'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ size = 'md' }: LogoProps) {
  return (
    <div className={`logo logo-${size}`}>
      <div className="logo-mark" aria-hidden>
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="10" fill="#05010d" />
          <path
            d="M24 6c-1.5 5-6.5 8.5-11.5 10 3.5 1.8 6.8 5.2 8.5 10.5 1.7-5.3 5-8.7 8.5-10.5C24.5 14.5 19.5 11 24 6z"
            fill="#bf00ff"
          />
          <path
            d="M12 22c0 12 5.5 20.5 12 24 6.5-3.5 12-12 12-24-5 3.5-8.5 7-12 12-3.5-5-7-8.5-12-12z"
            fill="#d946ef"
          />
          <path d="M18.5 17c1.8 3.5 3.5 5.5 5.5 7 2-1.5 3.7-3.5 5.5-7-3.5.8-7 .8-11 0z" fill="#f0abfc" />
        </svg>
      </div>
      <span className="logo-text">
        <span className="logo-pk">PK</span>
        <span className="logo-fx">FX</span>
      </span>
    </div>
  )
}
