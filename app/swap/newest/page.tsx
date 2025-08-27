import Link from 'next/link'
import { headers } from 'next/headers'

export const revalidate = 0

type SwapItem = {
  id: string
  category: string | null
  series: string | null
  give: string
  want: string
  conditions: string | null
  image_urls: string[] | null
  created_at: string
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

async function getSwaps(): Promise<SwapItem[]> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const base = `${proto}://${host}`
  const res = await fetch(`${base}/api/swap?sort=new&limit=60`, { cache: 'no-store', next: { tags: ['swap'] } })
  const json = await res.json().catch(() => null)
  return Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : [])
}

export default async function SwapNewestPage() {
  const items = await getSwaps()

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-6">
      <div className="mb-2">
        <Link href="/" className="inline-flex items-center text-sm text-emerald-700 hover:underline">← 戻る</Link>
      </div>
      <h1 className="text-xl md:text-2xl font-bold mb-2">新着 交換募集</h1>

      {items.length === 0 ? (
        <div className="rounded-2xl border p-6 text-center text-sm text-gray-600">まだ交換募集がありません。</div>
      ) : (
        <ul className="list-none grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((it) => {
            const img = it.image_urls?.[0] ?? ''
            const created = new Date(it.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
            const want = (it.want ?? '').trim()
            const give = (it.give ?? '').trim()

            return (
              <li key={it.id}>
                <Link href={`/swap/${it.id}`} className="block rounded-2xl border border-gray-200 bg-white overflow-hidden ring-1 ring-amber-200/60 hover:shadow-sm hover:border-amber-300 hover:ring-amber-400 transition">
                  <div className="bg-gray-50 h-36 overflow-hidden">
                    {img ? (
                      <img src={img} alt={want ? `求:${want}` : '交換募集'} className="h-full w-full object-contain p-2 transition-transform duration-200 hover:scale-105" />
                    ) : (
                      <div className="h-36 w-full flex items-center justify-center text-2xl">🔁</div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="h-5 leading-5 text-sm font-medium overflow-hidden whitespace-nowrap text-ellipsis">
                      {want ? `【求】${want}` : '【求】未記入'}
                    </h3>

                    <div className="h-6 mb-1 flex items-center gap-1 overflow-hidden">
                      {it.category && (
                        <span className="inline-flex min-w-0 max-w-[60%] items-center truncate rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 text-[10px]">
                          {catLabel(it.category)}
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
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
