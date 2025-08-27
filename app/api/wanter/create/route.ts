import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { randomUUID } from 'crypto'
import path from 'node:path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const MAX_FILES = 5
const MAX_SIZE = 5 * 1024 * 1024

const WantSchema = z.object({
  title: z.string().min(3).max(40),
  description: z.string().min(10).max(1000),
  category: z.enum(['card','doujin','figure','game','music','book','other']).default('other'),
  budget_jpy: z.string().regex(/^\d+$/).transform(v=>parseInt(v,10)).refine(n=>n>=0 && n<=99_999_999),
  duration: z.enum(['48','72','unlimited']).default('72'),
  csrf_token: z.string().min(10),
})

const BUCKET = new Map<string, { count: number; reset: number }>()
function rateLimit(ip: string, limit = 5, windowMs = 60*60*1000) {
  const now=Date.now(); const b=BUCKET.get(ip)
  if (!b || now>b.reset){ BUCKET.set(ip,{count:1,reset:now+windowMs}); return true }
  if (b.count>=limit) return false; b.count++; return true
}

export async function POST(req: NextRequest) {
  try{
    const session = await getServerSession(authOptions)
    const userEmail = session?.user?.email
    if (!userEmail) {
      const url = new URL('/auth/login', req.url); url.searchParams.set('callbackUrl','/new')
      return NextResponse.redirect(url, 303)
    }

    const form = await req.formData()
    const plain: Record<string, any> = {}
    for (const [k, v] of form.entries()) if (!(v instanceof File)) plain[k] = v
    const csrfCookie = req.cookies.get('motomeru_csrf')?.value

    const parsed = WantSchema.safeParse(plain)
    if (!parsed.success) {
      const msg = encodeURIComponent(parsed.error.issues[0]?.message ?? '入力エラー')
      return NextResponse.redirect(new URL(`/new?error=${msg}`, req.url), 303)
    }
    const body = parsed.data

    if (!csrfCookie || csrfCookie !== body.csrf_token) {
      return NextResponse.redirect(new URL(`/new?error=${encodeURIComponent('CSRF検証に失敗しました')}`, req.url), 303)
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '0.0.0.0'
    if (!rateLimit(ip)) {
      return NextResponse.redirect(new URL(`/new?error=${encodeURIComponent('投稿が多すぎます。時間をおいて再試行してください')}`, req.url), 303)
    }

    // 期限
    let expires_at: string | null = null
    if (body.duration !== 'unlimited') {
      const hours = body.duration === '48' ? 48 : 72
      expires_at = new Date(Date.now() + hours*60*60*1000).toISOString()
    }

    // 画像アップロード（複数）
    const supabaseSrv = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const files = form.getAll('photos').filter(f => f instanceof File) as File[]
    const files5 = files.slice(0, MAX_FILES)

    const uploaded: string[] = []
    for (const f of files5) {
      if (!f.type.startsWith('image/')) {
        return NextResponse.redirect(new URL(`/new?error=${encodeURIComponent('画像ファイルを選択してください')}`, req.url), 303)
      }
      if (f.size > MAX_SIZE) {
        return NextResponse.redirect(new URL(`/new?error=${encodeURIComponent('各画像は5MB以内でお願いします')}`, req.url), 303)
      }
      const ext = path.extname(f.name || '.jpg') || '.jpg'
      const now = new Date()
      const key = `refs/${userEmail}/${now.getFullYear()}/${(now.getMonth()+1+'').padStart(2,'0')}/${randomUUID()}${ext}`
      const ab = await f.arrayBuffer()
      const { error: upErr } = await supabaseSrv.storage.from('wanted-refs').upload(key, new Uint8Array(ab), {
        contentType: f.type, upsert: false
      })
      if (upErr) {
        return NextResponse.redirect(new URL(`/new?error=${encodeURIComponent('画像アップロードに失敗しました')}`, req.url), 303)
      }
      const { data: pub } = supabaseSrv.storage.from('wanted-refs').getPublicUrl(key)
      uploaded.push(pub.publicUrl)
    }

    const { error } = await supabaseSrv.from('wants').insert([{
      title: body.title,
      description: body.description,
      category: body.category,
      budget_jpy: body.budget_jpy,
      status: 'open',
      created_by: userEmail,
      expires_at,
      image_urls: uploaded.length ? uploaded : null,
      // reference_image_url は互換用に残したい場合のみ設定
      reference_image_url: uploaded[0] ?? null,
    }])

    if (error) {
      return NextResponse.redirect(new URL(`/new?error=${encodeURIComponent('DBエラー：'+error.message)}`, req.url), 303)
    }

    return NextResponse.redirect(new URL('/new?ok=1', req.url), 303)
  }catch(e:any){
    return NextResponse.redirect(new URL(`/new?error=${encodeURIComponent(e?.message ?? '不明なエラー')}`, req.url), 303)
  }
}
