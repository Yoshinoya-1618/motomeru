'use client'
import { useEffect } from 'react'

export default function CsrfField({ token }: { token: string }) {
  useEffect(() => {
    // MVP: クライアント側で Cookie 設定（SameSite=Lax）
    document.cookie = `motomeru_csrf=${token}; Max-Age=3600; Path=/; SameSite=Lax`
  }, [token])

  return <input type="hidden" name="csrf_token" value={token} />
}
