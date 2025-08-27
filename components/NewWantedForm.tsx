'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { categoriesForUI, isValidCategory } from '@/lib/categories'

type Props = { csrfToken?: string }
type UploadItem = {
  id: string
  preview: string
  name: string
  size: number
  type: string
  status: 'uploading' | 'done' | 'error'
  url?: string
  error?: string
}

const MAX_FILES = 5
const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif']
const PRICE_FLOOR = 1000
const NG = ['無料', '無償', 'タダ', 'ギフト券', '先振込のみ', '外部アプリ', '招待リンク']

const DELIVERY = [
  { id: 'parcel', label: 'ゆうパック・宅配便' },
  { id: 'meet', label: '対面' },
  { id: 'either', label: 'どちらでも' },
] as const

const PREFS = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県',
  '岐阜県','静岡県','愛知県','三重県',
  '滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県',
  '鳥取県','島根県','岡山県','広島県','山口県',
  '徳島県','香川県','愛媛県','高知県',
  '福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県',
]
const isValidPref = (v?: string | null) => !!v && PREFS.includes(v)

const DEADLINE = [
  { id: '48', label: '48時間' },
  { id: '72', label: '72時間（既定）' },
  { id: 'none', label: '無制限' },
] as const

// ★ ここで締切値を常に正規化
function normalizeDeadline(v: any): '48' | '72' | 'none' {
  if (v === '48' || v === '72' || v === 'none') return v
  // '48時間' 等のラベルや空文字が来ても既定に寄せる
  return '72'
}

const WantedSchema = z.object({
  title: z.string().trim()
    .min(1, 'タイトルは必須です')
    .max(40, 'タイトルは40文字以内で入力してください')
    .refine(v => !NG.some(w => v.toLowerCase().includes(w.toLowerCase())), 'NGワード（無料/無償/タダ/ギフト券等）は使用できません'),
  description: z.string().trim().max(1000, '説明は1000文字以内で入力してください').optional()
    .refine(v => !v || !NG.some(w => v.toLowerCase().includes(w.toLowerCase())), 'NGワード（無料/無償/タダ/ギフト券等）は使用できません'),
  category: z.string().optional().refine(v => !v || isValidCategory(v), 'カテゴリの指定が不正です'),
  series: z.string().optional(),
  budgetMax: z.coerce.number({ required_error: '上限予算は必須です' })
    .int('整数で入力してください')
    .min(PRICE_FLOOR, `上限予算は¥${PRICE_FLOOR.toLocaleString()}以上で入力してください`),
  deliveryMethod: z.string().refine(v => ['parcel', 'meet', 'either'].includes(v), '受け渡し方法は必須です'),
  receivePref: z.string().min(1, '受け取りエリアは必須です').refine(isValidPref, '都道府県の選択が不正です'),
  // ★ バリデーション側でも既定化を許容
  deadline: z.string().transform(normalizeDeadline),
  imageUrls: z.array(z.string().url()).max(MAX_FILES, `画像は最大${MAX_FILES}枚までです`).optional(),
})
type FieldErrors = Partial<Record<keyof z.infer<typeof WantedSchema>, string>>

