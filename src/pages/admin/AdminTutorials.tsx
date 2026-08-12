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
import { deleteFileBlob, formatBytes, MAX_PDF_BYTES, putFileBlob } from '../../fileStore'
import './admin.css'

export function AdminTutorials() {
  const [courses, setCourses] = useState<AdminCourse[]>(() => getAdminCourses())
  const [books, setBooks] = useState<AdminEbook[]>(() => getAdminEbooks())
  const [bookMsg, setBookMsg] = useState('')
  const [uploading, setUploading] = useState(false)

  const [video, setVideo] = useState({ vimeoUrl: '', title: '', description: '', category: '' })
  const [book, setBook] = useState({
    title: '',
    coverUrl: '',
    description: '',
    category: '',
    url: '',
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

  async function publishEbook(partial: {
    title: string
    coverUrl?: string
    description?: string
    category?: string
    url?: string
    file?: File | null
  }) {
    const id = `b-${Date.now()}`
    let hasFile = false
    let fileName: string | undefined

    if (partial.file) {
      await putFileBlob(id, partial.file)
      hasFile = true
      fileName = partial.file.name
    }

    const entry: AdminEbook = {
      id,
      title: partial.title.trim(),
      coverUrl: (partial.coverUrl || '').trim() || undefined,
      description: (partial.description || '').trim() || 'PDF ebook from PKFX admin',
      category: (partial.category || '').trim() || 'General',
      url: partial.url?.trim() || undefined,
      hasFile,
      fileName,
    }

    const next = [...getAdminEbooks(), entry]
    try {
      saveAdminEbooks(next)
      setBooks(next)
      setBook({ title: '', coverUrl: '', description: '', category: '', url: '' })
      setBookMsg(
        hasFile
          ? `Published “${entry.title}” (${formatBytes(partial.file!.size)}) to client E-Books.`
          : `Published “${entry.title}” to client E-Books.`,
      )
    } catch (err) {
      if (hasFile) await deleteFileBlob(id).catch(() => undefined)
      throw err
    }
  }

  /** Selecting a PDF immediately publishes it to the client E-Books page. */
  async function onPdfSelected(file: File | null) {
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setBookMsg('Please upload a PDF file.')
      return
    }
    if (file.size > MAX_PDF_BYTES) {
      setBookMsg(`PDF is too large (max ${formatBytes(MAX_PDF_BYTES)}). Try a smaller file or paste a PDF URL.`)
      return
    }
    setUploading(true)
    setBookMsg(`Uploading ${file.name} (${formatBytes(file.size)})…`)
    try {
      const title = book.title.trim() || file.name.replace(/\.pdf$/i, '')
      await publishEbook({
        title,
        coverUrl: book.coverUrl,
        description: book.description,
        category: book.category,
        file,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed.'
      setBookMsg(msg)
    } finally {
      setUploading(false)
    }
  }

  async function addBook(e: FormEvent) {
    e.preventDefault()
    if (!book.title.trim()) {
      setBookMsg('Add a title (or upload a PDF — title is taken from the filename).')
      return
    }
    if (!book.url.trim()) {
      setBookMsg('Upload a PDF above, or paste a download URL, then click Add Book.')
      return
    }
    setUploading(true)
    try {
      await publishEbook({
        title: book.title,
        coverUrl: book.coverUrl,
        description: book.description,
        category: book.category,
        url: book.url,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not publish ebook.'
      setBookMsg(msg)
    } finally {
      setUploading(false)
    }
  }

  function removeCourse(id: string) {
    const next = courses.filter((c) => c.id !== id)
    setCourses(next)
    saveAdminCourses(next)
  }

  async function removeBook(id: string) {
    await deleteFileBlob(id).catch(() => undefined)
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
              <span className="admin-muted">{books.length} published</span>
            </div>
            {books.length === 0 ? (
              <p className="admin-muted">No ebooks yet. Upload a PDF — it appears automatically on the client E-Books page.</p>
            ) : (
              <div className="admin-list">
                {books.map((b) => (
                  <div key={b.id} className="admin-list-row">
                    <div className="admin-list-main">
                      <h4>{b.title}</h4>
                      <p className="admin-muted">
                        {b.fileName ? `${b.fileName} · stored` : b.url ? 'External URL' : 'No file'}
                        {b.category ? ` · ${b.category}` : ''}
                      </p>
                    </div>
                    <button type="button" className="admin-icon-btn" aria-label="Edit">
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="admin-icon-btn" aria-label="Delete" onClick={() => void removeBook(b.id)}>
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
            <form className="admin-form" onSubmit={(e) => void addBook(e)}>
              <div className="admin-field">
                <label>Title (optional if uploading PDF)</label>
                <input
                  value={book.title}
                  onChange={(e) => setBook({ ...book, title: e.target.value })}
                  placeholder="Taken from filename when you upload"
                />
              </div>
              <div className="admin-field">
                <label>Upload PDF (up to {formatBytes(MAX_PDF_BYTES)})</label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={uploading}
                  onChange={(e) => {
                    const input = e.target
                    void onPdfSelected(input.files?.[0] ?? null).finally(() => {
                      input.value = ''
                    })
                  }}
                />
                <p className="admin-muted" style={{ marginTop: '0.35rem' }}>
                  Files are stored in this browser and publish straight to the client E-Books portal.
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
              {bookMsg && <p className={bookMsg.toLowerCase().includes('publish') ? 'admin-success' : 'admin-muted'}>{bookMsg}</p>}
              <button type="submit" className="admin-btn" disabled={uploading}>
                <Upload size={16} /> {uploading ? 'Publishing…' : 'Add Book (URL)'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
