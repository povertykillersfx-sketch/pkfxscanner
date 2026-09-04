/** IndexedDB blob storage for large PDF uploads (far beyond localStorage limits). */

const DB_NAME = 'pkfx_files_v1'
const STORE = 'blobs'
const DB_VERSION = 1

/** Soft cap for a single PDF upload (bytes). IndexedDB can hold much more. */
export const MAX_PDF_BYTES = 80 * 1024 * 1024 // 80 MB

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('Could not open file database'))
  })
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('IndexedDB request failed'))
  })
}

export async function putFileBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    await idbReq(tx.objectStore(STORE).put(blob, id))
  } finally {
    db.close()
  }
}

export async function getFileBlob(id: string): Promise<Blob | null> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readonly')
    const result = await idbReq(tx.objectStore(STORE).get(id))
    return (result as Blob) || null
  } finally {
    db.close()
  }
}

export async function deleteFileBlob(id: string): Promise<void> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    await idbReq(tx.objectStore(STORE).delete(id))
  } finally {
    db.close()
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
