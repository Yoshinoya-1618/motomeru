'use client'

import React, { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SmartIntentBar() {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const onSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    const query = q.trim()
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : '/search')
  }

  const onStartPost = async () => {
    const title = q.trim()
    setLoading(true)
    try {
      router.push(title ? `/new?title=${encodeURIComponent(title)}` : '/new')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSearch} className="flex flex-col gap-3 sm:flex-row">
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full rounded-full border px-5 py-3 outline-none focus:ring-2 focus:ring-emerald-600"
        placeholder="何を募集しますか？（例：旧裏 リザードン 3万円 匿名配送）"
        aria-label="募集キーワード"
      />
      <div className="flex w-full gap-3 sm:w-auto">
        <button
          type="submit"
          className="flex-1 rounded-md border px-5 py-3 text-sm font-semibold hover:bg-gray-50 sm:flex-none"
          aria-label="検索"
        >
          検索
        </button>
        <button
          type="button"
          onClick={onStartPost}
          disabled={loading}
          className="flex-1 rounded-md bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 sm:flex-none"
          aria-label="この内容で募集を開始（72時間）"
        >
          {loading ? '準備中…' : 'この内容で募集を開始（72時間）'}
        </button>
      </div>
    </form>
  )
}
