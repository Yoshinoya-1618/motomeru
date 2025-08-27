// app/api/wanted/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth' // プロジェクトに合わせて
import { getToken } from 'next-auth/jwt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const PRICE_FLOOR = Number(process.env.PRICE_FLOOR ?? 500)
const DEV = process.env.NODE_ENV !== 'production'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

/* ---------- helpers ---------- */
function getCookieFromHeader(req: NextRequest, name: string): string | null {
  const raw = req.headers.get('cookie') || ''
  if (!raw) return null
  for (const part of raw.split(/; */)) {
    const [k, ...rest] = part.split('=')
    if (decodeURIComponent(k.trim()) === name) return decodeURIComponent(rest.join('=').trim())
  }
  return null
}
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

type Choice = '48' | '72' | 'none'
function parseDeadlineChoice(input: any): Choice | null {
  const raw = String(input ?? '').trim().toLowerCase()
  if (!raw) return '72'
  if (raw === 'none' || raw === 'no' || raw === '無期限') return 'none'
  if (['48','48h','2d','2days','2日'].includes(raw)) return '48'
  if (['72','72h','3d','3days','3日'].includes(raw)) return '72'
  return null
}
function choiceToDeadlineAt(choice: Choice): string | null {
  if (choice === 'none') return null
  const hours = choice === '48' ? 48 : 72
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

/** 受け渡し方法のゆるいマッピング */
function mapDelivery(input?: any): 'delivery'|'meetup'|'either'|undefined {
  if (input == null) return undefined
  const raw = String(input).trim().toLowerCase()
  const delivery = new Set(['delivery','parcel','post','postal','mail','shipping','ship','courier','yamato','yupack','ゆうぱっく','郵送','配送','発送'])
  const meetup   = new Set(['meetup','meet','hand','hand_to_hand','in_person','face','pickup','現地','手渡し','対面','受け取り','引き取り'])
  const either   = new Set(['either','both','どちらでも','any'])
  if (delivery.has(raw)) return 'delivery'
  if (meetup.has(raw)) return 'meetup'
  if (either.has(raw)) return 'either'
  if (raw === '1') return 'delivery'
  if (raw === '2') return 'meetup'
  if (raw === '0' || raw === '3') return 'either'
  return undefined
}

/** JSONボディから受け取りエリア候補を拾う */
function pickReceivePrefFromJson(body: any): string | null {
  const keys = ['receive_pref','receivePref','prefecture','pref','receive_area','receiveArea','area','region','location','locationText','areaText','prefName','pref_code','prefCode']
  for (const k of keys) {
    const v = body?.[k]
    if (v == null) continue
    if (Array.isArray(v)) {
      const first = v.find(Boolean)
      if (first != null) return (''+first).trim() || null
      continue
    }
    if (typeof v === 'object') {
      // { label, value } のような候補を拾う
      const cand = (v as any).label ?? (v as any).value ?? JSON.stringify(v)
      return (''+cand).trim() || null
    }
    return (''+v).trim() || null
  }
  return null
}

/** FormDataから受け取りエリア候補を拾う */
function pickReceivePrefFromForm(fd: FormData): string | null {
  const keys = ['receive_pref','receivePref','prefecture','pref','receive_area','receiveArea','area','region','location','locationText','areaText','prefName','pref_code','prefCode']
  for (const k of keys) {
    const vs = fd.getAll(k)
    if (!vs || vs.length === 0) continue
    const first = vs.find(Boolean)
    if (first == null) continue
    return (''+first).trim() || null
  }
  return null
}

function hasNgWord(s?: string | null) {
  if (!s) return false
  const low = s.toLowerCase()
  return NG.some(w => low.includes(w.toLowerCase()))
}

function normalizeRow(row: any) {
  const imgSrc =
    row?.image_urls ?? row?.imageUrls ?? row?.images ??
    (row?.primary_image_url ? [row.primary_image_url] : [])
  const deadline_at = row.deadline_at ?? null
  const expired = !!(deadline_at && new Date(deadline_at).getTime() <= Date.now())
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    category: row.category ?? null,
    series: row.series ?? null,
    receive_method: row.receive_method ?? null,
    receive_pref: row.receive_pref ?? null,
    deadline_at,
    deadline_choice: row.deadline_choice ?? null,
    expired,
    budget_upper: typeof row.budget_upper === 'number'
      ? row.budget_upper
      : (typeof row.budgetUpper === 'number' ? row.budgetUpper : null),
    image_urls: normalizeUrlList(imgSrc),
    created_at: row.created_at,
  }
}

