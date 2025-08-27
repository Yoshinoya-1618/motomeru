import type { Metadata } from 'next'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'フォローリスト | モトメル',
  description: 'フォロー中のユーザー',
}

export default async function Page() {
  const users: any[] = [] // TODO: API つなぎ（/api/mypage/follows）
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-xl font-bold">フォローリスト</h1>
      {users.length === 0 ? (
        <p className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-600">フォロー中のユーザーはいません。</p>
      ) : (
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 rounded-xl border bg-white p-3">
              <div className="h-10 w-10 overflow-hidden rounded-full border bg-white">
                {u.avatar_url
                  ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                  : <div className="flex h-full w-full items-center justify-center bg-gray-100">{String(u.nickname ?? 'U')[0]}</div>}
              </div>
              <div className="text-sm font-medium">{u.nickname ?? 'ユーザー'}</div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
