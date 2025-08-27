// app/events/[id]/page.tsx
import type { Metadata } from 'next'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

// Next.js 15: params/searchParams は Promise なので await が必要
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: `イベント #${id} | モトメル`,
    description: `イベント #${id} の詳細ページ`,
  }
}

export default async function EventPage({ params }: PageProps) {
  const { id } = await params

  // ここで必要ならDB/APIから id を使って取得
  // const event = await fetch(...)

  return (
    <main className="p-4 max-w-screen-sm mx-auto">
      <h1 className="text-xl font-bold">イベント詳細</h1>
      <p className="text-sm text-gray-500 mt-1">ID: {id}</p>

      {/* TODO: 実データの表示に置き換え */}
      <section className="mt-4 rounded-xl border p-4">
        <p>イベント情報のモックです。実装に合わせて差し替えてください。</p>
      </section>
    </main>
  )
}
