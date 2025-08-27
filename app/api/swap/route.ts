// app/api/swap/route.ts
import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// ---- utils ----
function isUrlString(x: any): x is string { return typeof x === 'string' && /^https?:\/\//i.test(x) }
function parsePgTextArray(str: string): string[] {
  const s = String(str).trim()
  if (!(s.startsWith('{') && s.endsWith('}'))) return []
  const inner = s.slice(1, -1)
  return inner.split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1')).filter(Boolean)
}
function uniq(a: string[]) { const s = new Set<string>(); return a.filter(u => !s.has(u) && s.add(u)) }
function normalizeUrlList(raw: any): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return uniq(raw.map(v => {
      if (isUrlString(v)) return v
      if (v && typeof v === 'object') return v.url || v.publicUrl || v.public_url || ''
      return ''
    }).filter(isUrlString)).slice(0, 10)
  }
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try { return normalizeUrlList(JSON.parse(raw)) } catch {}
  }
  if (typeof raw === 'string' && raw.includes('{') && raw.includes('}')) {
    return normalizeUrlList(parsePgTextArray(raw))
  }
  if (isUrlString(raw)) return [raw]
  return []
}

const NG = ['無料', '無償', 'タダ', 'ギフト券', '先振込のみ', '外部アプリ', '招待リンク']
// 交換は金銭NG（ゆるめの検出）
const MONEY_RE = /(¥|円|JPY|現金|送金|振込|PayPay|LINE\s*Pay|paypal|小切手|ギフト券)/i

const PostSchema = z.object({
  give: z.string().min(1, '【譲】は必須です').max(200),
  want: z.string().min(1, '【求】は必須です').max(200),
  conditions: z.string().optional(),
  category: z.string().optional(),
  series: z.string().optional(),
  image_urls: z.array(z.string().url()).max(10).default([]),
})

function hasNgWord(s?: string | null) {
  if (!s) return false
  const low = s.toLowerCase()
  return NG.some(w => low.includes(w.toLowerCase()))
}
function hasMoney(s?: string | null) {
  if (!s) return false
  return MONEY_RE.test(s)
}

function normalizeRow(row: any) {
  const imgSrc =
    row?.image_urls ?? row?.imageUrls ?? row?.images ??
    (row?.primary_image_url ? [row.primary_image_url] : [])
  return {
    id: row.id,
    category: row.category ?? null,
    series: row.series ?? null,
    give: row.give,
    want: row.want,
    conditions: row.conditions ?? null,
    image_urls: normalizeUrlList(imgSrc),
    created_at: row.created_at,
  }
}

// ---- GET ----
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const q = searchParams.get('q') || ''
  const category = searchParams.get('category') || ''
  const series = searchParams.get('series') || ''
  const sort = (searchParams.get('sort') || 'new') as 'new'|'recommended'
  const limit = Math.min(Number(searchParams.get('limit') || 30), 50)

  try {
    if (id) {
      const { data, error } = await supabase.from('swaps').select('*').eq('id', id).single()
      if (error) return NextResponse.json({ error: error.message }, { status: 404 })
      const item = normalizeRow(data)
      return NextResponse.json({ item })
    }

    let qy = supabase.from('swaps').select('*').limit(limit)
    if (q) qy = qy.or(`give.ilike.%${q}%,want.ilike.%${q}%,conditions.ilike.%${q}%`)
    if (category) qy = qy.eq('category', category)
    if (series) qy = qy.eq('series', series)
    if (sort === 'new') qy = qy.order('created_at', { ascending: false })
    else qy = qy.order('created_at', { ascending: false })

    const { data, error } = await qy
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const items = (data || []).map(normalizeRow)
    return NextResponse.json({ items })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

// ---- POST ----
export async function POST(req: Request) {
  // CSRF
  const ck = await cookies()
  const tokenCookie = ck.get('csrfToken')?.value || ''
  const fd = await req.formData().catch(() => new FormData())
  const tokenForm = (fd.get('csrfToken') || fd.get('csrf_token') || fd.get('csrf') || '').toString()
  if (!tokenCookie || !tokenForm || tokenCookie !== tokenForm) {
    return NextResponse.json({ error: 'CSRF token mismatch' }, { status: 403 })
  }

  // user_id (仮: ヘッダから or anonymous)
  const h = await headers()
  const userFromHeader = h.get('x-user-id') || h.get('x-user-email')
  const user_id = String(userFromHeader || 'anonymous')

  // 吸収
  const give = (fd.get('give') || '').toString().trim()
  const want = (fd.get('want') || '').toString().trim()
  const conditions = (fd.get('conditions') || '').toString().trim()
  const category = (fd.get('category') || '').toString().trim() || null
  const series = (fd.get('series') || '').toString().trim() || null

  // 画像寄せ集め→配列化
  const allImgs: any[] = []
  ;['image_urls[]','image_urls','imageUrls[]','imageUrls','images'].forEach(k => {
    const v = fd.getAll(k)
    if (v && v.length) allImgs.push(...v)
  })
  const extras = [
    fd.get('image_urls_json'),
    fd.get('imageUrlsJson'),
    fd.get('primary_image_url'),
  ].filter(Boolean)
  if (extras.length) allImgs.push(...extras)
  const image_urls = normalizeUrlList(allImgs.length === 1 ? allImgs[0] : allImgs)

  // バリデーション（メッセージはフロントで拾いやすく）
  if (!give) return NextResponse.json({ error: '【譲】は必須です' }, { status: 400 })
  if (!want) return NextResponse.json({ error: '【求】は必須です' }, { status: 400 })
  if (hasNgWord(give) || hasNgWord(want) || hasNgWord(conditions)) {
    return NextResponse.json({ error: 'NGワード（無料/無償/タダ/ギフト券等）は使用できません' }, { status: 400 })
  }
  if (hasMoney(give) || hasMoney(want) || hasMoney(conditions)) {
    return NextResponse.json({ error: '交換は金銭NGです（¥/円/PayPay/振込 等の記載は不可）' }, { status: 400 })
  }

  const parsed = PostSchema.safeParse({
    give, want,
    conditions: conditions || undefined,
    category: category || undefined,
    series: series || undefined,
    image_urls,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'validation error' }, { status: 400 })
  }

  const payload = {
    user_id,
    category: parsed.data.category ?? null,
    series: parsed.data.series ?? null,
    give: parsed.data.give,
    want: parsed.data.want,
    conditions: parsed.data.conditions ?? null,
    image_urls: parsed.data.image_urls,
  }

  const { data, error } = await supabase.from('swaps').insert(payload).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try { revalidateTag('swap') } catch {}

  return NextResponse.json({ ok: true, id: data.id, item: normalizeRow(data) }, { status: 201 })
}
