'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type WantedItem = {
  id: string
  user_id: string
  title: string
  description: string | null
  category: string | null
  series: string | null
  receive_method: 'delivery' | 'meetup' | 'either' | string | null
  budget_upper: number
  budgetUpper?: number
  priceMax?: number
  price_max?: number
  maxBudget?: number
  image_urls: string[] | null
  created_at: string
}
type SwapItem = {
  id: string
  user_id: string
  category: string | null
  series: string | null
  give: string
  want: string
  conditions: string | null
  image_urls: string[] | null
  created_at: string
}

export default function Home() {
  const [itemsWanted, setItemsWanted] = useState<WantedItem[]>([])
  const [itemsSwap, setItemsSwap] = useState<SwapItem[]>([])
  const [loadingWanted, setLoadingWanted] = useState(true)
  const [loadingSwap, setLoadingSwap] = useState(true)

  const [recoMix, setRecoMix] = useState<Array<{ kind: 'wanted' | 'swap'; data: WantedItem | SwapItem }>>([])
  const [loadingReco, setLoadingReco] = useState(true)

  const normalizeWanted = (d: any): WantedItem[] => Array.isArray(d?.items) ? d.items : (Array.isArray(d) ? d : [])
  const normalizeSwap = (d: any): SwapItem[] => Array.isArray(d?.items) ? d.items : (Array.isArray(d) ? d : [])

  useEffect(() => {
    let ab = false
    ;(async () => {
      try {
        const res = await fetch('/api/wanted?sort=new&limit=10', { cache: 'no-store' })
        const j = await res.json().catch(() => null)
        if (!ab) setItemsWanted(normalizeWanted(j))
      } finally { if (!ab) setLoadingWanted(false) }
    })()
    return () => { ab = true }
  }, [])
  useEffect(() => {
    let ab = false
    ;(async () => {
      try {
        const res = await fetch('/api/swap?sort=new&limit=10', { cache: 'no-store' })
        const j = await res.json().catch(() => null)
        if (!ab) setItemsSwap(normalizeSwap(j))
      } finally { if (!ab) setLoadingSwap(false) }
    })()
    return () => { ab = true }
  }, [])
  useEffect(() => {
    let ab = false
    ;(async () => {
      try {
        const [wRes, sRes] = await Promise.allSettled([
          fetch('/api/wanted?sort=recommended&limit=10', { cache: 'no-store' }).then(r => r.json()),
          fetch('/api/swap?sort=recommended&limit=10', { cache: 'no-store' }).then(r => r.json()),
        ])
        const w = wRes.status === 'fulfilled' ? normalizeWanted(wRes.value) : []
        const s = sRes.status === 'fulfilled' ? normalizeSwap(sRes.value) : []
        const mix: Array<{ kind: 'wanted' | 'swap'; data: WantedItem | SwapItem }> = []
        let i = 0, j = 0
        while (mix.length < 10 && (i < w.length || j < s.length)) {
          if (i < w.length) mix.push({ kind: 'wanted', data: w[i++] })
          if (mix.length >= 10) break
          if (j < s.length) mix.push({ kind: 'swap', data: s[j++] })
        }
        if (!ab) setRecoMix(mix)
      } finally { if (!ab) setLoadingReco(false) }
    })()
    return () => { ab = true }
  }, [])

  return (
    <main>
      {/* ヒーロー */}
      <section className="bg-emerald-600 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">投稿からはじまる、見つかるつながり。</h1>
          <p className="max-w-2xl mx-auto opacity-90">
            モトメルは「買いたいの投稿」と「交換の募集」から始まるマーケットプレイス。<br className="hidden sm:block" />
            投稿すると、最短でその日に提案が届きます。
          </p>
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/new" className="inline-block bg-white text-emerald-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-100 w-full sm:w-auto">
              買いたいを投稿
            </Link>
            <Link href="/swap/new" className="inline-block border border-white text-white font-bold py-3 px-6 rounded-lg hover:bg-white/10 w-full sm:w-auto">
              交換を募集
            </Link>
          </div>
        </div>
      </section>

      {/* 新着：買いたい */}
      <SectionHeader
        title="新着 買いたい"
        right={<Link href="/wanted/newest" className="text-emerald-700 hover:underline text-sm">すべて見る</Link>}
      />
      <CardsGrid loading={loadingWanted} emptyText="まだ買いたい投稿がありません。">
        {itemsWanted.slice(0, 10).map((it) => (
          <li key={it.id}><WantedCard item={it} /></li>
        ))}
      </CardsGrid>

      {/* 新着：交換募集 */}
      <SectionHeader
        title="新着 交換募集"
        right={<Link href="/swap/newest" className="text-emerald-700 hover:underline text-sm">すべて見る</Link>}
      />
      <CardsGrid loading={loadingSwap} emptyText="まだ交換募集がありません。">
        {itemsSwap.slice(0, 10).map((it) => (
          <li key={it.id}><SwapCard item={it} /></li>
        ))}
      </CardsGrid>

      {/* おすすめ（リンクなし） */}
      <SectionHeader title="おすすめの投稿" />
      <CardsGrid loading={loadingReco} emptyText="おすすめ投稿は、画像や説明が充実した投稿が優先表示されます。">
        {recoMix.slice(0, 10).map((row, idx) => (
          <li key={idx}>
            {row.kind === 'wanted' ? <WantedCard item={row.data as WantedItem} /> : <SwapCard item={row.data as SwapItem} />}
          </li>
        ))}
      </CardsGrid>
    </main>
  )
}

