// app/auth/login/LoginButtons.tsx
'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'

export default function LoginButtons({ callbackUrl }: { callbackUrl: string }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  const handleEmailLogin = async () => {
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      alert('メールアドレスを正しく入力してください')
      return
    }
    setLoading('email')
    try {
      // ★ テスト用：Credentialsで即ログイン
      await signIn('credentials', { email, callbackUrl, redirect: true })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium">
          メールアドレス
        </label>
        <input
          id="email"
          type="email"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <button
          onClick={handleEmailLogin}
          className="w-full rounded-lg bg-black px-4 py-3 text-white text-base font-medium disabled:opacity-50"
          disabled={!!loading}
          aria-busy={loading === 'email'}
        >
          {loading === 'email' ? '処理中…' : 'メールアドレスで続行（テスト）'}
        </button>
        <p className="text-xs text-gray-500">
          開発・テスト用：メール入力だけで即ログインします（本人確認メールは送信しません）。
        </p>
      </div>
    </div>
  )
}
