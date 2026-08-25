import fs from 'node:fs'
import path from 'node:path'
import { loadEnv, type Plugin, type Connect } from 'vite'

const DATA_DIR = path.resolve(process.cwd(), '.data')
const DATA_FILE = path.join(DATA_DIR, 'pkfx-shared.json')

type Snapshot = {
  updatedAt: string
  community: unknown
  courses: unknown
  ebooks: unknown
  howItWorks: unknown
  tradeIdeas: unknown
}

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
          tradeIdeas: [],
        },
        null,
        2,
      ),
      'utf8',
    )
  }
}

function readLocal(): Snapshot {
  ensureStore()
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as Snapshot
}

function writeLocal(snapshot: Snapshot) {
  ensureStore()
  fs.writeFileSync(DATA_FILE, JSON.stringify(snapshot, null, 2), 'utf8')
}

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function supabaseConfig(mode: string) {
  const env = loadEnv(mode, process.cwd(), '')
  const url = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '')
  const secret =
    env.SUPABASE_SECRET_KEY ||
    env.SB_SECRET_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  const anon = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ''
  return { url, secret, anon }
}

function rowToSnapshot(row: Record<string, unknown> | null): Snapshot {
  return {
    updatedAt: String(row?.updated_at || new Date().toISOString()),
    community: row?.community ?? null,
    courses: Array.isArray(row?.courses) ? row.courses : [],
    ebooks: Array.isArray(row?.ebooks) ? row.ebooks : [],
    howItWorks: row?.how_it_works ?? null,
    tradeIdeas: Array.isArray(row?.trade_ideas) ? row.trade_ideas : [],
  }
}

async function pullSupabase(mode: string): Promise<Snapshot | null> {
  const { url, secret, anon } = supabaseConfig(mode)
  if (!url) return null
  const key = secret || anon
  if (!key) return null
  try {
    const res = await fetch(`${url}/rest/v1/pkfx_shared?id=eq.default&select=*`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
    })
    if (!res.ok) return null
    const rows = (await res.json()) as Record<string, unknown>[]
    if (!Array.isArray(rows) || !rows[0]) {
      return {
        updatedAt: new Date().toISOString(),
        community: null,
        courses: [],
        ebooks: [],
        howItWorks: null,
        tradeIdeas: [],
      }
    }
    return rowToSnapshot(rows[0]!)
  } catch {
    return null
  }
}

async function pushSupabase(mode: string, snapshot: Snapshot): Promise<boolean> {
  const { url, secret } = supabaseConfig(mode)
  if (!url || !secret) return false
  try {
    const res = await fetch(`${url}/rest/v1/pkfx_shared?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: secret,
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        id: 'default',
        community: snapshot.community ?? null,
        courses: snapshot.courses ?? [],
        ebooks: snapshot.ebooks ?? [],
        how_it_works: snapshot.howItWorks ?? null,
        trade_ideas: Array.isArray(snapshot.tradeIdeas) ? snapshot.tradeIdeas : [],
        updated_at: snapshot.updatedAt,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

function syncMiddleware(mode: string): Connect.NextHandleFunction {
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
      if (req.method === 'GET') {
        const remote = await pullSupabase(mode)
        const local = readLocal()
        let out = local
        if (remote) {
          const remoteTs = Date.parse(remote.updatedAt) || 0
          const localTs = Date.parse(local.updatedAt) || 0
          if (remoteTs >= localTs) {
            out = remote
            writeLocal(remote)
          }
        }
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        res.end(JSON.stringify(out))
        return
      }

      if (req.method === 'PUT') {
        const body = await readBody(req)
        const parsed = JSON.parse(body || '{}') as Record<string, unknown>
        const next: Snapshot = {
          community: parsed.community ?? null,
          courses: parsed.courses ?? [],
          ebooks: parsed.ebooks ?? [],
          howItWorks: parsed.howItWorks ?? null,
          tradeIdeas: Array.isArray(parsed.tradeIdeas) ? parsed.tradeIdeas : [],
          updatedAt: new Date().toISOString(),
        }
        writeLocal(next)
        const mirrored = await pushSupabase(mode, next)
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ ...next, mirroredToSupabase: mirrored }))
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

/** Shared JSON store — mirrors to Supabase when SUPABASE_SECRET_KEY is set. */
export function pkfxSyncPlugin(): Plugin {
  let mode = 'development'
  return {
    name: 'pkfx-sync',
    configResolved(config) {
      mode = config.mode
    },
    configureServer(server) {
      server.middlewares.use(syncMiddleware(mode))
    },
    configurePreviewServer(server) {
      server.middlewares.use(syncMiddleware(mode))
    },
  }
}
