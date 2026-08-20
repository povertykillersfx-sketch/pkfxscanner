import fs from 'node:fs'
import path from 'node:path'
import type { Plugin, Connect } from 'vite'

const DATA_DIR = path.resolve(process.cwd(), '.data')
const DATA_FILE = path.join(DATA_DIR, 'pkfx-shared.json')

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(
        {
          updatedAt: new Date().toISOString(),
          community: null,
          courses: [],
          ebooks: [],
          howItWorks: null,
        },
        null,
        2,
      ),
      'utf8',
    )
  }
}

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function syncMiddleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const url = req.url || ''
    if (!url.startsWith('/api/sync')) return next()

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return
    }

    try {
      ensureStore()

      if (req.method === 'GET') {
        const raw = fs.readFileSync(DATA_FILE, 'utf8')
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        res.end(raw)
        return
      }

      if (req.method === 'PUT') {
        const body = await readBody(req)
        const parsed = JSON.parse(body || '{}') as Record<string, unknown>
        const next = {
          ...parsed,
          updatedAt: new Date().toISOString(),
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(next, null, 2), 'utf8')
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify(next))
        return
      }

      res.statusCode = 405
      res.end(JSON.stringify({ error: 'Method not allowed' }))
    } catch (err) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(
        JSON.stringify({
          error: err instanceof Error ? err.message : 'Sync failed',
        }),
      )
    }
  }
}

/** Shared JSON store so admin changes reach every device on this host. */
export function pkfxSyncPlugin(): Plugin {
  return {
    name: 'pkfx-sync',
    configureServer(server) {
      server.middlewares.use(syncMiddleware())
    },
    configurePreviewServer(server) {
      server.middlewares.use(syncMiddleware())
    },
  }
}