/** CSRF（Cookieがあれば検証。multipartは一度だけ読む） */
async function verifyCsrfAndMaybeForm(req: NextRequest, mode: 'json'|'form'):
  Promise<{ ok: boolean; fd?: FormData }>
{
  const cookieCsrf = getCookieFromHeader(req, 'csrfToken')
  if (!cookieCsrf) return { ok: true } // 開発等は寛容

  if (mode === 'json') {
    const supplied = (req.headers.get('x-csrf-token') || '').toString()
    return { ok: !!supplied && supplied === cookieCsrf }
  } else {
    const fd = await req.formData().catch(() => new FormData())
    const supplied =
      (fd.get('csrfToken') || fd.get('csrf_token') || fd.get('csrf') || '').toString()
    return { ok: !!supplied && supplied === cookieCsrf, fd }
  }
}

/* ---- Zod ---- */
const PostSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  series: z.string().optional(),
  budget_upper: z.coerce.number().int().min(PRICE_FLOOR),
  receive_method: z.enum(['delivery','meetup','either']).optional(),
  receive_pref: z.string().optional(),
  deadline_choice: z.enum(['48','72','none']).optional(),
  image_urls: z.array(z.string().url()).max(10).default([]),
})

/* ------------------ GET ------------------ */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const q = searchParams.get('q') || ''
  const category = searchParams.get('category') || ''
  const series = searchParams.get('series') || ''
  const sort = (searchParams.get('sort') || 'new') as 'new'|'recommended'
  const limit = Math.min(Number(searchParams.get('limit') || 30), 50)
  const show = (searchParams.get('show') || 'active') as 'active'|'all'|'expired'
  const nowIso = new Date().toISOString()

  try {
    if (id) {
      const { data, error } = await supabase.from('wanted').select('*').eq('id', id).single()
      if (error) return NextResponse.json({ error: error.message }, { status: 404 })
      return NextResponse.json({ item: normalizeRow(data) })
    }

    let qy = supabase.from('wanted').select('*').limit(limit)

    // 期限切れは自動で下げる（active）
    if (show === 'active') {
      qy = qy.or(`deadline_at.is.null,deadline_at.gt.${nowIso}`)
    } else if (show === 'expired') {
      qy = qy.not('deadline_at', 'is', null).lte('deadline_at', nowIso)
    }

    if (q) qy = qy.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    if (category) qy = qy.eq('category', category)
    if (series) qy = qy.eq('series', series)
    if (sort === 'new') qy = qy.order('created_at', { ascending: false })
    else qy = qy.order('created_at', { ascending: false })

    const { data, error } = await qy
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ items: (data || []).map(normalizeRow) })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

