'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ImageCarousel from '@/components/ImageCarousel'

type Props = { id: string; base: string }

type Wanted = {
  id: string
  title: string
  description: string | null
  category: string | null
  series?: string | null
  receive_method: 'delivery'|'meetup'|'either'|string|null
  receive_pref?: string | null
  deadline_at?: string | null
  deadline_choice?: '48'|'72'|'none'|string|null
  budget_upper: number | null
  image_urls: string[] | null
}

// ---- 表示ユーティリティ ----
function catLabel(id?: string | null) {
  switch (id) {
    case 'trading_cards': return 'トレカ'
    case 'anime_goods': return 'アニメ・キャラグッズ'
    case 'figures': return 'フィギュア・プラモ'
    case 'games': return 'ゲーム'
    case 'idol_music': return '音楽・アイドル'
    case 'plush': return 'ぬいぐるみ'
    case 'books_doujin': return 'コミック・同人誌'
    case 'event_ltd': return 'イベント限定'
    case 'retro_toys': return 'レトロ玩具'
    case 'other': return 'その他'
    default: return id ?? ''
  }
}
function receiveLabel(v?: string | null) {
  if (!v) return ''
  if (v === 'delivery') return 'ゆうパック・宅配便'
  if (v === 'meetup') return '対面'
  if (v === 'either') return 'どちらでも'
  return v
}
const yen = (n: number) => new Intl.NumberFormat('ja-JP').format(n)
function formatDeadline(item: Wanted): string {
  if (item.deadline_at) {
    try {
      const s = new Date(item.deadline_at).toLocaleString('ja-JP', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
      return `${s} まで`
    } catch {}
  }
  if (item.deadline_choice === '48') return '48時間 まで'
  if (item.deadline_choice === '72') return '72時間（既定）'
  if (item.deadline_choice === 'none') return '無制限'
  return ''
}

// ---- 画像URL 正規化（重要） ----
function isUrlString(x: any): x is string {
  return typeof x === 'string' && /^https?:\/\//i.test(x)
}
/** {https://a,https://b} / {"https://a","https://b"} → string[] */
function parsePgTextArray(str: string): string[] {
  const s = str.trim()
  if (!(s.startsWith('{') && s.endsWith('}'))) return []
  const inner = s.slice(1, -1)
  return inner.split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1')).filter(Boolean)
}
function uniq(arr: string[]) { const s = new Set<string>(); return arr.filter(u => !s.has(u) && s.add(u)) }
/** どんな入力でも string[] の絶対URL配列に統一 */
function normalizeUrlList(raw: any): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return uniq(raw.map((v) => {
      if (isUrlString(v)) return v
      if (v && typeof v === 'object') return v.url || v.publicUrl || v.public_url || ''
      return ''
    }).filter(isUrlString)).slice(0, 10)
  }
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try { return normalizeUrlList(JSON.parse(raw)) } catch { /* ignore */ }
  }
  if (typeof raw === 'string' && raw.includes('{') && raw.includes('}')) {
    return normalizeUrlList(parsePgTextArray(raw))
  }
  if (isUrlString(raw)) return [raw]
  return []
}

