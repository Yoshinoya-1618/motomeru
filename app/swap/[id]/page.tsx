import { headers } from 'next/headers'
import ImageCarousel from '@/components/ImageCarousel'
import BackToOriginLink from '@/components/BackToOriginLink'
import Link from 'next/link'

export const revalidate = 0

type Swap = {
  id: string
  category: string | null
  series: string | null
  give: string
  want: string
  conditions: string | null
  image_urls: string[] | null
  created_at: string
  // 以下はあれば表示（未導入なら自動で非表示）
  delivery_method?: 'parcel' | 'meet' | 'either' | null
  ship_from_pref?: string | null
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

function deliveryLabel(v?: string | null) {
  switch (v) {
    case 'parcel': return 'ゆうパック・宅配便'
    case 'meet': return '対面'
    case 'either': return 'どちらでも'
    default: return ''
  }
}

async function getItem(id: string): Promise<Swap | null> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const base = `${proto}://${host}`
  const res = await fetch(`${base}/api/swap?id=${encodeURIComponent(id)}`, { cache: 'no-store', next: { tags: ['swap'] } })
  const j = await res.json().catch(() => null)
  return (j?.item ?? j) as Swap | null
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

  const created = new Date(item.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
  const hasDelivery = !!deliveryLabel(item.delivery_method)
  const hasShipFrom = !!(item.ship_from_pref && item.ship_from_pref.trim().length > 0)

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      {/* 戻る */}
      <div>
        <BackToOriginLink className="text-sm text-emerald-700 hover:underline" />
      </div>

      {/* タイトル（順序：譲 → 求） */}
      <h1 className="text-2xl font-bold">【譲】{item.give}</h1>
      <p className="text-sm text-gray-600">【求】{item.want}</p>

      {/* 画像ギャラリー */}
      <ImageCarousel images={item.image_urls ?? []} alt={item.give} heightClass="h-72" />

      {/* バッジ列：カテゴリ・シリーズ・投稿日（右端） */}
      <div className="flex flex-wrap items-center gap-2">
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
        <span className="ml-auto text-xs text-gray-400">{created}</span>
      </div>

      {/* 金銭NGの固定注意（Swap文化の明示） */}
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
        交換（Swap）は金銭のやり取りはできません。ギフト券コード／先振込のみ／外部アプリ強制などは通報の対象です。
      </div>

      {/* メタ情報：受け渡し・配送元 / 条件 */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">受け渡し・配送</h2>
          <dl className="space-y-2 text-sm">
            {hasDelivery && (
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">受け渡し方法</dt>
                <dd className="text-gray-800">{deliveryLabel(item.delivery_method)}</dd>
              </div>
            )}
            {hasShipFrom && (
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">配送元エリア</dt>
                <dd className="text-gray-800">{item.ship_from_pref}</dd>
              </div>
            )}
            {!hasDelivery && !hasShipFrom && (
              <p className="text-xs text-gray-400">受け渡し情報は未設定です。</p>
            )}
          </dl>
          <p className="mt-3 text-[11px] text-gray-500">
            匿名性を高めたい場合は、局留め／営業所受取などをご検討ください。追跡番号の共有を推奨します。
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">条件</h2>
          {item.conditions ? (
            <p className="whitespace-pre-wrap text-sm text-gray-800">{item.conditions}</p>
          ) : (
            <p className="text-xs text-gray-400">条件の記載はありません。</p>
          )}
        </div>
      </section>

      {/* CTA + 作法ミニガイド */}
      <section className="space-y-3">
        <div className="rounded-xl bg-emerald-600 p-3 text-center text-white">
          <Link href={`/messages/new?swap=${item.id}`} className="block">
            DMで提案する
          </Link>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="mb-2 text-xs font-semibold text-gray-700">オファーの作法（初回DMの例）</p>
          <ul className="list-inside list-disc text-xs text-gray-600">
            <li>所持証明：譲る物の写真1枚＋簡単なメモ（当日付）</li>
            <li>梱包方針：防水・緩衝材（具体）</li>
            <li>受け渡し案：候補日時／方法（対面 or 宅配）</li>
            <li>追跡共有：発送後に番号連絡</li>
          </ul>
        </div>
      </section>

      {/* 通報導線（簡易） */}
      <div className="flex justify-end">
        <Link
          href={`/report?type=swap&id=${item.id}`}
          className="text-xs text-gray-400 underline hover:text-gray-600"
        >
          通報する
        </Link>
      </div>
    </main>
  )
}
