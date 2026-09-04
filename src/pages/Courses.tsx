import { useEffect, useMemo, useState } from 'react'
import { getAdminCourses, type AdminCourse } from '../adminStore'
import './Courses.css'

function groupByCategory(courses: AdminCourse[]) {
  const map = new Map<string, AdminCourse[]>()
  for (const c of courses) {
    const key = c.category || 'General'
    const list = map.get(key) || []
    list.push(c)
    map.set(key, list)
  }
  return [...map.entries()]
}

export function Courses() {
  const [courses, setCourses] = useState<AdminCourse[]>(() => getAdminCourses())

  useEffect(() => {
    function refresh() {
      setCourses(getAdminCourses())
    }
    window.addEventListener('pkfx-courses-change', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('pkfx-courses-change', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const sections = useMemo(() => groupByCategory(courses), [courses])

  if (courses.length === 0) {
    return (
      <div className="courses-page">
        <section className="course-section panel">
          <div className="section-banner">
            <h2 className="font-display">COURSES</h2>
          </div>
          <p className="courses-empty">No courses yet. Content added in Admin → Tutorials will appear here.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="courses-page">
      {sections.map(([category, videos], si) => (
        <section key={category} className={`course-section animate-fade-up stagger-${si + 1}`}>
          <div className="section-banner">
            <h2 className="font-display">{category.toUpperCase()}</h2>
          </div>
          <div className="course-grid">
            {videos.map((video) => (
              <article key={video.id} className="course-card panel">
                <div className="course-meta">
                  <h3>{video.title}</h3>
                  <p>{video.description || 'Course lesson'}</p>
                </div>
                <div className="course-player">
                  {video.vimeoUrl ? (
                    <div className="player-available">
                      <span className="player-label font-display">{video.title}</span>
                      <a className="play-btn" href={video.vimeoUrl} target="_blank" rel="noreferrer" aria-label="Play">
                        ▶
                      </a>
                    </div>
                  ) : (
                    <div className="player-unavailable">
                      <span>Soon</span>
                      <p>Video link not set yet</p>
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
