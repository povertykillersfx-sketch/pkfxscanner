import { COURSE_SECTIONS } from '../data/mockData'
import './Courses.css'

export function Courses() {
  return (
    <div className="courses-page">
      {COURSE_SECTIONS.map((section, si) => (
        <section key={section.id} className={`course-section animate-fade-up stagger-${si + 1}`}>
          <div className="section-banner">
            <h2 className="font-display">{section.title}</h2>
          </div>
          <div className="course-grid">
            {section.videos.map((video) => (
              <article key={video.id} className="course-card panel">
                <div className="course-meta">
                  <h3>{video.title}</h3>
                  <p>{video.description}</p>
                </div>
                <div className="course-player">
                  {video.available ? (
                    <div className="player-available">
                      <span className="player-label font-display">{video.thumbnail}</span>
                      <button type="button" className="play-btn" aria-label="Play">
                        ▶
                      </button>
                    </div>
                  ) : (
                    <div className="player-unavailable">
                      <span>Sorry</span>
                      <p>This video isn&apos;t available</p>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
