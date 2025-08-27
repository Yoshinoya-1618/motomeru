import type { Metadata } from 'next'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '閲覧履歴 | モトメル',
  description: '最近見た投稿',
}

export default async function Page() {
  const items: any[] = [] // TODO: 将来 cookies/DB で記録

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-xl font-bold">閲覧履歴</h1>
      {items.length === 0 ? (
        <p className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-600">履歴はまだありません。</p>
      ) : (
        <div>/* TODO: レイアウト */</div>
      )}
    </main>
  )
}
