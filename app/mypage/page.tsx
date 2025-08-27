import type { Metadata } from 'next'
import Link from 'next/link'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'マイページ | モトメル',
  description: 'あなたのメニューと各種一覧',
}

async function fetchProfile() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/profile`, { cache: 'no-store' })
    if (!res.ok) return null
    const j = await res.json()
    return j?.profile ?? null
  } catch { return null }
}

export default async function Page() {
  const profile = await fetchProfile()
  const nickname: string = profile?.nickname ?? 'ニックネーム未設定'
  const avatar_url: string | null = profile?.avatar_url ?? null

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-4 flex items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-full border bg-white">
          {avatar_url
            ? <img src={avatar_url} alt="アバター" className="h-full w-full object-cover" />
            : <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 via-indigo-100 to-rose-100 text-2xl">
                {(nickname[0] ?? 'M').toUpperCase()}
              </div>}
        </div>
        <div>
          <h1 className="text-xl font-bold">{nickname}</h1>
          <p className="mt-1 text-sm text-gray-600">マイプロフィール</p>
        </div>
        <div className="ml-auto">
          <Link href="/profile/edit" className="rounded-2xl border px-4 py-2 text-sm hover:bg-gray-50">
            プロフィール編集
          </Link>
        </div>
      </header>

      <section aria-label="マイページメニュー" className="rounded-2xl border bg-white p-4">
        <ul className="divide-y">
          <MenuItem href="/mypage/likes" label="いいね！一覧" />
          <MenuItem href="/mypage/history" label="閲覧履歴" />
          <MenuItem href="/mypage/follows" label="フォローリスト" />
          <MenuItem href="/mypage/wanted" label="買いたい投稿" />
          <MenuItem href="/mypage/offers" label="オファーした投稿" />
          <MenuItem href="/mypage/swaps" label="交換募集投稿" />
        </ul>
      </section>
    </main>
  )
}

function MenuItem({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center justify-between px-1 py-3 hover:bg-gray-50 rounded-lg">
        <span className="text-sm">{label}</span>
        <span aria-hidden className="text-gray-400">›</span>
      </Link>
    </li>
  )
}