export default function NewWantedForm({ csrfToken }: Props) {
  const router = useRouter()
  const CATS = categoriesForUI()

  // ===== CSRF（自己取得） =====
  const [csrf, setCsrf] = useState<string>(csrfToken || '')
  const [csrfErr, setCsrfErr] = useState<string | null>(null)
  async function ensureCsrf() {
    try {
      const r = await fetch('/api/csrf', { cache: 'no-store', credentials: 'same-origin' })
      const j = await r.json()
      if (!r.ok || !j?.csrfToken) throw new Error('CSRF初期化に失敗しました')
      setCsrf(j.csrfToken)
      setCsrfErr(null)
      return j.csrfToken as string
    } catch (e: any) {
      const msg = e?.message || 'CSRF初期化に失敗しました'
      setCsrfErr(msg)
      return ''
    }
  }
  useEffect(() => { if (!csrf) { void ensureCsrf() } }, []) // 初回に確実にクッキー発行

  // ===== 入力値 =====
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [series, setSeries] = useState('')
  const [budgetMax, setBudgetMax] = useState<number | ''>('')
  const [deliveryMethod, setDeliveryMethod] = useState<'' | 'parcel' | 'meet' | 'either'>('')
  const [receivePref, setReceivePref] = useState('')
  const [deadline, setDeadline] = useState<'48' | '72' | 'none'>('72')

  // ===== 画像 =====
  const [images, setImages] = useState<UploadItem[]>([])
  const [pickErr, setPickErr] = useState<string | null>(null)
  const fileIn = useRef<HTMLInputElement | null>(null)

  // ===== 状態 =====
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // ===== フォーカス参照 =====
  const refTitle = useRef<HTMLInputElement>(null)
  const refBudget = useRef<HTMLInputElement>(null)
  const refDelivery = useRef<HTMLInputElement>(null)
  const refPref = useRef<HTMLSelectElement>(null)

  function FieldError({ id, msg }: { id: string; msg?: string }) {
    if (!msg) return null
    return <p id={id} className="mt-1 text-xs text-red-600">{msg}</p>
  }
  function Required() {
    return <span className="ml-1 inline-flex items-center rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">必須</span>
  }

  // ===== アップロード関連 =====
  function pickUrlFromAny(j: any): string | null {
    if (!j) return null
    if (typeof j === 'string' && /^https?:\/\//.test(j)) return j
    if (typeof j?.url === 'string') return j.url
    if (typeof j?.publicUrl === 'string') return j.publicUrl
    if (typeof j?.public_url === 'string') return j.public_url
    if (Array.isArray(j?.urls) && j.urls[0]) return j.urls[0]
    if (Array.isArray(j?.data)) {
      const c = j.data.find((x: any) => x?.url || x?.publicUrl || x?.public_url)
      if (c) return c.url || c.publicUrl || c.public_url
    }
    if (j?.data?.url) return j.data.url
    return null
  }

  async function uploadSingle(file: File): Promise<string> {
    const token = csrf || await ensureCsrf()
    if (!token) throw new Error('CSRF初期化に失敗しました')

    const fd = new FormData()
    fd.append('file', file, file.name)
    fd.append('csrfToken', token)

    const res = await fetch('/api/wanted/upload', {
      method: 'POST',
      body: fd,
      credentials: 'same-origin',
      cache: 'no-store',
    })
    const text = await res.text()
    let j: any = null
    try { j = JSON.parse(text) } catch {}

    if (!res.ok) {
      const msg = j?.error || j?.message || `アップロード失敗（${res.status}）`
      throw new Error(msg)
    }
    const url = pickUrlFromAny(j)
    if (!url) throw new Error('アップロードに失敗しました（URLを取得できませんでした）')
    return url
  }

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPickErr(null)
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    const remain = MAX_FILES - images.length
    if (files.length > remain) setPickErr(`画像は最大${MAX_FILES}枚までです（残り${remain}枚）`)
    const slice = files.slice(0, remain)

    try {
      for (const f of slice) {
        if (!ACCEPT.includes(f.type)) throw new Error('画像は JPEG/PNG/WebP/AVIF/HEIC のみ対応です')
        if (f.size > MAX_FILE_BYTES) throw new Error('画像サイズは最大5MBまでです')
      }
    } catch (err: any) {
      setPickErr(err?.message || 'ファイル検証に失敗しました')
      return
    }

    const locals: UploadItem[] = slice.map((f, idx) => ({
      id: `${Date.now()}_${idx}`,
      preview: URL.createObjectURL(f),
      name: f.name,
      size: f.size,
      type: f.type,
      status: 'uploading',
    }))
    setImages(prev => [...prev, ...locals])

    for (let i = 0; i < slice.length; i++) {
      const file = slice[i]
      const localId = locals[i].id
      try {
        const url = await uploadSingle(file)
        setImages(prev => prev.map(it => it.id === localId ? { ...it, url, status: 'done' } : it))
      } catch (err: any) {
        setImages(prev => prev.map(it => it.id === localId ? { ...it, status: 'error', error: err?.message || '失敗' } : it))
        setPickErr(err?.message || 'アップロードに失敗しました')
      }
    }

    if (fileIn.current) fileIn.current.value = ''
  }

  const removeImage = async (idx: number) => {
    const tgt = images[idx]
    setImages(prev => prev.filter((_, i) => i !== idx))
    try { if (tgt?.preview) URL.revokeObjectURL(tgt.preview) } catch {}
    if (tgt?.url) fetch(`/api/wanted/upload?url=${encodeURIComponent(tgt.url)}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => {})
  }

  const uploading = images.some(i => i.status === 'uploading')
  const imageUrls = useMemo(() => images.filter(i => i.status === 'done' && i.url).map(i => i.url!), [images])

  // ===== バリデーション・送信 =====
  function validate(): FieldErrors {
    const payload = {
      title,
      description: description || undefined,
      category: category || undefined,
      series: series || undefined,
      budgetMax: budgetMax === '' ? NaN : Number(budgetMax),
      deliveryMethod,
      receivePref,
      // ★ 常に正規化した値で検証
      deadline: normalizeDeadline(deadline),
      imageUrls,
    }
    const out = WantedSchema.safeParse(payload)
    if (out.success) return {}
    const fe: FieldErrors = {}
    for (const issue of out.error.issues) {
      fe[issue.path[0] as keyof FieldErrors] = issue.message
    }
    return fe
  }

  function focusFirst(fe: FieldErrors) {
    if (fe.title) { refTitle.current?.focus(); return }
    if (fe.budgetMax) { refBudget.current?.focus(); return }
    if (fe.deliveryMethod) { refDelivery.current?.focus(); return }
    if (fe.receivePref) { refPref.current?.focus(); return }
  }

  function mapServer(message: string): FieldErrors {
    const fe: FieldErrors = {}
    if (/タイトル/.test(message)) fe.title = message
    if (/予算|上限|budget/i.test(message)) fe.budgetMax = message
    if (/カテゴリ/.test(message)) fe.category = message
    if (/受け渡し|配送方法|delivery/i.test(message)) fe.deliveryMethod = '受け渡し方法は必須です'
    if (/受け取り|都道府県|pref/i.test(message)) fe.receivePref = '受け取りエリアは必須です'
    if (/期限|deadline/i.test(message)) fe.deadline = '募集期限の選択が不正です'
    if (/NGワード|無料|無償|タダ|ギフト券/.test(message)) {
      fe.title = fe.title || message
      fe.description = fe.description || message
    }
    return fe
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const fe = validate()
    setErrors(fe)
    if (Object.keys(fe).length > 0) { focusFirst(fe); return }
    if (uploading) { setFormError('画像のアップロード完了をお待ちください'); return }

    const token = csrf || await ensureCsrf()
    if (!token) { setFormError('CSRF初期化に失敗しました'); return }

    const deadlineNorm = normalizeDeadline(deadline)

    try {
      setPending(true)
      const fd = new FormData()
      fd.set('csrfToken', token)
      fd.set('title', title.trim())
      if (description) fd.set('description', description.trim())
      if (category) fd.set('category', category)
      if (series) fd.set('series', series)
      fd.set('budget_max', String(budgetMax))
      fd.set('delivery_method', deliveryMethod)
      fd.set('receive_pref', receivePref)
      // ★ 送信も正規化した値
      fd.set('deadline_choice', deadlineNorm)
      fd.set('deadline_hours', deadlineNorm === 'none' ? '' : (deadlineNorm === '48' ? '48' : '72'))

      for (const u of imageUrls) {
        fd.append('image_urls[]', u)
        fd.append('image_urls', u)
      }
      fd.set('image_urls_json', JSON.stringify(imageUrls))
      if (imageUrls[0]) fd.set('primary_image_url', imageUrls[0])

      const res = await fetch('/api/wanted', { method: 'POST', body: fd, credentials: 'same-origin' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || j.ok === false) {
        const msg: string = j.error || j.message || '入力内容をご確認ください'
        const mapped = mapServer(msg)
        if (Object.keys(mapped).length > 0) { setErrors(mapped); focusFirst(mapped) } else { setFormError(msg) }
        return
      }

      try {
        sessionStorage.setItem('lastPostedWanted', JSON.stringify({
          id: j.id,
          title, description: description || null,
          category: category || null, series: series || null,
          budgetUpper: typeof budgetMax === 'number' ? budgetMax : null,
          deliveryMethod, receivePref, deadline: deadlineNorm,
          imageUrls, createdAt: Date.now(),
        }))
      } catch {}

      router.push(`/wanted/complete?id=${encodeURIComponent(j.id)}`)
    } finally {
      setPending(false)
    }
  }

  // ===== UI（既存のまま） =====
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6 rounded-xl border bg-white p-4">
      <div aria-live="polite" className="sr-only">{formError || ''}</div>
      {(formError || csrfErr) && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError || csrfErr}
        </div>
      )}

      {/* タイトル */}
      <section>
        <label htmlFor="w-title" className="mb-2 block text-sm font-medium">タイトル<Required /></label>
        <input
          id="w-title" ref={refTitle} type="text" value={title}
          onChange={e => setTitle(e.currentTarget.value)}
          onBlur={() => setTitle(v => v.trim())}
          maxLength={40} autoComplete="off" inputMode="text"
          aria-invalid={!!errors.title} aria-describedby={errors.title ? 'w-title-err' : 'w-title-help'}
          className={`w-full rounded-2xl border px-4 py-3 ${errors.title
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-500'}`}
          placeholder="例）ポケカ 151 未開封 1BOX"
        />
        {!errors.title && <p id="w-title-help" className="mt-1 text-xs text-gray-500">作品/型番/版/数量が入ると見つかりやすいです。</p>}
        <FieldError id="w-title-err" msg={errors.title} />
      </section>

      {/* 説明 */}
      <section>
        <label htmlFor="w-desc" className="mb-2 block text-sm font-medium">説明（任意）</label>
        <textarea
          id="w-desc" rows={6} value={description} onChange={e => setDescription(e.currentTarget.value)}
          maxLength={1000} autoComplete="off"
          aria-invalid={!!errors.description} aria-describedby={errors.description ? 'w-desc-err' : 'w-desc-help'}
          className={`w-full rounded-2xl border px-4 py-3 ${errors.description
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-500'}`}
          placeholder="希望状態、版/弾、付属品、代替可否、希望時期など（URL直貼りは控えてください）"
        />
        {!errors.description && <p id="w-desc-help" className="mt-1 text-xs text-gray-500">具体的だとオファーが来やすくなります。</p>}
        <FieldError id="w-desc-err" msg={errors.description} />
      </section>

      {/* カテゴリ・シリーズ */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="w-category" className="block text-sm font-medium">カテゴリ</label>
          <select
            id="w-category" value={category} onChange={e => setCategory(e.currentTarget.value)}
            aria-invalid={!!errors.category} aria-describedby={errors.category ? 'w-category-err' : undefined}
            className={`mt-1 w-full rounded-2xl border px-4 py-3 ${errors.category
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-500'}`}
          >
            <option value="">未選択</option>
            {CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <FieldError id="w-category-err" msg={errors.category} />
        </div>
        <div>
          <label htmlFor="w-series" className="block text-sm font-medium">シリーズ</label>
          <input
            id="w-series" value={series} onChange={e => setSeries(e.currentTarget.value)}
            className="mt-1 w-full rounded-2xl border px-4 py-3 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
            placeholder="作品/弾/イベント名など"
          />
        </div>
      </section>

      {/* 上限予算 */}
      <section>
        <label htmlFor="w-budget" className="mb-2 block text-sm font-medium">上限予算（円）<Required /></label>
        <input
          id="w-budget" ref={refBudget} inputMode="numeric" pattern="\d*" type="number" min={PRICE_FLOOR} step={100}
          value={budgetMax} onChange={e => setBudgetMax(e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))}
          aria-invalid={!!errors.budgetMax} aria-describedby={errors.budgetMax ? 'w-budget-err' : 'w-budget-help'}
          className={`w-full rounded-2xl border px-4 py-3 ${errors.budgetMax
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-500'}`}
          placeholder={`${PRICE_FLOOR}`}
        />
        {!errors.budgetMax && <p id="w-budget-help" className="mt-1 text-xs text-gray-500">上限だけでOK。カード表示は「〜¥{(typeof budgetMax==='number'?budgetMax:PRICE_FLOOR).toLocaleString()}」。</p>}
        <FieldError id="w-budget-err" msg={errors.budgetMax} />
      </section>

      {/* 受け渡し & 受け取りエリア */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium">受け渡し方法<Required /></p>
          <div className={`rounded-2xl border px-4 py-3 ${errors.deliveryMethod ? 'border-red-500' : 'border-gray-300'}`}>
            <div className="space-y-2">
              {DELIVERY.map((d, idx) => (
                <label key={d.id} className="flex items-center gap-2">
                  <input
                    ref={idx === 0 ? refDelivery : undefined}
                    type="radio" name="delivery" value={d.id}
                    checked={deliveryMethod === d.id} onChange={() => setDeliveryMethod(d.id)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span className="text-sm">{d.label}</span>
                </label>
              ))}
            </div>
          </div>
          <FieldError id="w-delivery-err" msg={errors.deliveryMethod} />
          <p className="mt-1 text-xs text-gray-500">匿名性重視なら局留め/営業所受取も検討。追跡番号共有を推奨。</p>
        </div>

        <div>
          <label htmlFor="w-pref" className="block text-sm font-medium">受け取りエリア（都道府県）<Required /></label>
          <select
            id="w-pref" ref={refPref} value={receivePref} onChange={e => setReceivePref(e.currentTarget.value)}
            aria-invalid={!!errors.receivePref} aria-describedby={errors.receivePref ? 'w-pref-err' : undefined}
            className={`mt-1 w-full rounded-2xl border px-4 py-3 ${errors.receivePref
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-500'}`}
          >
            <option value="">未選択</option>
            {PREFS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <FieldError id="w-pref-err" msg={errors.receivePref} />
        </div>
      </section>

      {/* 募集期限 */}
      <section>
        <label className="mb-2 block text-sm font-medium">募集期限</label>
        <div className="grid grid-cols-3 gap-2">
          {DEADLINE.map(d => (
            <label key={d.id} className={`flex items-center justify-center rounded-2xl border px-3 py-2 text-sm ${
              deadline === d.id ? 'border-emerald-600 text-emerald-700' : 'border-gray-300 text-gray-700'
            }`}>
              <input type="radio" name="deadline" value={d.id} checked={deadline === d.id}
                onChange={() => setDeadline(d.id as any)} className="sr-only" />
              {d.label}
            </label>
          ))}
        </div>
        <FieldError id="w-deadline-err" msg={errors.deadline} />
      </section>

      {/* 参考画像 */}
      <section>
        <p className="text-sm font-medium">参考画像（任意・最大{MAX_FILES}枚）</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {images.map((img, i) => (
            <div key={img.id} className="relative">
              <img src={img.preview || img.url} alt={img.name} className="h-24 w-24 rounded-xl border object-cover" />
              <div className="absolute bottom-1 left-1 rounded bg-white/80 px-1 text-[10px]">
                {img.status === 'uploading' ? 'アップロード中' : img.status === 'done' ? '完了' : '失敗'}
              </div>
              <button type="button" onClick={() => removeImage(i)} aria-label="画像を削除"
                className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-emerald-600 text-xs text-white">×</button>
              {img.error && <div className="absolute inset-x-0 -bottom-5 text-center text-[10px] text-red-600">{img.error}</div>}
            </div>
          ))}
          {images.length < MAX_FILES && (
            <button type="button" onClick={() => fileIn.current?.click()}
              className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed text-sm">＋ 追加</button>
          )}
          <input ref={fileIn} type="file" accept={ACCEPT.join(',')} multiple onChange={onPick} className="hidden" />
        </div>
        {pickErr && <p className="mt-1 text-xs text-red-600">{pickErr}</p>}
        <p className="mt-1 text-xs text-gray-500">対応: JPEG/PNG/WebP/AVIF/HEIC、各5MBまで。※他サイト画像の直リンクは不可。</p>
      </section>

      <div className="pt-2">
        <button type="submit" disabled={pending || uploading}
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-white hover:bg-emerald-700 disabled:opacity-50">
          {pending ? '投稿中…' : '投稿する'}
        </button>
      </div>
    </form>
  )
}
