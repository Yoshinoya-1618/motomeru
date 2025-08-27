// app/api/swap/[id]/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only
  { auth: { persistSession: false } }
)

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  const { data, error } = await supabaseAdmin
    .from('swaps')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, {
      status: 404,
      headers: { 'Cache-Control': 'no-store', 'CDN-Cache-Control': 'no-store' }
    })
  }

  return NextResponse.json({ ok: true, item: data }, {
    headers: { 'Cache-Control': 'no-store', 'CDN-Cache-Control': 'no-store' }
  })
}
