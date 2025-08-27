// app/hub/[slug]/page.tsx
import type { Metadata } from 'next'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Next.js 15: params / searchParams は Promise
type PageProps = {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const title = `ハブ: ${decodeURIComponent(slug)} | モトメル`
  const description = `「${decodeURIComponent(slug)}」の募集を集約したシリーズ・ハブページです。`
  return { title, description }
}

export default async function HubPage({ params }: PageProps) {
  const { slug } = await params
  const decoded = decodeURIComponent(slug)

  return (
    <main className="mx-auto max-w-screen-lg p-4">
      <header className="mb-4">
        <h1 className="text-xl font-bold">{decoded} のハブ</h1>
        <p className="text-sm text-gray-500 mt-1">
          シリーズの新着・人気タグ・当日スレ（発売日/会場）を集約（暫定スタブ）。
        </p>
      </header>

      {/* TODO: この下を実データで置き換え（検索結果や人気タグなど） */}
      <section className="rounded-xl border p-4">
        <p>ここに「{decoded}」関連のWanted/Swap投稿一覧を表示します。</p>
      </section>
    </main>
  )
}

