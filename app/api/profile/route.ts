import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ProfileRow = {
  id: string
  nickname: string | null
  bio: string | null
  avatar_url: string | null
  created_at?: string | null
  updated_at?: string | null
}

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase ENV (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

function localPart(email?: string | null) {
  if (!email) return null
  const i = email.indexOf('@')
  return i > 0 ? email.slice(0, i) : email
}

const NG_WORDS = ['無料', '無償', 'タダ']
const NICK_MAX = 20
const BIO_MAX = 1000

type SafeUser = {
  id?: string | null
  email?: string | null
  name?: string | null
  image?: string | null
}

/** セッションと一意キー（id→なければemail）を抽出 */
async function getSessionKey() {
  const session = (await getServerSession(authOptions as any)) as Session | null
  const user = (session?.user ?? null) as SafeUser | null
  const email = (user?.email ?? undefined) as string | undefined
  const id = (user?.id ?? undefined) as string | undefined // ない構成もある
  const key = id || email
  return { session, user, email, id, key }
}

/** GET /api/profile : 取得（無ければ自動作成） */
export async function GET(_req: NextRequest) {
  try {
    const { session, user, email, key } = await getSessionKey()
    if (!session || !key) return json({ ok: false, error: 'not_authenticated' }, 401)

    const supa = getAdmin()

    const { data: row, error } = await supa
      .from('profiles')
      .select('*')
      .eq('id', key)
      .maybeSingle<ProfileRow>()

    if (error) return json({ ok: false, error: error.message }, 500)
    if (row) return json({ ok: true, profile: row })

    // 無ければ自動作成
    const nickname =
      (user?.name && String(user.name).trim()) ||
      localPart(email || '') ||
      'ユーザー'
    const avatar_url: string | null = user?.image ? String(user.image) : null

    const insertRow: ProfileRow = {
      id: key,
      nickname,
      bio: null,
      avatar_url,
    }

    const { data: created, error: insErr } = await supa
      .from('profiles')
      .insert(insertRow)
      .select('*')
      .single<ProfileRow>()

    if (insErr) return json({ ok: false, error: insErr.message }, 500)
    return json({ ok: true, profile: created })
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) }, 500)
  }
}

/** PUT /api/profile : 更新（upsert） */
export async function PUT(req: NextRequest) {
  try {
    const { session, key } = await getSessionKey()
    if (!session || !key) return json({ ok: false, error: 'not_authenticated' }, 401)

    const body = await req.json().catch(() => ({}))
    let nickname: string | null = body?.nickname ?? null
    let bio: string | null = body?.bio ?? null
    let avatar_url: string | null = body?.avatar_url ?? null

    // バリデーション
    if (nickname != null) {
      nickname = String(nickname).trim()
      if (!nickname) return json({ ok: false, error: 'ニックネームを入力してください' }, 400)
      if (nickname.length > NICK_MAX)
        return json({ ok: false, error: `ニックネームは${NICK_MAX}文字以内です` }, 400)
      if (NG_WORDS.some((w) => nickname!.includes(w)))
        return json({ ok: false, error: 'NGワード（無料/無償/タダ 等）は使用できません' }, 400)
    }
    if (bio != null) {
      bio = String(bio)
      if (bio.length > BIO_MAX)
        return json({ ok: false, error: `自己紹介は${BIO_MAX}文字以内です` }, 400)
      if (NG_WORDS.some((w) => bio!.includes(w)))
        return json({ ok: false, error: 'NGワード（無料/無償/タダ 等）は使用できません' }, 400)
    }
    if (avatar_url != null) avatar_url = String(avatar_url)

    const supa = getAdmin()
    const upsertRow: Partial<ProfileRow> = {
      id: key,
      nickname,
      bio,
      avatar_url,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supa
      .from('profiles')
      .upsert(upsertRow, { onConflict: 'id' })
      .select('*')
      .single<ProfileRow>()

    if (error) return json({ ok: false, error: error.message }, 500)

    return json({ ok: true, profile: data })
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) }, 500)
  }
}
