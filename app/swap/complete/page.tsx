import { headers } from 'next/headers'
import ImageCarousel from '@/components/ImageCarousel'
import Link from 'next/link'

export const revalidate = 0

type Swap = {
  id: string
  category: string | null
  series?: string | null
  give: string
  want: string
  conditions: string | null
  image_urls: string[] | null
  // 任意：あれば表示（未導入でも崩れない）
  delivery_method?: 'parcel' | 'meet' | 'either' | string | null
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
  if (!v) return ''
  if (v === 'parcel') return 'ゆうパック・宅配便'
  if (v === 'meet') return '対面'
  if (v === 'either') return 'どちらでも'
  return v
}

async function getBase(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

async function getItem(id: string): Promise<Swap | null> {
  const base = await getBase()
  const res = await fetch(`${base}/api/swap?id=${encodeURIComponent(id)}`, { cache: 'no-store', next: { tags: ['swap'] } })
  const j = await res.json().catch(() => null)
  return (j?.item ?? j) as Swap | null
}

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const sp = await searchParams
  const id = sp?.id
  const base = await getBase()
  const item = id ? await getItem(id) : null
  const shareUrl = id ? `${base}/swap/${encodeURIComponent(id)}` : base

  const delivery = deliveryLabel(item?.delivery_method)
  const hasShipFrom = !!(item?.ship_from_pref && item.ship_from_pref.trim().length > 0)

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-emerald-700 hover:underline">← トップへ</Link>
        {id && <Link href={`/swap/${id}`} className="text-sm text-amber-700 hover:underline">投稿を確認する →</Link>}
      </div>

      <h1 className="text-2xl font-bold">交換募集を投稿しました</h1>
      <p className="text-sm text-gray-600">あなたの「交換募集」が公開されました。DMが来たら通知します。</p>

      {item ? (
        <section className="space-y-4 rounded-xl border bg-white p-4">
          {/* タイトル（順序：譲 → 求） */}
          <h2 className="text-lg font-semibold">【譲】{item.give}</h2>
          <p className="text-sm text-gray-700">【求】{item.want}</p>

          {/* 画像 */}
          <ImageCarousel images={item.image_urls ?? []} alt={item.give} heightClass="h-56" />

          {/* バッジ列：カテゴリ・シリーズ・受け渡し・配送元 */}
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
            {delivery && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs text-sky-700 ring-1 ring-sky-300">
                <span aria-hidden>🚚</span>{delivery}
              </span>
            )}
            {hasShipFrom && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs text-gray-700 ring-1 ring-gray-300">
                <span aria-hidden>📍</span>{item?.ship_from_pref}
              </span>
            )}
          </div>

          {/* 条件 */}
          {item.conditions ? (
            <p className="whitespace-pre-wrap text-sm text-gray-800">{item.conditions}</p>
          ) : (
            <p className="text-xs text-gray-400">条件の記載はありません。</p>
          )}
        </section>
      ) : (
        <p className="text-sm text-gray-600">投稿内容を取得できませんでした。</p>
      )}

      {/* シェア導線 */}
      <section className="rounded-xl border bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">この募集をシェア</h3>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code id="share-url" className="block w-full overflow-x-auto rounded-md border bg-gray-50 px-2 py-1 text-xs text-gray-700">{shareUrl}</code>
          <div className="flex gap-2">
            <button id="copy-link" className="rounded-md bg-amber-500 px-3 py-1.5 text-sm text-white hover:bg-amber-600">リンクをコピー</button>
            <Link
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('交換募集：' + (item ? `【譲】${item.give} ⇄ 【求】${item.want}` : ''))}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              className="rounded-md border border-sky-300 bg-white px-3 py-1.5 text-sm text-sky-700 hover:bg-sky-50"
            >
              Xで共有
            </Link>
          </div>
        </div>
        {/* RSCでも動く最小スクリプト */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var btn = document.getElementById('copy-link');
                var code = document.getElementById('share-url');
                if (!btn || !code) return;
                btn.addEventListener('click', async function(){
                  try{
                    var text = code.textContent || '';
                    await navigator.clipboard.writeText(text);
                    btn.textContent = 'コピーしました';
                    setTimeout(function(){ btn.textContent = 'リンクをコピー'; }, 1800);
                  }catch(e){
                    try{
                      var r = document.createRange(); r.selectNode(code); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
                      var ok = document.execCommand('copy');
                      sel.removeAllRanges();
                      btn.textContent = ok ? 'コピーしました' : 'コピー失敗';
                      setTimeout(function(){ btn.textContent = 'リンクをコピー'; }, 1800);
                    }catch(_){}
                  }
                });
              })();
            `,
          }}
        />
      </section>

      {/* 次の一歩 */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href={id ? `/swap/${id}` : '/'}
          className="block rounded-xl border bg-white p-4 text-center text-sm hover:bg-gray-50"
        >
          投稿を確認する
        </Link>
        <Link
          href="/swap/new"
          className="block rounded-xl border bg-white p-4 text-center text-sm hover:bg-gray-50"
        >
          同条件でもう1件作る
        </Link>
        <Link
          href="/settings/profile"
          className="block rounded-xl border bg-white p-4 text-center text-sm hover:bg-gray-50"
        >
          プロフィールポリシーを整える
        </Link>
      </section>

      {/* 安全ガイド（Swapは金銭NG） */}
      <section className="space-y-3">
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          交換（Swap）は金銭のやり取りはできません。ギフト券コード／外部アプリ強制／「先振込のみ」などは通報の対象です。
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
          DMは「所持証明 → 梱包方針 → 受け渡し案（対面 or 宅配） → 追跡共有」の順で進めましょう。
        </div>
      </section>
    </main>
  )
}
