import { useEffect, useState } from 'react'
import { getHowItWorksVideo, type HowItWorksVideo } from '../adminStore'
import { toVideoEmbedUrl } from '../videoEmbed'
import '../pages/Dashboard.css'

export function HowItWorksPanel() {
  const [meta, setMeta] = useState<HowItWorksVideo>(() => getHowItWorksVideo())
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    function refresh(e?: Event) {
      const detail = (e as CustomEvent<HowItWorksVideo> | undefined)?.detail
      setMeta(detail ?? getHowItWorksVideo())
      setPlaying(false)
    }
    window.addEventListener('pkfx-how-it-works-change', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('pkfx-how-it-works-change', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const embed = toVideoEmbedUrl(meta.url)

  function onPlay() {
    if (!embed) return
    setPlaying(true)
  }

  return (
    <aside className="how-it-works panel animate-fade-up stagger-2">
      <h2 className="font-display">How it works?</h2>
      <div className="video-frame">
        {playing && embed ? (
          <iframe
            className="how-it-works-iframe"
            src={`${embed}${embed.includes('?') ? '&' : '?'}autoplay=1`}
            title={meta.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="video-thumb">
            <div className="video-thumb-content">
              <p className="video-eyebrow">PKFX PROTOCOL</p>
              <p className="video-title">{meta.title}</p>
              <p className="video-sub">{meta.subtitle}</p>
              {!embed && <p className="video-missing">Video link not set yet</p>}
            </div>
            <button
              type="button"
              className="play-btn"
              aria-label="Play video"
              disabled={!embed}
              onClick={onPlay}
            >
              ▶
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