/* ---------- 共通UI ---------- */

function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        {right}
      </div>
    </section>
  )
}

function CardsGrid({
  loading,
  emptyText,
  children,
}: {
  loading: boolean
  emptyText: string
  children: React.ReactNode
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-8">
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-[320px] bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <ul className="list-none grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 m-0 p-0">
          {Array.isArray(children) && (children as any[]).length === 0 ? (
            <li className="col-span-full rounded-2xl border p-6 text-center text-sm text-gray-600">{emptyText}</li>
          ) : children}
        </ul>
      )}
    </section>
  )
}

/* ---------- ラベル ---------- */

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
const yen = (n: number) => new Intl.NumberFormat('ja-JP').format(n)

/* ---------- カード（受け渡しピルを削除／高さ固定／右下に日付／枠色は控えめ） ---------- */

function WantedCard({ item }: { item: WantedItem }) {
  const img = item.image_urls?.[0] ?? ''
  const budget = item.budgetUpper ?? item.budget_upper ?? item.priceMax ?? item.price_max ?? item.maxBudget ?? 0
  const created = new Date(item.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
  const desc = (item.description ?? '').trim()

  return (
    <Link
      href={`/wanted/${item.id}`}
      className="group block rounded-2xl border border-gray-200 bg-white overflow-hidden ring-1 ring-emerald-200/60 transition duration-200 hover:shadow-md hover:border-emerald-300 hover:ring-emerald-400"
    >
      <div className="bg-gray-50 h-36 overflow-hidden">
        {img ? (
          <img src={img} alt={item.title} className="h-full w-full object-contain p-2" loading="lazy" decoding="async" />
        ) : (
          <div className="h-36 w-full flex items-center justify-center text-2xl">🛍️</div>
        )}
      </div>

      <div className="p-3">
        {/* タイトル（1行固定） */}
        <h3 className="h-5 leading-5 text-sm font-medium overflow-hidden whitespace-nowrap text-ellipsis">
          {item.title}
        </h3>

        {/* メタ：価格/カテゴリ（受け渡しは削除） */}
        <div className="h-6 mb-1 flex items-center gap-1 overflow-hidden">
          {!!budget && (
            <span className="inline-flex items-center rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[11px]">
              〜¥{yen(Number(budget))}
            </span>
          )}
          {item.category && (
            <span className="inline-flex min-w-0 max-w-[60%] items-center truncate rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 text-[10px]">
              {catLabel(item.category)}
            </span>
          )}
        </div>

        {/* 説明（1行固定／無いときは空行で高さ合わせ） */}
        <p className="h-5 leading-5 text-xs text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis" title={desc || ''}>
          {desc || '\u00A0'}
        </p>

        {/* フッター：左=種別 / 右=日付 */}
        <div className="mt-2 h-[18px] flex items-center justify-between">
          <span className="inline-flex items-center rounded-full bg-emerald-600 text-white px-2.5 py-1 text-[11px] font-bold">買いたい</span>
          <span className="text-[11px] text-gray-400">{created}</span>
        </div>
      </div>
    </Link>
  )
}

function SwapCard({ item }: { item: SwapItem }) {
  const img = item.image_urls?.[0] ?? ''
  const created = new Date(item.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
  const want = (item.want ?? '').trim()
  const give = (item.give ?? '').trim()

  return (
    <Link
      href={`/swap/${item.id}`}
      className="group block rounded-2xl border border-gray-200 bg-white overflow-hidden ring-1 ring-amber-200/60 transition duration-200 hover:shadow-md hover:border-amber-300 hover:ring-amber-400"
    >
      <div className="bg-gray-50 h-36 overflow-hidden">
        {img ? (
          <img src={img} alt={want ? `求:${want}` : '交換募集'} className="h-full w-full object-contain p-2" loading="lazy" decoding="async" />
        ) : (
          <div className="h-36 w-full flex items-center justify-center text-2xl">🔁</div>
        )}
      </div>

      <div className="p-3">
        <h3 className="h-5 leading-5 text-sm font-medium overflow-hidden whitespace-nowrap text-ellipsis">
          {want ? `【求】${want}` : '【求】未記入'}
        </h3>

        <div className="h-6 mb-1 flex items-center gap-1 overflow-hidden">
          {item.category && (
            <span className="inline-flex min-w-0 max-w-[60%] items-center truncate rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 text-[10px]">
              {catLabel(item.category)}
            </span>
          )}
        </div>

        <p className="h-5 leading-5 text-xs text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis" title={give || ''}>
          {give ? `【譲】${give}` : '\u00A0'}
        </p>

        <div className="mt-2 h-[18px] flex items-center justify-between">
          <span className="inline-flex items-center rounded-full bg-amber-500 text-white px-2.5 py-1 text-[11px] font-bold">交換</span>
          <span className="text-[11px] text-gray-400">{created}</span>
        </div>
      </div>
    </Link>
  )
}
