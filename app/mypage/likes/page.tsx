import type { Metadata } from 'next'
import Link from 'next/link'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'いいね！一覧 | モトメル',
  description: 'あなたがいいね！した投稿',
}

export default async function Page() {
  // TODO: API つなぎ込み（/api/mypage/likes など）
  const items: any[] = []

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-xl font-bold">いいね！一覧</h1>
      {items.length === 0 ? (
        <p className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-600">まだ「いいね！」した投稿はありません。</p>
      ) : (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {items.map((it) => (
            <Link key={it.id} href={`/wanted/${it.id}`} className="group rounded-xl border p-2 hover:shadow-sm">
              <div className="mb-2 overflow-hidden rounded-lg border">
                <img src={it.image_urls?.[0]} alt="" className="h-32 w-full object-contain p-2" />
              </div>
              <div className="line-clamp-1 text-sm font-semibold">{it.title}</div>
            </Link>
          ))}
        </section>
      )}
    </main>
  )
}
