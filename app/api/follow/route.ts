// app/api/follow/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ---- env
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SR_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ---- utils
function supabaseAdmin() {
  return createClient(SUPABASE_URL, SR_KEY, { auth: { persistSession: false } })
}

const BodySchema = z.object({
  target: z.string().min(1, '対象ユーザーIDが不正です'),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Bad Request'
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }

  const { target } = parsed.data
  if (target === userId) {
    return NextResponse.json({ ok: false, error: '自分自身はフォローできません' }, { status: 400 })
  }

  const s = supabaseAdmin()

  // 既にフォローしているか確認
  const { data: existing, error: selErr } = await s
    .from('follows')
    .select('from_user,to_user')
    .eq('from_user', userId)
    .eq('to_user', target)
    .maybeSingle()

  if (selErr) {
    return NextResponse.json({ ok: false, error: selErr.message }, { status: 500 })
  }

  if (existing) {
    // 既にフォロー → 解除
    const { error: delErr } = await s
      .from('follows')
      .delete()
      .eq('from_user', userId)
      .eq('to_user', target)

    if (delErr) {
      return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, following: false })
  } else {
    // フォロー作成
    const { error: upErr } = await s
      .from('follows')
      .insert({
        from_user: userId,
        to_user: target,
        created_at: new Date().toISOString(),
      })

    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 })
    }

    // 通知（失敗は握りつぶし）
    const { error: notifErr } = await s.from('notifications').insert({
      user_id: target, // 相手に通知
      type: 'follow',
      payload: { from: userId },
      created_at: new Date().toISOString(),
    })
    if (notifErr) {
      console.warn('[notifications.insert] failed:', notifErr.message)
    }

    return NextResponse.json({ ok: true, following: true })
  }
}
