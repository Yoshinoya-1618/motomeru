import type { Metadata } from 'next'
import { Suspense } from 'react'
import LoginClient from '@/components/auth/LoginClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'ログイン | モトメル',
  description: 'メール入力のみ/Googleでログインできます。',
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const sp = await searchParams
  const callbackUrl = sp?.callbackUrl || '/'

  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md px-4 py-10">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
            <div className="mt-2 h-4 w-56 animate-pulse rounded bg-gray-200" />
            <div className="mt-6 h-10 w-full animate-pulse rounded-lg bg-gray-100" />
            <div className="mt-3 h-10 w-full animate-pulse rounded-lg bg-gray-100" />
          </div>
        </main>
      }
    >
      <LoginClient callbackUrl={callbackUrl} />
    </Suspense>
  )
}
