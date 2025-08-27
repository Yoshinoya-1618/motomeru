// app/api/wanted/[id]/route.ts
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
    .from('wanted')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, {
      status: 404,
      headers: { 'Cache-Control': 'no-store', 'CDN-Cache-Control': 'no-store' }
    })
  }

  const item = data
    ? {
        ...data,
        // 互換キー（priceMax / maxBudget / budgetUpper）
        priceMax: data.budget_upper,
        price_max: data.budget_upper,
        maxBudget: data.budget_upper,
        budgetUpper: data.budget_upper,
      }
    : null

  return NextResponse.json({ ok: true, item }, {
    headers: { 'Cache-Control': 'no-store', 'CDN-Cache-Control': 'no-store' }
  })
}
