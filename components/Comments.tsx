// components/Comments.tsx
'use client'

import React, { useEffect, useState } from 'react'

type Comment = { id: number | string; user_id: string; text: string; created_at: string }

export default function Comments({ postType, postId }: { postType: 'wanted' | 'swap' | 'event'; postId: string | number }) {
  const [list, setList] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    const qs = new URLSearchParams({ postType, postId: String(postId) })
    const res = await fetch(`/api/comments?${qs}`, { cache: 'no-store' })
    const j = await res.json()
    if (Array.isArray(j)) setList(j)
  }

  useEffect(() => { load() }, [postType, postId])

  const submit = async () => {
    setErr(null)
    if (!text.trim()) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.set('postType', postType)
      fd.set('postId', String(postId))
      fd.set('text', text.trim())
      const res = await fetch('/api/comments', { method: 'POST', body: fd })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.message || 'コメントに失敗しました')
      setText('')
      load()
    } catch (e: any) {
      setErr(e.message || 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">コメント</h2>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="丁寧な言葉でのやり取りを心がけましょう"
          className="w-full rounded-lg border px-3 py-2"
          maxLength={500}
        />
        <button onClick={submit} disabled={loading || !text.trim()} className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50">
          送信
        </button>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <ul className="space-y-2">
        {list.map((c) => (
          <li key={c.id} className="rounded-lg border px-3 py-2 text-sm">
            <p className="whitespace-pre-wrap">{c.text}</p>
            <p className="mt-1 text-xs text-gray-500">{new Date(c.created_at).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
