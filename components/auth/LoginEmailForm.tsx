'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function LoginEmailForm({ callbackUrl }: { callbackUrl: string }) {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setPending(true); setMsg(null)
    try {
      // ログイン後は /auth/post-login へ → プロフィール未作成なら /auth/signup へ誘導
      const postLogin = `/auth/post-login?next=${encodeURIComponent(callbackUrl)}`
      await signIn('credentials', { email, callbackUrl: postLogin, redirect: true })
    } catch {
      setMsg('ログインに失敗しました。時間をおいてお試しください。')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label htmlFor="login-email" className="block text-sm font-medium">メールアドレス</label>
      <input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.currentTarget.value)} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="you@example.com" />
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-50">ログイン</button>
      {msg && <p className="text-xs text-red-600">{msg}</p>}
    </form>
  )
}
