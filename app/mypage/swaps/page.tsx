import type { Metadata } from 'next'
import Link from 'next/link'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '交換募集投稿 | モトメル',
  description: 'あなたの交換募集（Swap）',
}

export default async function Page() {
  const items: any[] = [] // TODO: /api/mypage/swaps

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-xl font-bold">交換募集投稿</h1>
      {items.length === 0 ? (
        <p className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-600">
          まだ投稿はありません。<Link href="/swap/new" className="text-emerald-700 underline">交換を募集</Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="rounded-xl border bg-white p-3">
              <Link href={`/swap/${it.id}`} className="block">
                <div className="text-sm font-semibold">【求】{it.want}</div>
                <div className="text-sm">【譲】{it.give}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
