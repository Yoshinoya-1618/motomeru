// components/auth/LoginButton.tsx
'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'

export default function LoginButton() {
  const { data: session, status } = useSession()
  const loading = status === 'loading'
  const isAuthed = Boolean(session?.user)

  if (loading) {
    return (
      <div className="h-8 w-24 animate-pulse rounded-lg bg-gray-200" aria-hidden />
    )
  }

  if (!isAuthed) {
    return (
      <button
        onClick={() => signIn(undefined, { callbackUrl: '/' })}
        className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
      >
        ログイン / 会員登録
      </button>
    )
  }

  // ログイン済み
  const nick = (session?.user as any)?.name || (session?.user as any)?.email || 'Me'
  return (
    <div className="flex items-center gap-2">
      <Link href="/profile" className="rounded-full border px-3 py-1.5 hover:bg-gray-50">
        {nick}
      </Link>
      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
      >
        ログアウト
      </button>
    </div>
  )
}
