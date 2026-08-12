import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { getAdminEbooks, type AdminEbook } from '../adminStore'
import './EBooks.css'

export function EBooks() {
  const [books, setBooks] = useState<AdminEbook[]>(() => getAdminEbooks())

  useEffect(() => {
    function refresh() {
      setBooks(getAdminEbooks())
    }
    window.addEventListener('pkfx-ebooks-change', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('pkfx-ebooks-change', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

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
          const href = book.fileData || book.url || '#'
          const cover = book.coverUrl
          return (
            <article key={book.id} className={`ebook-card panel animate-fade-up stagger-${(i % 4) + 1}`}>
              <div className="ebook-cover">
                {cover ? (
                  <img className="cover-img" src={cover} alt="" />
                ) : (
                  <pre className="cover-title font-display">{book.title.toUpperCase()}</pre>
                )}
                <div className="cover-logo">
                  <img src="/brand/logo-mark.png" alt="" width={36} height={36} />
                </div>
              </div>
              <div className="ebook-body">
                <h2>{book.title}</h2>
                <p>{book.description || book.category || 'PKFX ebook'}</p>
                <a className="btn btn-primary download-btn" href={href} download={book.fileName || `${book.title}.pdf`} target="_blank" rel="noreferrer">
                  <Download size={16} />
                  Download
                </a>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
