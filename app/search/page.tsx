import { headers } from 'next/headers'
import Link from 'next/link'
import WantedListCard from '@/components/WantedListCard'
import SwapListCard from '@/components/SwapListCard'

export const revalidate = 0

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

function normalize<T = any>(data: any): T[] {
  if (Array.isArray(data?.items)) return data.items as T[]
  if (Array.isArray(data)) return data as T[]
  return []
}

function buildQuery(base: URLSearchParams, patch: Record<string,string|undefined>) {
  const qs = new URLSearchParams(base)
  Object.entries(patch).forEach(([k,v]) => {
    if (v === undefined || v === null) return
    if (v === '') qs.delete(k)
    else qs.set(k, v)
  })
  return `?${qs.toString()}`
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const q = sp.q ?? ''
  const category = sp.category ?? ''
  const series = sp.series ?? ''
  const sort = (sp.sort ?? 'recommended') as 'new' | 'recommended'
  const type = (sp.type ?? 'want') as 'want' | 'swap' | 'all'

  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const base = `${proto}://${host}`

  // 表示件数（前回の圧縮を維持）
  const LIMIT_WANT = type === 'all' ? 8 : 12
  const LIMIT_SWAP = type === 'all' ? 8 : 12

  const makeQS = (limit: number) => {
    const qs = new URLSearchParams()
    if (q) qs.set('q', q)
    if (category) qs.set('category', category)
    if (series) qs.set('series', series)
    if (sort) qs.set('sort', sort)
    qs.set('limit', String(limit))
    return qs.toString()
  }

  const needWanted = type !== 'swap'
  const needSwap = type !== 'want'

  const [wJson, sJson] = await Promise.all([
    needWanted
      ? fetch(`${base}/api/wanted?${makeQS(LIMIT_WANT)}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null)
      : Promise.resolve(null),
    needSwap
      ? fetch(`${base}/api/swap?${makeQS(LIMIT_SWAP)}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null)
      : Promise.resolve(null),
  ])

  const wanted = needWanted ? normalize(wJson) : []
  const swaps  = needSwap ? normalize(sJson) : []

  // タブ切替用
  const qsForTabs = new URLSearchParams(sp as Record<string, string>)
  qsForTabs.delete('type')

  // 「戻る」用 from パスを組み立て（相対で十分）
  const fromQS = new URLSearchParams()
  if (q) fromQS.set('q', q)
  if (category) fromQS.set('category', category)
  if (series) fromQS.set('series', series)
  if (sort) fromQS.set('sort', sort)
  if (type) fromQS.set('type', type)
  const fromPath = `/search?${fromQS.toString()}`

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-6">
      {/* 条件ヘッダ */}
      <header className="mb-4">
        <h1 className="text-xl md:text-2xl font-bold">検索結果</h1>
        <p className="text-sm text-gray-600 mt-1">
          {q && <><span className="mr-2">キーワード:「{q}」</span></>}
          {category && <><span className="mr-2">カテゴリ:{catLabel(category)}</span></>}
          {series && <><span className="mr-2">シリーズ:{series}</span></>}
          <span className="mr-2">並び順:{sort === 'new' ? '新着' : 'おすすめ'}</span>
        </p>
      </header>

      {/* モバイル上部タブ */}
      <div className="md:hidden mb-3">
        <nav className="flex gap-2">
          <Link href={buildQuery(qsForTabs, { type: 'want' })}
            className={`flex-1 text-center rounded-full border px-3 py-2 text-sm ${type==='want' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-200'}`}>
            買いたい
          </Link>
          <Link href={buildQuery(qsForTabs, { type: 'swap' })}
            className={`flex-1 text-center rounded-full border px-3 py-2 text-sm ${type==='swap' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-700 border-gray-200'}`}>
            交換
          </Link>
          <Link href={buildQuery(qsForTabs, { type: 'all' })}
            className={`flex-1 text-center rounded-full border px-3 py-2 text-sm ${type==='all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-200'}`}>
            すべて
          </Link>
        </nav>
      </div>

      <div className="flex gap-6">
        {/* 左サイド（デスクトップ：縦タブ） */}
        <aside className="hidden md:block w-56 shrink-0">
          <div className="sticky top-16 space-y-2">
            <div className="text-xs text-gray-500 mb-1">種類で絞り込み</div>
            <nav className="flex flex-col gap-2">
              <Link href={buildQuery(qsForTabs, { type: 'want' })}
                className={`w-full text-left rounded-xl border px-3 py-2 text-sm ${type==='want' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300'}`}>
                買いたい
              </Link>
              <Link href={buildQuery(qsForTabs, { type: 'swap' })}
                className={`w-full text-left rounded-xl border px-3 py-2 text-sm ${type==='swap' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-700 border-gray-200 hover:border-amber-300'}`}>
                交換
              </Link>
              <Link href={buildQuery(qsForTabs, { type: 'all' })}
                className={`w-full text-left rounded-xl border px-3 py-2 text-sm ${type==='all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}>
                すべて表示
              </Link>
            </nav>
          </div>
        </aside>

        {/* メインリスト */}
        <section className="flex-1">
          {(type === 'want' || type === 'all') && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold">買いたい</h2>
                <Link href="/new" className="text-emerald-700 hover:underline text-sm">買いたいを投稿</Link>
              </div>
              {wanted.length === 0 ? (
                <p className="text-sm text-gray-500">条件に合う「買いたい」がありません。</p>
              ) : (
                <ul className="list-none grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {wanted.map((it: any) => (
                    <WantedListCard key={`want-${it.id}`} item={it} showTypeBadge={false} from={fromPath} />
                  ))}
                </ul>
              )}
            </section>
          )}

          {(type === 'swap' || type === 'all') && (
            <section className="mt-8">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold">交換</h2>
                <Link href="/swap/new" className="text-emerald-700 hover:underline text-sm">交換を募集</Link>
              </div>
              {swaps.length === 0 ? (
                <p className="text-sm text-gray-500">条件に合う「交換」がありません。</p>
              ) : (
                <ul className="list-none grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {swaps.map((it: any) => (
                    <SwapListCard key={`swap-${it.id}`} item={it} showTypeBadge={false} from={fromPath} />
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* 空表示 */}
          {((type==='want' && wanted.length===0) ||
            (type==='swap' && swaps.length===0) ||
            (type==='all' && wanted.length===0 && swaps.length===0)) && (
            <div className="mt-10 rounded-2xl border p-6 text-center text-sm text-gray-600">
              条件に合う投稿がありません。<Link className="text-emerald-700 underline" href="/new">買いたいを投稿</Link> または <Link className="text-emerald-700 underline" href="/swap/new">交換を募集</Link>してみませんか？
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
