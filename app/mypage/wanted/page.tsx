import type { Metadata } from 'next'
import Link from 'next/link'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '買いたい投稿 | モトメル',
  description: 'あなたのWanted投稿',
}

export default async function Page() {
  // TODO: /api/mypage/wanted で user_id 絞り込み
  const items: any[] = []

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-xl font-bold">買いたい投稿</h1>
      {items.length === 0 ? (
        <p className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-600">
          まだ投稿はありません。<Link href="/new" className="text-emerald-700 underline">買いたいを投稿</Link>
        </p>
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