/* ------------------ POST ------------------ */
export async function POST(req: NextRequest) {
  try {
    // 認証: token.sub を最優先
    const session = await getServerSession(authOptions)
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    const userId =
      (token && (token as any).sub) ||
      ((session as any)?.user?.id) ||
      ((session as any)?.user?.email) ||
      null
    if (!userId) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })

    const ct = (req.headers.get('content-type') || '').toLowerCase()

    // ---- 入力（JSON / multipart 両対応）----
    let title = ''
    let description: string | null = null
    let category: string | null = null
    let series: string | null = null
    let budget_upper = 0
    let receive_method: 'delivery' | 'meetup' | 'either' | undefined
    let receive_pref: string | null = null
    let deadline_choice: Choice = '72'
    let deadline_at: string | null = null
    let image_urls: string[] = []
    let debugKeys: string[] = []

    if (ct.includes('application/json')) {
      const { ok: csrfOk } = await verifyCsrfAndMaybeForm(req, 'json')
      if (!csrfOk) return NextResponse.json({ error: 'CSRF token mismatch' }, { status: 403 })

      const body: any = await req.json().catch(() => ({}))
      title = String(body.title || '').trim()
      description = body.description ? String(body.description).trim() : null
      category = body.category ? String(body.category).trim() : null
      series = body.series ? String(body.series).trim() : null

      const budgetRaw =
        body.budget_upper ?? body.budgetUpper ?? body.budget_max ?? body.budgetMax ?? body.budget ?? ''
      budget_upper = Number(String(budgetRaw).replace(/[^\d]/g, ''))

      receive_method = mapDelivery(body.receive_method ?? body.delivery_method ?? body.deliveryMethod ?? body.delivery ?? body.method)
      receive_pref = pickReceivePrefFromJson(body)
      debugKeys = Object.keys(body || {})

      const parsedChoice = parseDeadlineChoice(body.deadline_choice ?? body.deadline)
      if (parsedChoice === null) {
        return NextResponse.json({ error: '募集期限の選択が不正です（48/72/none から選択）' }, { status: 400 })
      }
      deadline_choice = parsedChoice
      deadline_at = choiceToDeadlineAt(deadline_choice)

      const imgRaw =
        body.image_urls ?? body.imageUrls ?? body.images ??
        (body.primary_image_url ? [body.primary_image_url] : [])
      image_urls = normalizeUrlList(imgRaw)

    } else if (ct.includes('multipart/form-data')) {
      const { ok: csrfOk, fd } = await verifyCsrfAndMaybeForm(req, 'form')
      if (!csrfOk) return NextResponse.json({ error: 'CSRF token mismatch' }, { status: 403 })
      const form = fd ?? new FormData()

      const keys: string[] = []
      ;(form as any).forEach?.((_v: any, k: string) => keys.push(k))
      debugKeys = keys

      title = (form.get('title') || '').toString().trim()
      description = ((form.get('description') || '').toString().trim()) || null
      category = ((form.get('category') || '').toString().trim()) || null
      series = ((form.get('series') || '').toString().trim()) || null

      const budgetRaw =
        form.get('budget_upper') || form.get('budgetUpper') || form.get('budget_max') ||
        form.get('budgetMax') || form.get('budget') || ''
      budget_upper = Number(String(budgetRaw || '').replace(/[^\d]/g, ''))

      receive_method = mapDelivery(
        form.get('receive_method')?.toString() ||
        form.get('delivery_method')?.toString() ||
        form.get('deliveryMethod')?.toString() ||
        form.get('delivery')?.toString() ||
        form.get('method')?.toString() || ''
      )
      receive_pref = pickReceivePrefFromForm(form)

      const dcRaw = (form.get('deadline_choice') || form.get('deadline') || '72').toString().trim()
      const parsedChoice = parseDeadlineChoice(dcRaw)
      if (parsedChoice === null) {
        return NextResponse.json({ error: '募集期限の選択が不正です（48/72/none から選択）' }, { status: 400 })
      }
      deadline_choice = parsedChoice
      deadline_at = choiceToDeadlineAt(deadline_choice)

      const allImgs: any[] = []
      ;['image_urls[]','image_urls','imageUrls[]','imageUrls','images'].forEach(k => {
        const v = form.getAll(k)
        if (v && v.length) allImgs.push(...v)
      })
      const extras = [
        form.get('image_urls_json'),
        form.get('imageUrlsJson'),
        form.get('primary_image_url'),
      ].filter(Boolean)
      if (extras.length) allImgs.push(...extras)
      image_urls = normalizeUrlList(allImgs.length === 1 ? allImgs[0] : allImgs)

    } else {
      return NextResponse.json({ error: 'Use application/json or multipart/form-data' }, { status: 415 })
    }

    // ---- 受け取りエリアの必須ロジック & 補完 ----
    const rm = receive_method || 'either'
    if ((rm === 'meetup' || rm === 'either') && !(receive_pref && receive_pref.trim())) {
      return NextResponse.json(
        {
          error: '受け取りエリアは必須です（現地受け取り/どちらでも の場合）',
          ...(DEV ? { debug: { receive_method: receive_method ?? null, inferred: rm, seen_keys: debugKeys } } : {})
        },
        { status: 400 }
      )
    }
    if (rm === 'delivery' && !(receive_pref && receive_pref.trim())) {
      receive_pref = '全国'
    }
    if (receive_pref && receive_pref.length > 100) {
      receive_pref = receive_pref.slice(0, 100)
    }

    // ---- 事前バリデ ----
    if (hasNgWord(title) || hasNgWord(description || undefined)) {
      return NextResponse.json({ error: 'NGワード（無料/無償/タダ/ギフト券等）は使用できません' }, { status: 400 })
    }
    if (!title) return NextResponse.json({ error: 'タイトルは必須です' }, { status: 400 })
    if (!Number.isFinite(budget_upper) || budget_upper < PRICE_FLOOR) {
      return NextResponse.json({ error: `上限予算は¥${PRICE_FLOOR.toLocaleString()}以上で入力してください` }, { status: 400 })
    }

    const parsed = PostSchema.safeParse({
      title,
      description: description || undefined,
      category: category || undefined,
      series: series || undefined,
      budget_upper,
      receive_method: rm,
      receive_pref: receive_pref || undefined,
      deadline_choice,
      image_urls,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'validation error' }, { status: 400 })
    }

    // ---- 挿入（フォールバック付き）----
    const base = {
      user_id: userId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      category: parsed.data.category ?? null,
      series: parsed.data.series ?? null,
      receive_method: parsed.data.receive_method ?? null,
      receive_pref: receive_pref!, // NOT NULL対応
      budget_upper: parsed.data.budget_upper,
      image_urls: parsed.data.image_urls,
    } as any

    // ① 文字列 '48'|'72'|'none' + deadline_at
    let payload: any = { ...base, deadline_choice, deadline_at }
    let { data, error } = await supabase.from('wanted').insert(payload).select('*').single()

    // ② deadline_at 列が無い → 外して再試行
    if (error) {
      const msg = String((error as any)?.message || '')
      if (/deadline_at.*does not exist/i.test(msg)) {
        const { deadline_at: _omit, ...noDeadlineAt } = payload
        payload = noDeadlineAt
        const retry = await supabase.from('wanted').insert(payload).select('*').single()
        data = retry.data as any
        error = retry.error as any
      }
    }
    // ③ deadline_choice 型/制約 → 数値orNULLで再試行 → さらに列抜き
    if (error) {
      const asNumber = deadline_choice === 'none' ? null : (deadline_choice === '48' ? 48 : 72)
      const numericPayload = { ...base, deadline_choice: asNumber, ...(payload.deadline_at ? { deadline_at: payload.deadline_at } : {}) }
      let retry = await supabase.from('wanted').insert(numericPayload).select('*').single()
      if (retry.error) {
        const { deadline_choice: _omit, ...withoutChoice } = numericPayload
        retry = await supabase.from('wanted').insert(withoutChoice).select('*').single()
      }
      data = retry.data as any
      error = retry.error as any
    }

    if (error) {
      const msg = String((error as any)?.message || '')
      if (/invalid input syntax for type uuid/i.test(msg)) {
        return NextResponse.json({ error: 'ユーザーIDの形式が不正です。ログインし直してください。' }, { status: 400 })
      }
      if (/receive_pref/i.test(msg)) {
        return NextResponse.json({ error: '受け取りエリアは必須です。入力してください。' }, { status: 400 })
      }
      if (/deadline_choice/i.test(msg)) {
        return NextResponse.json({ error: '募集期限の選択が不正です。画面を再読み込みして再投稿してください。' }, { status: 400 })
      }
      return NextResponse.json({ error: msg || 'DB insert error' }, { status: 500 })
    }

    try { revalidateTag('wanted') } catch {}

    return NextResponse.json({ ok: true, id: (data as any).id, item: normalizeRow(data) }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
