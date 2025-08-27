// app/api/comments/route.ts
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

const NG_WORDS = ['無料', '無償', 'タダ']

const BodySchema = z.object({
  targetId: z.string().min(1), // 対象のWanted/SwapのID
  targetType: z.enum(['wanted', 'swap']),
  content: z
    .string()
    .trim()
    .min(1, 'コメントを入力してください')
    .max(1000, 'コメントは1000文字までです'),
})

// ---- POST /api/comments
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  // NOTE: NextAuthの既定型には user.id が無いので any で取得し、存在チェックする
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
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Bad Request' },
      { status: 400 },
    )
  }

  const { targetId, targetType, content } = parsed.data

  // NGワードチェック
  if (NG_WORDS.some((w) => content.includes(w))) {
    return NextResponse.json({ ok: false, error: 'NGワードが含まれています' }, { status: 400 })
  }

  const s = supabaseAdmin()

  // 1) コメント保存
  const { data: inserted, error: cmtErr } = await s
    .from('comments')
    .insert({
      user_id: userId,
      target_id: targetId,
      target_type: targetType,
      content,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (cmtErr) {
    return NextResponse.json({ ok: false, error: cmtErr.message }, { status: 500 })
  }

  // 2) 通知（失敗しても処理は続行）
  const payload = {
    targetId,
    targetType,
    preview: content.slice(0, 120),
  }

  const { error: notifErr } = await s.from('notifications').insert({
    user_id: userId, // TODO: 本来は「相手ユーザーID」にする（対象投稿の所有者など）
    type: 'comment',
    payload,
    created_at: new Date().toISOString(),
  })

  if (notifErr) {
    console.warn('[notifications.insert] failed:', notifErr.message)
  }

  return NextResponse.json({ ok: true, id: inserted?.id })
}
