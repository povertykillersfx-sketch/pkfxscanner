/** Turn a YouTube / Vimeo / direct link into an embeddable URL when possible. */
export function toVideoEmbedUrl(raw: string): string | null {
  const url = raw.trim()
  if (!url) return null

  try {
    const u = new URL(url)

    // Already an embed URL
    if (u.hostname.includes('youtube.com') && u.pathname.startsWith('/embed/')) {
      return u.toString()
    }
    if (u.hostname.includes('player.vimeo.com')) {
      return u.toString()
    }

    // youtu.be/<id>
    if (u.hostname.replace(/^www\./, '') === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0]
      if (id) return `https://www.youtube.com/embed/${id}`
    }

    // youtube.com/watch?v=<id> or /shorts/<id>
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`
      const parts = u.pathname.split('/').filter(Boolean)
      if (parts[0] === 'shorts' && parts[1]) {
        return `https://www.youtube.com/embed/${parts[1]}`
      }
    }

    // vimeo.com/<id>
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop()
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`
    }

    // Direct video file or other URL — open as-is in iframe when http(s)
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      return u.toString()
    }
  } catch {
    return null
  }

  return null
}
