/**
 * PKFX shared sync Edge Function
 * GET  → read community / courses / ebooks / how_it_works
 * PUT  → upsert the same payload (admin publish)
 *
 * Deploy: npx supabase functions deploy sync
 * URL:    https://<project-ref>.supabase.co/functions/v1/sync
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'

type SharedRow = {
  id: string
  community: unknown
  courses: unknown
  ebooks: unknown
  how_it_works: unknown
  updated_at: string
}

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function toSnapshot(row: SharedRow | null) {
  return {
    updatedAt: row?.updated_at || new Date().toISOString(),
    community: row?.community ?? null,
    courses: Array.isArray(row?.courses) ? row!.courses : [],
    ebooks: Array.isArray(row?.ebooks) ? row!.ebooks : [],
    howItWorks: row?.how_it_works ?? null,
  }
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req)
  if (preflight) return preflight

  try {
    const supabase = adminClient()

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('pkfx_shared')
        .select('*')
        .eq('id', 'default')
        .maybeSingle()

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse(toSnapshot((data as SharedRow | null) ?? null))
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const body = (await req.json().catch(() => ({}))) as {
        community?: unknown
        courses?: unknown
        ebooks?: unknown
        howItWorks?: unknown
        updatedAt?: string
      }

      const updatedAt = new Date().toISOString()
      const row = {
        id: 'default',
        community: body.community ?? null,
        courses: Array.isArray(body.courses) ? body.courses : [],
        ebooks: Array.isArray(body.ebooks) ? body.ebooks : [],
        how_it_works: body.howItWorks ?? null,
        updated_at: updatedAt,
      }

      const { data, error } = await supabase
        .from('pkfx_shared')
        .upsert(row, { onConflict: 'id' })
        .select('*')
        .single()

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse(toSnapshot(data as SharedRow))
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    return jsonResponse({ error: message }, 500)
  }
})
