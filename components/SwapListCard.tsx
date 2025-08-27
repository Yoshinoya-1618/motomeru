import Link from 'next/link'

export type SwapItem = {
  id: string
  category?: string | null
  series?: string | null
  give: string
  want: string
  conditions?: string | null
  image_urls?: string[] | null
  created_at: string
}

type Props = {
  item: SwapItem
  className?: string
  /** 「交換」バッジ表示（既定true） */
  showTypeBadge?: boolean
  /** 戻り先。例: "/search?type=swap&q=..." */
  from?: string
}

function catLabel(id?: string | null) {
  switch (id) {
    case 'trading_cards': return 'トレカ'
    case 'anime_goods':   return 'アニメ・キャラグッズ'
    case 'figures':       return 'フィギュア・プラモ'
    case 'games':         return 'ゲーム'
    case 'idol_music':    return '音楽・アイドル'
    case 'plush':         return 'ぬいぐるみ'
    case 'books_doujin':  return 'コミック・同人誌'
    case 'event_ltd':     return 'イベント限定'
    case 'retro_toys':    return 'レトロ玩具'
    case 'other':         return 'その他'
    default: return id ?? ''
  }
}

export default function SwapListCard({ item, className, showTypeBadge = true, from }: Props) {
  const img = Array.isArray(item.image_urls) && item.image_urls[0] ? item.image_urls[0] : ''
  const created = new Date(item.created_at)
  const dateLabel = created.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
  const href = `/swap/${item.id}${from ? `?from=${encodeURIComponent(from)}` : ''}`

  return (
    <li className={className}>
      <Link
        href={href}
        className="block rounded-2xl border border-gray-200 bg-white overflow-hidden ring-1 ring-amber-200/80 transition-transform duration-200 hover:scale-[1.02] hover:shadow-sm"
      >
        <div className="bg-gray-50 h-36 flex items-center justify-center overflow-hidden">
          {img ? (
            <img src={img} alt={item.want ? `求:${item.want}` : '交換募集'} className="h-36 w-full object-contain p-2" />
          ) : (
            <div className="h-36 w-full flex items-center justify-center text-2xl">🔁</div>
          )}
        </div>

        <div className="p-3">
          <div className="flex items-center gap-2 mb-1">
            {item.category && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                {catLabel(item.category)}
              </span>
            )}
            <span className="ml-auto text-[11px] text-gray-400">{dateLabel}</span>
          </div>

          <h3 className="text-sm font-medium line-clamp-1">
            {item.want && item.want.trim() !== '' ? `【求】${item.want}` : '【求】未記入'}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
            {item.give && item.give.trim() !== '' ? `【譲】${item.give}` : '\u00A0'}
          </p>

          {showTypeBadge && (
            <div className="mt-2">
              <span className="inline-flex items-center rounded-full bg-amber-500 text-white px-2.5 py-1 text-[11px] font-bold">
                交換
              </span>
            </div>
          )}
        </div>
      </Link>
    </li>
  )
}
