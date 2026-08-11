import { useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Trash2, Upload } from 'lucide-react'
import {
  getAdminCourses,
  getAdminEbooks,
  saveAdminCourses,
  saveAdminEbooks,
  type AdminCourse,
  type AdminEbook,
} from '../../adminStore'
import './admin.css'

export function AdminTutorials() {
  const [courses, setCourses] = useState<AdminCourse[]>(() => getAdminCourses())
  const [books, setBooks] = useState<AdminEbook[]>(() => getAdminEbooks())

  const [video, setVideo] = useState({ vimeoUrl: '', title: '', description: '', category: '' })
  const [book, setBook] = useState({ title: '', coverUrl: '', description: '', category: '', url: '' })

  function addCourse(e: FormEvent) {
    e.preventDefault()
    if (!video.title.trim()) return
    const next = [
      ...courses,
      {
        id: `c-${Date.now()}`,
        title: video.title.trim(),
        category: video.category.trim() || 'General',
        vimeoUrl: video.vimeoUrl.trim(),
        description: video.description.trim(),
      },
    ]
    setCourses(next)
    saveAdminCourses(next)
    setVideo({ vimeoUrl: '', title: '', description: '', category: '' })
  }

  function addBook(e: FormEvent) {
    e.preventDefault()
    if (!book.title.trim()) return
    const next = [
      ...books,
      {
        id: `b-${Date.now()}`,
        title: book.title.trim(),
        coverUrl: book.coverUrl.trim(),
        description: book.description.trim(),
        category: book.category.trim() || 'General',
        url: book.url.trim() || '#',
      },
    ]
    setBooks(next)
    saveAdminEbooks(next)
    setBook({ title: '', coverUrl: '', description: '', category: '', url: '' })
  }

  function removeCourse(id: string) {
    const next = courses.filter((c) => c.id !== id)
    setCourses(next)
    saveAdminCourses(next)
  }

  function removeBook(id: string) {
    const next = books.filter((b) => b.id !== id)
    setBooks(next)
    saveAdminEbooks(next)
  }

  return (
    <div className="admin-page">
      <div className="admin-two-col">
        <div style={{ display: 'grid', gap: '0.85rem' }}>
          <section className="admin-card">
            <div className="admin-card-head">
              <h2>My Courses</h2>
            </div>
            <div className="admin-list">
              {courses.map((c) => (
                <div key={c.id} className="admin-list-row">
                  <div className="admin-list-main">
                    <h4>{c.title}</h4>
                    <span className="admin-tag">{c.category}</span>
                  </div>
                  <button type="button" className="admin-icon-btn" aria-label="Edit">
                    <Pencil size={15} />
                  </button>
                  <button type="button" className="admin-icon-btn" aria-label="Delete" onClick={() => removeCourse(c.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card-head">
              <h2>My Books</h2>
            </div>
            <div className="admin-list">
              {books.map((b) => (
                <div key={b.id} className="admin-list-row">
                  <div className="admin-list-main">
                    <h4>{b.title}</h4>
                    <a className="admin-link" href={b.url || '#'} target="_blank" rel="noreferrer">
                      Download
                    </a>
                  </div>
                  <button type="button" className="admin-icon-btn" aria-label="Edit">
                    <Pencil size={15} />
                  </button>
                  <button type="button" className="admin-icon-btn" aria-label="Delete" onClick={() => removeBook(b.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div style={{ display: 'grid', gap: '0.85rem' }}>
          <section className="admin-card">
            <div className="admin-card-head">
              <h2>Add Content</h2>
            </div>
            <form className="admin-form" onSubmit={addCourse}>
              <div className="admin-field">
                <label>Vimeo Link</label>
                <input value={video.vimeoUrl} onChange={(e) => setVideo({ ...video, vimeoUrl: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Video Title</label>
                <input value={video.title} onChange={(e) => setVideo({ ...video, title: e.target.value })} required />
              </div>
              <div className="admin-field">
                <label>Description</label>
                <input value={video.description} onChange={(e) => setVideo({ ...video, description: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Category</label>
                <input value={video.category} onChange={(e) => setVideo({ ...video, category: e.target.value })} />
              </div>
              <button type="submit" className="admin-btn">
                <Upload size={16} /> Add Media
              </button>
            </form>
          </section>

          <section className="admin-card">
            <div className="admin-card-head">
              <h2>Add Ebook</h2>
            </div>
            <form className="admin-form" onSubmit={addBook}>
              <div className="admin-field">
                <label>Title</label>
                <input value={book.title} onChange={(e) => setBook({ ...book, title: e.target.value })} required />
              </div>
              <div className="admin-field">
                <label>Cover URL</label>
                <input value={book.coverUrl} onChange={(e) => setBook({ ...book, coverUrl: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Description</label>
                <input value={book.description} onChange={(e) => setBook({ ...book, description: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Category</label>
                <select value={book.category} onChange={(e) => setBook({ ...book, category: e.target.value })}>
                  <option value="">Choose an option...</option>
                  <option>Introduction</option>
                  <option>Technical Analysis</option>
                  <option>General</option>
                </select>
              </div>
              <div className="admin-field">
                <label>URL</label>
                <input value={book.url} onChange={(e) => setBook({ ...book, url: e.target.value })} />
              </div>
              <button type="submit" className="admin-btn">
                <Upload size={16} /> Add Book
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
