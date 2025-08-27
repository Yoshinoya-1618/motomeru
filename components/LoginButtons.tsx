'use client'

import { useState, FormEvent } from 'react'
import { signIn } from 'next-auth/react'

type Providers = {
  google?: boolean
  email?: boolean
  /** 開発用の簡易ログインを表示したい場合のみ true（未使用なら出しません） */
  dev?: boolean
}

type Props = {
  callbackUrl: string
  providers?: Providers
}

export default function LoginButtons({ callbackUrl, providers }: Props) {
  const showGoogle = providers?.google ?? false
  const showEmail = providers?.email ?? false
  const showDev = providers?.dev ?? false

  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const onGoogle = async () => {
    setPending(true)
    try {
      await signIn('google', { callbackUrl })
    } finally {
      setPending(false)
    }
  }

  const onEmail = async (e: FormEvent) => {
    e.preventDefault()
    if (!email) return
    setPending(true)
    setMsg(null)
    try {
      const res = await signIn('email', { email, callbackUrl, redirect: false })
      if (res?.ok) {
        setMsg('ログイン用リンクを送信しました。メールをご確認ください。')
      } else {
        setMsg('送信に失敗しました。時間をおいてお試しください。')
      }
    } catch {
      setMsg('送信に失敗しました。時間をおいてお試しください。')
    } finally {
      setPending(false)
    }
  }

  const onDev = async () => {
    setPending(true)
    try {
      // ここは任意。Credentials などの開発用Provider名に合わせて変更してください。
      await signIn('credentials', { email: 'dev@example.com', name: 'DevUser', callbackUrl })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-4">
      {showGoogle && (
        <button
          type="button"
          onClick={onGoogle}
          disabled={pending}
          className="w-full rounded-lg border px-4 py-3 text-sm"
          aria-label="Googleでログイン"
        >
          Googleでログイン
        </button>
      )}

      {showEmail && (
        <form onSubmit={onEmail} className="space-y-2">
          <label htmlFor="login-email" className="block text-sm font-medium">
            メールアドレスでログイン
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            placeholder="you@example.com"
            required
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-black px-4 py-3 text-white text-sm disabled:opacity-50"
            aria-label="ログインリンクを送信"
          >
            ログインリンクを送信
          </button>
          {msg && <p className="text-xs text-gray-600">{msg}</p>}
        </form>
      )}

      {showDev && (
        <button
          type="button"
          onClick={onDev}
          disabled={pending}
          className="w-full rounded-lg border px-4 py-3 text-sm"
          aria-label="開発用ログイン"
        >
          （開発用）簡易ログイン
        </button>
      )}
    </div>
  )
}
