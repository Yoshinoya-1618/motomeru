// app/api/diag/ping/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const started = performance.now()

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SR_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SR_KEY) {
    return NextResponse.json(
      { ok: false, error: 'Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' },
      { status: 500 },
    )
  }

  // supabase-js はHTTP経由なのでEdgeでも動くが、今回はNodeで固定
  const supabase = createClient(SUPABASE_URL, SR_KEY, {
    auth: { persistSession: false },
  })

  // DB往復の計測（wanted件数をHEADで取得）
  const tDbStart = performance.now()
  const { count, error } = await supabase
    .from('wanted')
    .select('*', { count: 'exact', head: true }) // レコード本体は取らない
  const tDbEnd = performance.now()

  const payload = {
    ok: !error,
    env: {
      node: process.version,
      nextRuntime: 'nodejs',
      supabaseHost: new URL(SUPABASE_URL).host,
    },
    timings_ms: {
      handler_total: Number((tDbEnd - started).toFixed(1)),
      db_head_count: Number((tDbEnd - tDbStart).toFixed(1)),
    },
    db: {
      count: count ?? null,
      error: error?.message ?? null,
    },
  }

  return NextResponse.json(payload, { status: error ? 500 : 200 })
}