// ---- API / セッション読取（画像キーの揺れに対応） ----
async function fetchWantedById(id: string): Promise<Wanted | null> {
  try {
    const res = await fetch(`/api/wanted?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
    const j = await res.json().catch(() => null)
    if (!j) return null

    const raw = j.item ?? (Array.isArray(j.items) ? j.items.find((x: any) => x?.id === id) : j)
    if (!raw) return null

    // 画像候補の抽出（キー揺れ全部拾う）
    const imgSrc =
      raw.image_urls ?? raw.imageUrls ?? raw.images ??
      (raw.primary_image_url ? [raw.primary_image_url] : [])

    const normalized: Wanted = {
      id: raw.id,
      title: raw.title,
      description: raw.description ?? null,
      category: raw.category ?? null,
      series: raw.series ?? null,
      receive_method: raw.receive_method ?? null,
      receive_pref: raw.receive_pref ?? null,
      deadline_at: raw.deadline_at ?? null,
      deadline_choice: raw.deadline_choice ?? null,
      budget_upper: typeof raw.budget_upper === 'number'
        ? raw.budget_upper
        : (typeof raw.budgetUpper === 'number' ? raw.budgetUpper : null),
      image_urls: normalizeUrlList(imgSrc),
    }
    return normalized
  } catch {
    return null
  }
}

function readLastPostedFromSession(): Partial<Wanted> | null {
  try {
    const s = sessionStorage.getItem('lastPostedWanted') || sessionStorage.getItem('motomeru:lastWanted')
    if (!s) return null
    const d = JSON.parse(s)
    const imgSrc =
      d.imageUrls ?? d.image_urls ?? d.images ??
      (d.primary_image_url ? [d.primary_image_url] : [])
    const wanted: Partial<Wanted> = {
      id: d.id,
      title: d.title,
      description: d.description ?? null,
      category: d.category ?? null,
      series: d.series ?? null,
      budget_upper: typeof d.budgetUpper === 'number' ? d.budgetUpper
                  : typeof d.budgetMax === 'number' ? d.budgetMax
                  : null,
      receive_method: d.receive_method ?? (d.deliveryMethod
        ? (d.deliveryMethod === 'parcel' ? 'delivery'
          : d.deliveryMethod === 'meet' ? 'meetup'
          : 'either')
        : null),
      receive_pref: d.receivePref ?? null,
      deadline_choice: d.deadline ?? null,
      image_urls: normalizeUrlList(imgSrc),
    }
    return wanted
  } catch {
    return null
  }
}

// /new のプリセット
function toDeliveryMethodForUI(v?: string | null): 'parcel'|'meet'|'either'|'' {
  if (v === 'delivery') return 'parcel'
  if (v === 'meetup') return 'meet'
  if (v === 'either') return 'either'
  return ''
}
function writePrefillDraft(item: Wanted) {
  const draft = {
    title: item.title || '',
    description: item.description || '',
    category: item.category || '',
    series: item.series || '',
    budgetMax: typeof item.budget_upper === 'number' ? item.budget_upper : '',
    deliveryMethod: toDeliveryMethodForUI(item.receive_method),
    receivePref: item.receive_pref || '',
    deadline: (item.deadline_choice === '48' || item.deadline_choice === '72' || item.deadline_choice === 'none')
      ? item.deadline_choice : '72',
    imageUrls: (item.image_urls || []).slice(0, 5),
  }
  try { sessionStorage.setItem('prefillWantedDraft', JSON.stringify(draft)) } catch {}
}

// ---- 本体 ----
export default function CompleteClient({ id, base }: Props) {
  const router = useRouter()
  const [item, setItem] = useState<Wanted | null>(null)
  const [origin, setOrigin] = useState<string>(base || '')

  useEffect(() => {
    if (!origin && typeof window !== 'undefined') setOrigin(window.location.origin)
    ;(async () => {
      let data = id ? await fetchWantedById(id) : null
      if (!data) {
        const local = readLastPostedFromSession()
        if (local && (local.title || (local.image_urls && local.image_urls.length))) {
          data = {
            id: (local.id || id || crypto.randomUUID()) as string,
            title: (local.title || '（タイトル未取得）') as string,
            description: (local.description ?? null) as any,
            category: (local.category ?? null) as any,
            series: (local.series ?? null) as any,
            receive_method: (local.receive_method ?? 'either') as any,
            receive_pref: (local.receive_pref ?? null) as any,
            deadline_at: (local.deadline_at ?? null) as any,
            deadline_choice: (local.deadline_choice ?? null) as any,
            budget_upper: (local.budget_upper ?? null) as any,
            image_urls: normalizeUrlList(local.image_urls),
          }
        }
      }
      if (data) {
        setItem({
          ...data,
          image_urls: normalizeUrlList(data.image_urls).slice(0, 10),
        })
      }
    })()
  }, [id, origin])

  const shareUrl = useMemo(() => {
    return item?.id ? `${origin}/wanted/${encodeURIComponent(item.id)}` : origin
  }, [origin, item?.id])

  const onMakeAnother = () => {
    if (item) writePrefillDraft(item)
    router.push('/new')
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-emerald-700 hover:underline">← トップへ</Link>
        {item?.id && <Link href={`/wanted/${item.id}`} className="text-sm text-emerald-700 hover:underline">投稿を確認する →</Link>}
      </div>

      <h1 className="text-2xl font-bold">投稿が完了しました</h1>
      <p className="text-sm text-gray-600">あなたの「買います」が公開されました。オファーが届いたら通知します。</p>

      {item ? (
        <section className="space-y-4 rounded-xl border bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold">{item.title}</h2>
            {typeof item.budget_upper === 'number' && (
              <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-sm text-emerald-700">
                〜¥{yen(item.budget_upper)}
              </span>
            )}
          </div>

          {(item.image_urls && item.image_urls.length > 0) ? (
            <ImageCarousel images={item.image_urls} alt={item.title} heightClass="h-56" />
          ) : (
            <div className="flex h-56 items-center justify-center rounded-xl border bg-gray-50 text-2xl">🖼️ 画像はありません</div>
          )}

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {item.category && (
              <div>
                <dt className="text-xs text-gray-500">カテゴリ</dt>
                <dd className="text-sm text-gray-800">{catLabel(item.category)}</dd>
              </div>
            )}
            {item.series && (
              <div>
                <dt className="text-xs text-gray-500">シリーズ</dt>
                <dd className="text-sm text-gray-800">{item.series}</dd>
              </div>
            )}
            {receiveLabel(item.receive_method) && (
              <div>
                <dt className="text-xs text-gray-500">受け渡し</dt>
                <dd className="text-sm text-gray-800">{receiveLabel(item.receive_method)}</dd>
              </div>
            )}
            {item.receive_pref && (
              <div>
                <dt className="text-xs text-gray-500">受け取りエリア</dt>
                <dd className="text-sm text-gray-800">{item.receive_pref}</dd>
              </div>
            )}
            {item.deadline_choice && (
              <div>
                <dt className="text-xs text-gray-500">募集期限</dt>
                <dd className="text-sm text-gray-800">{formatDeadline(item)}</dd>
              </div>
            )}
          </dl>

          {item.description && (
            <div>
              <h3 className="mb-1 text-sm font-semibold text-gray-700">説明</h3>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{item.description}</p>
            </div>
          )}
        </section>
      ) : (
        <p className="text-sm text-gray-600">投稿内容を取得できませんでした。</p>
      )}

      <section className="rounded-xl border bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">この募集をシェア</h3>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="block w-full overflow-x-auto rounded-md border bg-gray-50 px-2 py-1 text-xs text-gray-700">{shareUrl}</code>
          <div className="flex gap-2">
            <button onClick={async () => {
              try { await navigator.clipboard.writeText(shareUrl); alert('リンクをコピーしました') } catch {}
            }} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700">
              リンクをコピー
            </button>
            <Link
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('買います：' + (item?.title ?? ''))}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              className="rounded-md border border-sky-300 bg-white px-3 py-1.5 text-sm text-sky-700 hover:bg-sky-50"
            >
              Xで共有
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href={`/?q=${encodeURIComponent(item?.title ?? '')}`}
          className="block rounded-xl border bg-white p-4 text-center text-sm hover:bg-gray-50"
        >
          近い出品を探す
        </Link>
        <button
          type="button"
          onClick={onMakeAnother}
          className="block rounded-xl border bg-white p-4 text-center text-sm hover:bg-gray-50"
        >
          同条件でもう1件作る
        </button>
        <Link
          href="/settings/profile"
          className="block rounded-xl border bg-white p-4 text-center text-sm hover:bg-gray-50"
        >
          プロフィールポリシーを整える
        </Link>
      </section>

      <section className="space-y-3">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          新着DM/オファーの通知を有効にしましょう。<Link href="/settings/notifications" className="underline">通知設定</Link>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          有償取引の安全ガイド：ギフト券コード／外部アプリ強制／「先振込のみ」は使用しない。対面は人目のある場所、配送は追跡番号の共有と受取時の開封撮影を推奨します。
        </div>
      </section>
    </main>
  )
}
