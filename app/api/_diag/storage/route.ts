import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  })
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env')
  return createClient(url, key, { auth: { persistSession: false } })
}

// GET /api/_diag/storage?url=<public-url>
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const u = searchParams.get('url')
    if (!u) return json({ ok:false, error:'url_required' }, 400)

    const parsed = new URL(u)
    // 形式: /storage/v1/object/public/<bucket>/<path>
    const m = parsed.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/)
    if (!m) return json({ ok:false, error:'not_public_url' }, 400)

    const bucket = m[1]
    const path = m[2]
    const folder = path.split('/').slice(0, -1).join('/')
    const name = path.split('/').pop()!

    const supa = getAdmin()
    const { data: list, error } = await supa.storage.from(bucket).list(folder, { limit: 100 })
    if (error) return json({ ok:false, error: error.message }, 500)

    const exists = (list || []).some(o => o.name === name)
    return json({ ok:true, bucket, path, exists })
  } catch (e: any) {
    return json({ ok:false, error: String(e?.message || e) }, 500)
  }
}
