// components/Header.tsx
import React from 'react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function Header() {
  const session = await getServerSession(authOptions)
  const isAuthed = !!session?.user
  const callbackForNew = '/new' // 未ログイン時はログインへリダイレクトする想定

  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-semibold">モトメル</Link>
          <nav className="hidden items-center gap-2 text-sm sm:flex">
            <Link href="/" className="rounded px-2 py-1 hover:bg-gray-100">Wanted</Link>
            <Link href="/swap" className="rounded px-2 py-1 hover:bg-gray-100">Swap</Link>
            <span className="ml-2 text-xs text-gray-500">※ 無料譲渡は不可（価値の交換の場）</span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {!isAuthed ? (
            <>
              <Link
                href="/auth/register"
                className="hidden rounded border px-3 py-1.5 text-sm sm:inline"
              >
                会員登録
              </Link>
              <Link
                href={`/auth/login?callbackUrl=${encodeURIComponent(callbackForNew)}`}
                className="rounded bg-black px-3 py-1.5 text-sm text-white"
              >
                ログイン
              </Link>
              <Link
                href={`/auth/login?callbackUrl=${encodeURIComponent('/new')}`}
                className="hidden rounded px-3 py-1.5 text-sm underline sm:inline"
              >
                投稿
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/new"
                className="rounded bg-black px-3 py-1.5 text-sm text-white"
                title="Wanted（買いたい）を投稿"
              >
                Wanted投稿
              </Link>
              <Link
                href="/swap/new"
                className="rounded border px-3 py-1.5 text-sm"
                title="Swap（等価交換）を投稿"
              >
                Swap投稿
              </Link>
              <Link
                href="/notifications"
                className="hidden rounded px-3 py-1.5 text-sm underline sm:inline"
              >
                通知
              </Link>
              <Link
                href="/profile"
                className="rounded-full border px-3 py-1.5 text-sm"
                title="マイプロフィール"
              >
                マイプロフィール
              </Link>
            </>
          )}
        </div>
      </div>

      {/* モバイルのサブナビ（Wanted/Swap） */}
      <nav className="flex gap-2 border-t px-4 py-2 text-sm sm:hidden">
        <Link href="/" className="rounded px-2 py-1 hover:bg-gray-100">Wanted</Link>
        <Link href="/swap" className="rounded px-2 py-1 hover:bg-gray-100">Swap</Link>
        <span className="ml-auto text-[11px] text-gray-500">無料譲渡は不可</span>
      </nav>
    </header>
  )
}
