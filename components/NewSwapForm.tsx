'use client'

import { useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { categoriesForUI, isValidCategory } from '@/lib/categories'

type Defaults = {
  category?: string | null
  series?: string | null
  give?: string
  want?: string
  conditions?: string
  deliveryMethod?: 'parcel' | 'meet' | 'either' | ''
  shipFromPref?: string | null
}

const NG = ['無料', '無償', 'タダ']
const MAX_FILES = 5
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif']
const MAX_FILE_BYTES = 5 * 1024 * 1024

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

const SwapSchema = z.object({
  give: z.string().trim().min(1, '【譲】は必須です')
    .refine(v => !NG.some(w => v.toLowerCase().includes(w.toLowerCase())), 'NGワード（無料/無償/タダ）は使用できません'),
  want: z.string().trim().min(1, '【求】は必須です')
    .refine(v => !NG.some(w => v.toLowerCase().includes(w.toLowerCase())), 'NGワード（無料/無償/タダ）は使用できません'),
  conditions: z.string().optional()
    .refine(v => !v || !NG.some(w => v.toLowerCase().includes(w.toLowerCase())), 'NGワード（無料/無償/タダ）は使用できません'),
  category: z.string().optional().refine(v => !v || isValidCategory(v), 'カテゴリの指定が不正です'),
  series: z.string().optional(),
  deliveryMethod: z.string().refine(v => ['parcel','meet','either'].includes(v), '受け渡し方法は必須です'),
  shipFromPref: z.string().min(1, '配送元エリアは必須です').refine(isValidPref, '都道府県の選択が不正です'),
  imageUrls: z.array(z.string().url()).max(MAX_FILES, `画像は最大${MAX_FILES}枚までです`).optional(),
})
type FieldErrors = Partial<Record<keyof z.infer<typeof SwapSchema>, string>>

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

export default function NewSwapForm({ csrfToken, defaults }: { csrfToken: string; defaults?: Defaults }) {
  const router = useRouter()
  const CATS = categoriesForUI()

  // 入力（順序：譲→求）
  const [give, setGive] = useState(defaults?.give ?? '')
  const [want, setWant] = useState(defaults?.want ?? '')
  const [conditions, setConditions] = useState(defaults?.conditions ?? '')
  const [category, setCategory] = useState(defaults?.category ?? '')
  const [series, setSeries] = useState(defaults?.series ?? '')
  const [deliveryMethod, setDeliveryMethod] = useState<'' | 'parcel' | 'meet' | 'either'>(defaults?.deliveryMethod ?? '')
  const [shipFromPref, setShipFromPref] = useState(defaults?.shipFromPref ?? '')

  // 画像
  const [images, setImages] = useState<UploadItem[]>([])
  const [pickErr, setPickErr] = useState<string | null>(null)
  const fileIn = useRef<HTMLInputElement | null>(null)

  // 状態
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // フォーカス
  const refGive = useRef<HTMLInputElement>(null)
  const refWant = useRef<HTMLInputElement>(null)
  const refDelivery = useRef<HTMLInputElement>(null)
  const refPref = useRef<HTMLSelectElement>(null)

  function FieldError({ id, msg }: { id: string; msg?: string }) {
    if (!msg) return null
    return <p id={id} className="mt-1 text-xs text-red-600">{msg}</p>
  }
  function Required() {
    return <span className="ml-1 inline-flex items-center rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">必須</span>
  }

  // サーバのレスポンス形を広く許容してURLを取り出す
  function pickUrlFromAny(j: any): string | null {
    if (!j) return null
    if (typeof j === 'string' && /^https?:\/\//.test(j)) return j
    if (typeof j?.url === 'string') return j.url
    if (typeof j?.publicUrl === 'string') return j.publicUrl
    if (typeof j?.public_url === 'string') return j.public_url
    if (Array.isArray(j?.urls) && j.urls[0]) return j.urls[0]
    if (Array.isArray(j?.paths) && j.paths[0] && /^https?:\/\//.test(j.paths[0])) return j.paths[0]
    if (Array.isArray(j?.data)) {
      const c = j.data.find((x: any) => x?.url || x?.publicUrl || x?.public_url)
      if (c) return c.url || c.publicUrl || c.public_url
    }
    if (j?.data) {
      if (typeof j.data === 'string' && /^https?:\/\//.test(j.data)) return j.data
      if (typeof j.data?.url === 'string') return j.data.url
      if (typeof j.data?.publicUrl === 'string') return j.data.publicUrl
      if (typeof j.data?.public_url === 'string') return j.data.public_url
      if (Array.isArray(j.data?.urls) && j.data.urls[0]) return j.data.urls[0]
    }
    return null
  }

  // 1枚ずつ順次アップロード（credentials付与・JSONの形を幅広く受ける）
  async function uploadSingle(f: File): Promise<string> {
    const fd = new FormData()
    fd.append('file', f, f.name)
    // 環境により必須ならCSRFも渡す
    fd.append('csrfToken', csrfToken)

    const res = await fetch('/api/swap/upload', {
      method: 'POST',
      body: fd,
      credentials: 'same-origin',
      cache: 'no-store',
    })

    const text = await res.text()
    let j: any = null
    try { j = JSON.parse(text) } catch { /* 念のため */ }

    if (!res.ok) {
      const msg = j?.error || j?.message || `アップロード失敗（${res.status}）`
      throw new Error(msg)
    }

    const url = pickUrlFromAny(j)
    if (!url) {
      // どんなレスが返ってきているかをデバッグしやすく
      console.warn('Unexpected upload response:', j ?? text)
      throw new Error('アップロードに失敗しました（URLを取得できませんでした）')
    }
    return url
  }

  // ファイル選択：検証→ローカル表示→順次アップロード
  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPickErr(null)
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    const remain = MAX_FILES - images.length
    if (files.length > remain) setPickErr(`画像は最大${MAX_FILES}枚までです（残り${remain}枚）`)
    const slice = files.slice(0, remain)

    // 事前バリデーション
    try {
      for (const f of slice) {
        if (!ACCEPT.includes(f.type)) throw new Error('画像は JPEG/PNG/WebP/AVIF/HEIC のみ対応です')
        if (f.size > MAX_FILE_BYTES) throw new Error('画像サイズは最大5MBまでです')
      }
    } catch (err: any) {
      setPickErr(err?.message || 'ファイル検証に失敗しました')
      return
    }

    // ローカルに仮追加（順にuploading→done/errorへ）
    const locals: UploadItem[] = slice.map((f, idx) => ({
      id: `${Date.now()}_${idx}`,
      preview: URL.createObjectURL(f),
      name: f.name,
      size: f.size,
      type: f.type,
      status: 'uploading',
    }))
    setImages(prev => [...prev, ...locals])

    // 順次アップロード
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

    // input値をクリア
    if (fileIn.current) fileIn.current.value = ''
  }

  const removeImage = async (idx: number) => {
    const tgt = images[idx]
    // 先にUIから除去
    setImages(prev => prev.filter((_, i) => i !== idx))
    // previewのURL開放
    try { if (tgt?.preview) URL.revokeObjectURL(tgt.preview) } catch {}
    // サーバ上の削除（失敗してもUIは維持）
    if (tgt?.url) fetch(`/api/swap/upload?url=${encodeURIComponent(tgt.url)}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => { })
  }

  const uploading = images.some(i => i.status === 'uploading')
  const imageUrls = useMemo(
    () => images.filter(i => i.status === 'done' && i.url).map(i => i.url!),
    [images]
  )

  function validate(): FieldErrors {
    const payload = {
      give,
      want,
      conditions: conditions || undefined,
      category: category || undefined,
      series: series || undefined,
      deliveryMethod: deliveryMethod,
      shipFromPref: shipFromPref,
      imageUrls,
    }
    const out = SwapSchema.safeParse(payload)
    if (out.success) return {}
    const fe: FieldErrors = {}
    for (const issue of out.error.issues) {
      fe[issue.path[0] as keyof FieldErrors] = issue.message
    }
    return fe
  }

  function focusFirst(fe: FieldErrors) {
    if (fe.give) { refGive.current?.focus(); return }
    if (fe.want) { refWant.current?.focus(); return }
    if (fe.deliveryMethod) { refDelivery.current?.focus(); return }
    if (fe.shipFromPref) { refPref.current?.focus(); return }
  }

  function mapServer(message: string): FieldErrors {
    const fe: FieldErrors = {}
    if (/【譲】|譲は必須/.test(message)) fe.give = message
    if (/【求】|求は必須/.test(message)) fe.want = message
    if (/NGワード/.test(message)) {
      fe.give = fe.give || message
      fe.want = fe.want || message
      fe.conditions = fe.conditions || message
    }
    if (/カテゴリ/.test(message)) fe.category = message
    if (/受け渡し|配送方法|delivery/.test(message)) fe.deliveryMethod = '受け渡し方法は必須です'
    if (/配送元|都道府県|pref/.test(message)) fe.shipFromPref = '配送元エリアは必須です'
    return fe
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const fe = validate()
    setErrors(fe)
    if (Object.keys(fe).length > 0) { focusFirst(fe); return }
    if (uploading) { setFormError('画像のアップロード完了をお待ちください'); return }

    try {
      setPending(true)
      const fd = new FormData()
      fd.set('csrfToken', csrfToken)
      fd.set('give', give.trim())
      fd.set('want', want.trim())
      if (conditions) fd.set('conditions', conditions)
      if (category) fd.set('category', category)
      if (series) fd.set('series', series)
      fd.set('delivery_method', deliveryMethod)
      fd.set('ship_from_pref', shipFromPref)

      for (const u of imageUrls) {
        fd.append('image_urls[]', u)
        fd.append('image_urls', u)
      }
      fd.set('image_urls_json', JSON.stringify(imageUrls))
      if (imageUrls[0]) fd.set('primary_image_url', imageUrls[0])

      const res = await fetch('/api/swap', { method: 'POST', body: fd, credentials: 'same-origin' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || j.ok === false) {
        const msg: string = j.error || j.message || '入力内容をご確認ください'
        const mapped = mapServer(msg)
        if (Object.keys(mapped).length > 0) { setErrors(mapped); focusFirst(mapped) } else { setFormError(msg) }
        return
      }

      try {
        sessionStorage.setItem('lastPostedSwap', JSON.stringify({
          id: j.id,
          category: category || null,
          series: series || null,
          give, want, conditions,
          deliveryMethod, shipFromPref,
          imageUrls,
          createdAt: Date.now(),
        }))
      } catch {}

      router.push(`/swap/complete?id=${encodeURIComponent(j.id)}`)
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6 rounded-xl border bg-white p-4">
      {formError && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      )}

      {/* 表示順：譲 → 求 */}
      <section>
        <label htmlFor="s-give" className="mb-2 block text-sm font-medium">【譲】<Required /></label>
        <input
          id="s-give" ref={refGive} type="text" value={give} onChange={e => setGive(e.currentTarget.value)} required
          aria-invalid={!!errors.give} aria-describedby={errors.give ? 's-give-err' : undefined}
          className={`w-full rounded-2xl border px-4 py-3 ${errors.give
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-amber-500 focus:ring-amber-500'}`}
          placeholder="例）△△の缶バッジ ○○"
        />
        <FieldError id="s-give-err" msg={errors.give} />
      </section>

      <section>
        <label htmlFor="s-want" className="mb-2 block text-sm font-medium">【求】<Required /></label>
        <input
          id="s-want" ref={refWant} type="text" value={want} onChange={e => setWant(e.currentTarget.value)} required
          aria-invalid={!!errors.want} aria-describedby={errors.want ? 's-want-err' : undefined}
          className={`w-full rounded-2xl border px-4 py-3 ${errors.want
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-amber-500 focus:ring-amber-500'}`}
          placeholder="例）□□のアクスタ ××"
        />
        <FieldError id="s-want-err" msg={errors.want} />
      </section>

      <section>
        <label htmlFor="s-cond" className="mb-2 block text-sm font-medium">条件（任意）</label>
        <textarea
          id="s-cond" rows={6} value={conditions} onChange={e => setConditions(e.currentTarget.value)}
          aria-invalid={!!errors.conditions} aria-describedby={errors.conditions ? 's-cond-err' : 's-cond-help'}
          className={`w-full rounded-2xl border px-4 py-3 ${errors.conditions
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-amber-500 focus:ring-amber-500'}`}
          placeholder="送料負担、同数交換、代替可 など"
        />
        {!errors.conditions && <p id="s-cond-help" className="mt-1 text-xs text-gray-500">具体的な条件ほどスムーズです（※金銭NG）。</p>}
        <FieldError id="s-cond-err" msg={errors.conditions} />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="s-category" className="block text-sm font-medium">カテゴリ</label>
          <select
            id="s-category" value={category} onChange={e => setCategory(e.currentTarget.value)}
            aria-invalid={!!errors.category} aria-describedby={errors.category ? 's-category-err' : undefined}
            className={`mt-1 w-full rounded-2xl border px-4 py-3 ${errors.category
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-amber-500 focus:ring-amber-500'}`}
          >
            <option value="">未選択</option>
            {CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <FieldError id="s-category-err" msg={errors.category} />
        </div>
        <div>
          <label htmlFor="s-series" className="block text-sm font-medium">シリーズ</label>
          <input
            id="s-series" value={series} onChange={e => setSeries(e.currentTarget.value)}
            className="mt-1 w-full rounded-2xl border px-4 py-3 border-gray-300 focus:border-amber-500 focus:ring-amber-500"
            placeholder="作品/弾/イベント名など"
          />
        </div>
      </section>

      {/* 受け渡し & 配送元（必須） */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium">受け渡し方法<Required /></p>
          <div className={`rounded-2xl border px-4 py-3 ${errors.deliveryMethod ? 'border-red-500' : 'border-gray-300'}`}>
            <div className="space-y-2">
              {DELIVERY.map((d, idx) => (
                <label key={d.id} className="flex items-center gap-2">
                  <input
                    ref={idx === 0 ? refDelivery : undefined}
                    type="radio"
                    name="delivery"
                    value={d.id}
                    checked={deliveryMethod === d.id}
                    onChange={() => setDeliveryMethod(d.id)}
                    className="h-4 w-4 accent-amber-500"
                  />
                  <span className="text-sm">{d.label}</span>
                </label>
              ))}
            </div>
          </div>
          <FieldError id="s-delivery-err" msg={errors.deliveryMethod} />
          <p className="mt-1 text-xs text-gray-500">匿名性を高めたい場合は局留め/営業所受取も検討（Swapは金銭NG）。</p>
        </div>

        <div>
          <label htmlFor="s-pref" className="block text-sm font-medium">配送元エリア（都道府県）<Required /></label>
          <select
            id="s-pref" ref={refPref} value={shipFromPref} onChange={e => setShipFromPref(e.currentTarget.value)}
            aria-invalid={!!errors.shipFromPref} aria-describedby={errors.shipFromPref ? 's-pref-err' : undefined}
            className={`mt-1 w-full rounded-2xl border px-4 py-3 ${errors.shipFromPref
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-amber-500 focus:ring-amber-500'}`}
          >
            <option value="">未選択</option>
            {PREFS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <FieldError id="s-pref-err" msg={errors.shipFromPref} />
        </div>
      </section>

      {/* 画像 */}
      <section>
        <p className="text-sm font-medium">写真（最大{MAX_FILES}枚）</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {images.map((img, i) => (
            <div key={img.id} className="relative">
              <img src={img.preview || img.url} alt={img.name} className="h-24 w-24 rounded-xl object-cover border" />
              <div className="absolute bottom-1 left-1 rounded bg-white/80 px-1 text-[10px]">
                {img.status === 'uploading' ? 'アップロード中' : img.status === 'done' ? '完了' : '失敗'}
              </div>
              <button type="button" onClick={() => removeImage(i)} aria-label="画像を削除" className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-amber-500 text-white text-xs">×</button>
              {img.error && <div className="absolute inset-x-0 -bottom-5 text-center text-[10px] text-red-600">{img.error}</div>}
            </div>
          ))}
          {images.length < MAX_FILES && (
            <button type="button" onClick={() => fileIn.current?.click()} className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed text-sm">＋ 追加</button>
          )}
          <input ref={fileIn} type="file" accept={ACCEPT.join(',')} multiple onChange={onPick} className="hidden" />
        </div>
        {pickErr && <p className="mt-1 text-xs text-red-600">{pickErr}</p>}
        <p className="mt-1 text-xs text-gray-500">対応: JPEG/PNG/WebP/AVIF/HEIC、各5MBまで。</p>
      </section>

      <div className="pt-2">
        <button type="submit" disabled={pending || images.some(i => i.status === 'uploading')} className="w-full rounded-xl bg-amber-500 px-4 py-3 text-white hover:bg-amber-600 disabled:opacity-50">
          {pending ? '投稿中…' : '投稿する'}
        </button>
      </div>
    </form>
  )
}
