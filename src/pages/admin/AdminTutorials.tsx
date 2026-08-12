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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

export function AdminTutorials() {
  const [courses, setCourses] = useState<AdminCourse[]>(() => getAdminCourses())
  const [books, setBooks] = useState<AdminEbook[]>(() => getAdminEbooks())
  const [bookMsg, setBookMsg] = useState('')

  const [video, setVideo] = useState({ vimeoUrl: '', title: '', description: '', category: '' })
  const [book, setBook] = useState({
    title: '',
    coverUrl: '',
    description: '',
    category: '',
    url: '',
    fileData: '',
    fileName: '',
  })

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

  function publishEbook(partial: {
    title: string
    coverUrl?: string
    description?: string
    category?: string
    url?: string
    fileData?: string
    fileName?: string
  }) {
    const next: AdminEbook[] = [
      ...getAdminEbooks(),
      {
        id: `b-${Date.now()}`,
        title: partial.title.trim(),
        coverUrl: (partial.coverUrl || '').trim(),
        description: (partial.description || '').trim() || 'PDF ebook from PKFX admin',
        category: (partial.category || '').trim() || 'General',
        url: partial.url?.trim() || undefined,
        fileData: partial.fileData || undefined,
        fileName: partial.fileName || undefined,
      },
    ]
    setBooks(next)
    saveAdminEbooks(next)
    setBook({ title: '', coverUrl: '', description: '', category: '', url: '', fileData: '', fileName: '' })
    setBookMsg('Published to client E-Books portal.')
  }

  /** Selecting a PDF immediately publishes it to the client E-Books page. */
  async function onPdfSelected(file: File | null) {
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setBookMsg('Please upload a PDF file.')
      return
    }
    if (file.size > 4.5 * 1024 * 1024) {
      setBookMsg('PDF is too large for browser storage (max ~4.5MB). Use a URL instead.')
      return
    }
    try {
      const data = await readFileAsDataUrl(file)
      const title = book.title.trim() || file.name.replace(/\.pdf$/i, '')
      publishEbook({
        title,
        coverUrl: book.coverUrl,
        description: book.description,
        category: book.category,
        fileData: data,
        fileName: file.name,
      })
    } catch {
      setBookMsg('Could not read that PDF.')
    }
  }

  function addBook(e: FormEvent) {
    e.preventDefault()
    if (!book.title.trim()) return
    if (!book.fileData && !book.url.trim()) {
      setBookMsg('Upload a PDF or paste a download URL.')
      return
    }
    publishEbook({
      title: book.title,
      coverUrl: book.coverUrl,
      description: book.description,
      category: book.category,
      url: book.url,
      fileData: book.fileData,
      fileName: book.fileName,
    })
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
            {courses.length === 0 ? (
              <p className="admin-muted">No courses yet. Add media on the right — it syncs to client Courses.</p>
            ) : (
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
            )}
          </section>

          <section className="admin-card">
            <div className="admin-card-head">
              <h2>My Books</h2>
            </div>
            {books.length === 0 ? (
              <p className="admin-muted">No ebooks yet. Upload a PDF — it appears automatically on the client E-Books page.</p>
            ) : (
              <div className="admin-list">
                {books.map((b) => (
                  <div key={b.id} className="admin-list-row">
                    <div className="admin-list-main">
                      <h4>{b.title}</h4>
                      <a
                        className="admin-link"
                        href={b.fileData || b.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        download={b.fileName || `${b.title}.pdf`}
                      >
                        Download{b.fileName ? ` (${b.fileName})` : ''}
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
            )}
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
              <h2>Add Ebook (PDF)</h2>
            </div>
            <form className="admin-form" onSubmit={addBook}>
              <div className="admin-field">
                <label>Title</label>
                <input value={book.title} onChange={(e) => setBook({ ...book, title: e.target.value })} required />
              </div>
              <div className="admin-field">
                <label>Upload PDF</label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => {
                    const input = e.target
                    void onPdfSelected(input.files?.[0] ?? null).finally(() => {
                      input.value = ''
                    })
                  }}
                />
                <p className="admin-muted" style={{ marginTop: '0.35rem' }}>
                  PDF uploads publish straight to the client E-Books portal.
                </p>
              </div>
              <div className="admin-field">
                <label>Cover URL (optional)</label>
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
                <label>Or PDF URL</label>
                <input value={book.url} onChange={(e) => setBook({ ...book, url: e.target.value })} placeholder="https://..." />
              </div>
              {bookMsg && <p className="admin-muted">{bookMsg}</p>}
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
