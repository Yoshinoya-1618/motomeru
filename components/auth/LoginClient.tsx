'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function LoginClient({ callbackUrl }: { callbackUrl: string }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!email) return
    setLoading(true)
    try {
      // メールログインは /profile/edit を既定遷移先に
      await signIn('email-only', {
        email,
        callbackUrl: '/profile/edit',
        redirect: true,
      })
    } catch (e: any) {
      setErr('ログインに失敗しました。時間をおいて再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  async function onGoogle() {
    setErr(null)
    try {
      // Googleは元のcallbackUrlを尊重
      await signIn('google', { callbackUrl, redirect: true })
    } catch {
      setErr('Googleログインに失敗しました。設定をご確認ください。')
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold">ログイン</h1>
        <p className="mt-1 text-sm text-gray-600">メールを入力するだけでログインできます。</p>

        {err && (
          <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-3" aria-label="メールでログイン">
          <label className="block text-sm">
            メールアドレス
            <input
              type="email"
              required
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2"
              placeholder="you@example.com"
              aria-label="メールアドレス"
              autoComplete="email"
              inputMode="email"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !email}
            className="w-full rounded-2xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? '送信中…' : 'メールでログイン'}
          </button>
        </form>

        <div className="my-4 text-center text-xs text-gray-400">または</div>
        <button
          onClick={onGoogle}
          className="w-full rounded-2xl border px-4 py-2 font-semibold hover:bg-gray-50"
          aria-label="Googleでログイン"
        >
          Googleでログイン
        </button>

        <p className="mt-3 text-xs text-gray-500">
          ログイン後、投稿/オファー/コメント/DMが利用できます。
        </p>
      </div>
    </main>
  )
}
