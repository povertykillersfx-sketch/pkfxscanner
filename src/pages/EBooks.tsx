import { Download } from 'lucide-react'
import { EBOOKS } from '../data/mockData'
import './EBooks.css'

export function EBooks() {
  return (
    <div className="ebooks-page">
      <div className="ebooks-grid">
        {EBOOKS.map((book, i) => (
          <article key={book.id} className={`ebook-card panel animate-fade-up stagger-${(i % 4) + 1}`}>
            <div className="ebook-cover">
              <pre className="cover-title font-display">{book.coverTitle}</pre>
              <div className="cover-logo">
                <img src="/brand/logo-mark.png" alt="" width={36} height={36} />
              </div>
            </div>
            <div className="ebook-body">
              <h2>{book.title}</h2>
              <p>{book.description}</p>
              <button type="button" className="btn btn-primary download-btn">
                <Download size={16} />
                Download
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
