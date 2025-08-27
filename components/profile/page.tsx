'use client'
import useSWR from 'swr'
import Link from 'next/link'

const fetcher = (u:string)=>fetch(u).then(r=>r.json())

export default function ProfilePage() {
  const { data } = useSWR('/api/profile/me', fetcher)
  const profile = data?.profile

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">プロフィール</h1>
      <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
        <div className="text-sm">表示名：<span className="font-semibold">{profile?.display_name ?? '（未設定）'}</span></div>
        <div className="text-sm break-all">ユーザーID（メール）：{profile?.user_id ?? '—'}</div>
        <div className="text-sm">アバターURL：{profile?.avatar_url ?? '—'}</div>
        <Link href="/profile/edit" className="inline-block mt-2 rounded-xl bg-gray-900 text-white px-4 py-2 text-sm">編集する</Link>
      </div>
    </main>
  )
}
