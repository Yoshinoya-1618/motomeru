import type { Metadata } from 'next'
import { Suspense } from 'react'
import ProfileEditClient from '@/components/profile/ProfileEditClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'プロフィール編集 | モトメル',
  description: 'アバター・ニックネーム・自己紹介を編集します。',
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
            <div className="mt-2 h-4 w-56 animate-pulse rounded bg-gray-200" />
            <div className="mt-6 flex items-center gap-4">
              <div className="h-20 w-20 animate-pulse rounded-full bg-gray-100" />
              <div className="h-9 w-28 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="mt-6 h-10 w-full animate-pulse rounded bg-gray-100" />
            <div className="mt-3 h-24 w-full animate-pulse rounded bg-gray-100" />
            <div className="mt-4 flex gap-2">
              <div className="h-10 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-10 w-20 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        </main>
      }
    >
      <ProfileEditClient />
    </Suspense>
  )
}
