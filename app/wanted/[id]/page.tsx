import { headers } from 'next/headers'
import ImageCarousel from '@/components/ImageCarousel'
import BackToOriginLink from '@/components/BackToOriginLink'
import Link from 'next/link'

export const revalidate = 0
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Wanted = {
  id: string
  title: string
  description: string | null
  category: string | null
  series: string | null
  receive_method: 'delivery'|'meetup'|'either'|string|null
  budget_upper: number | null
  image_urls: string[] | null
  created_at: string
  receive_pref?: string | null
  deadline_at?: string | null
  deadline_choice?: '48'|'72'|'none'|string|null
}

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
function formatShortDate(iso?: string | null) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }) } catch { return '' }
}
function formatDeadline(item: Wanted): string {
  if (item.deadline_at) {
    const s = new Date(item.deadline_at).toLocaleString('ja-JP', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
    return `${s} まで`
  }
  if (item.deadline_choice === '48') return '48時間 まで'
  if (item.deadline_choice === '72') return '72時間（既定）'
  if (item.deadline_choice === 'none') return '無制限'
  return ''
}

// ---- 画像URL 正規化（キー揺れ・PG文字列・JSON文字列対応） ----
function isUrl(x: any): x is string { return typeof x === 'string' && /^https?:\/\//i.test(x) }
function parsePgTextArray(str: string): string[] {
  const s = str.trim(); if (!(s.startsWith('{') && s.endsWith('}'))) return []
  const inner = s.slice(1, -1)
  return inner.split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1')).filter(Boolean)
}
function normalizeUrlList(raw: any): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(v => (isUrl(v) ? v : (v?.url || v?.publicUrl || v?.public_url || ''))).filter(isUrl)
  if (typeof raw === 'string' && raw.trim().startsWith('[')) { try { return normalizeUrlList(JSON.parse(raw)) } catch {} }
  if (typeof raw === 'string' && raw.includes('{') && raw.includes('}')) return normalizeUrlList(parsePgTextArray(raw))
  if (isUrl(raw)) return [raw]
  return []
}

async function getItem(id: string): Promise<Wanted | null> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const base = `${proto}://${host}`
  const res = await fetch(`${base}/api/wanted?id=${encodeURIComponent(id)}`, { cache: 'no-store', next:{tags:['wanted']} })
  const j = await res.json().catch(()=>null)
  const raw = (j?.item ?? j) as any
  if (!raw) return null
  const imgSrc = raw.image_urls ?? raw.imageUrls ?? raw.images ?? (raw.primary_image_url ? [raw.primary_image_url] : [])
  const images = normalizeUrlList(imgSrc).slice(0, 10)
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? null,
    category: raw.category ?? null,
    series: raw.series ?? null,
    receive_method: raw.receive_method ?? null,
    budget_upper: typeof raw.budget_upper === 'number' ? raw.budget_upper : (typeof raw.budgetUpper === 'number' ? raw.budgetUpper : null),
    image_urls: images,
    created_at: raw.created_at,
    receive_pref: raw.receive_pref ?? null,
    deadline_at: raw.deadline_at ?? null,
    deadline_choice: raw.deadline_choice ?? null,
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await getItem(id)

  if (!item) {
    return (
      <main className="mx-auto max-w-3xl p-4">
        <p className="text-sm text-gray-600">投稿が見つかりませんでした。</p>
      </main>
    )
  }

  const recv = receiveLabel(item.receive_method)
  const created = formatShortDate(item.created_at)
  const deadline = formatDeadline(item)

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      {/* 戻る */}
      <div>
        <BackToOriginLink className="text-sm text-emerald-700 hover:underline" />
      </div>

      {/* タイトル */}
      <h1 className="text-2xl font-bold">{item.title}</h1>

      {/* 画像ギャラリー */}
      {item.image_urls?.length ? (
        <ImageCarousel images={item.image_urls} alt={item.title} heightClass="h-72" />
      ) : (
        <div className="flex h-72 items-center justify-center rounded-xl border bg-gray-50 text-2xl">🖼️ 画像はありません</div>
      )}

      {/* バッジ列 */}
      <div className="flex flex-wrap items-center gap-2">
        {typeof item.budget_upper === 'number' && (
          <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-sm text-emerald-700">
            〜¥{yen(item.budget_upper)}
          </span>
        )}
        {item.category && (
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
            {catLabel(item.category)}
          </span>
        )}
        {item.series && (
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
            {item.series}
          </span>
        )}
        {recv && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs text-sky-700 ring-1 ring-sky-300">
            <span aria-hidden>🚚</span>{recv}
          </span>
        )}
        <span className="ml-auto text-xs text-gray-400">{created}</span>
      </div>

      {/* メタ */}
      {(item.receive_pref || deadline) && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {item.receive_pref && (
            <div className="rounded-xl border bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-700">受け取りエリア</h2>
              <p className="text-sm text-gray-800">{item.receive_pref}</p>
            </div>
          )}
          {deadline && (
            <div className="rounded-xl border bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-700">募集期限</h2>
              <p className="text-sm text-gray-800">{deadline}</p>
            </div>
          )}
        </section>
      )}

      {/* 説明 */}
      {item.description ? (
        <section className="prose prose-sm max-w-none text-gray-800">
          <p className="whitespace-pre-wrap">{item.description}</p>
        </section>
      ) : (
        <section className="rounded-xl border bg-white p-4 text-xs text-gray-400">説明の記載はありません。</section>
      )}

      {/* CTA */}
      <section className="space-y-3">
        <div className="rounded-xl bg-emerald-600 p-3 text-center text-white">
          <Link href={`/messages/new?wanted=${item.id}`} className="block">
            オファー / DMで提案する
          </Link>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="mb-2 text-xs font-semibold text-gray-700">オファーの作法（初回DMの例）</p>
          <ul className="list-inside list-disc text-xs text-gray-600">
            <li>所持証明：商品の現物写真＋当日付メモ</li>
            <li>梱包方針：防水・緩衝材（具体）</li>
            <li>受け渡し案：候補日時／方法（対面 or 宅配）</li>
            <li>追跡共有：発送後に番号連絡</li>
          </ul>
        </div>
      </section>

      {/* 通報 */}
      <div className="flex justify-end">
        <Link
          href={`/report?type=wanted&id=${item.id}`}
          className="text-xs text-gray-400 underline hover:text-gray-600"
        >
          通報する
        </Link>
      </div>
    </main>
  )
}
