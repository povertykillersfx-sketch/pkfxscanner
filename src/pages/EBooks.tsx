import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { getAdminEbooks, type AdminEbook } from '../adminStore'
import { getFileBlob } from '../fileStore'
import './EBooks.css'

type BookView = AdminEbook & { href: string }

export function EBooks() {
  const [books, setBooks] = useState<BookView[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let objectUrls: string[] = []

    function revokeAll() {
      for (const u of objectUrls) URL.revokeObjectURL(u)
      objectUrls = []
    }

    async function refresh() {
      setLoading(true)
      revokeAll()
      const meta = getAdminEbooks()
      const views: BookView[] = []

      for (const book of meta) {
        let href = book.url || ''
        if (book.fileData) {
          href = book.fileData
        } else if (book.hasFile) {
          try {
            const blob = await getFileBlob(book.id)
            if (blob) {
              const url = URL.createObjectURL(blob)
              objectUrls.push(url)
              href = url
            }
          } catch {
            // keep external url if any
          }
        }
        views.push({ ...book, href: href || '#' })
      }

      if (!cancelled) {
        setBooks(views)
        setLoading(false)
      }
    }

    void refresh()
    const onChange = () => void refresh()
    window.addEventListener('pkfx-ebooks-change', onChange)
    window.addEventListener('storage', onChange)
    return () => {
      cancelled = true
      window.removeEventListener('pkfx-ebooks-change', onChange)
      window.removeEventListener('storage', onChange)
      revokeAll()
    }
  }, [])

  if (loading) {
    return (
      <div className="ebooks-page">
        <div className="ebooks-empty panel">
          <h2 className="font-display">E-Books</h2>
          <p>Loading ebooks…</p>
        </div>
      </div>
    )
  }

  if (books.length === 0) {
    return (
      <div className="ebooks-page">
        <div className="ebooks-empty panel">
          <h2 className="font-display">E-Books</h2>
          <p>No ebooks published yet. Your admin can upload PDFs from the Admin Tutorials page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="ebooks-page">
      <div className="ebooks-grid">
        {books.map((book, i) => {
          const cover = book.coverUrl
          const canDownload = Boolean(book.href && book.href !== '#')
          return (
            <article key={book.id} className={`ebook-card panel animate-fade-up stagger-${(i % 4) + 1}`}>
              <div className="ebook-cover">
                {cover ? (
                  <img className="cover-img" src={cover} alt="" />
                ) : (
                  <pre className="cover-title font-display">{book.title.toUpperCase()}</pre>
                )}
                <div className="cover-logo">
                  <img src="/brand/logo-mark.png?v=pkfx5" alt="" width={36} height={36} />
                </div>
              </div>
              <div className="ebook-body">
                <h2>{book.title}</h2>
                <p>{book.description || book.category || 'PKFX ebook'}</p>
                {canDownload ? (
                  <a
                    className="btn btn-primary download-btn"
                    href={book.href}
                    download={book.fileName || `${book.title}.pdf`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download size={16} />
                    Download
                  </a>
                ) : (
                  <span className="btn btn-primary download-btn" style={{ opacity: 0.5, pointerEvents: 'none' }}>
                    <Download size={16} />
                    Unavailable
                  </span>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
