// components/SwapCard.tsx
import React from 'react'
import Link from 'next/link'

type Swap = {
  id: number | string
  give_text?: string | null
  want_text?: string | null
  conditions?: string | null
  images?: string[] | null
  series?: string | null
}

export default function SwapCard({ s }: { s: Swap }) {
  const img = s.images?.[0]
  return (
    <article className="overflow-hidden rounded-xl border">
      {img ? <img src={img} alt="swap" className="h-44 w-full object-cover" /> : <div className="h-44 w-full bg-gray-100" />}
      <div className="space-y-2 p-3">
        <div className="flex flex-wrap gap-2 text-xs">
          {s.give_text && <span className="rounded bg-emerald-600 px-2 py-0.5 font-semibold text-white">譲</span>}
          {s.want_text && <span className="rounded bg-indigo-600 px-2 py-0.5 font-semibold text-white">求</span>}
          {s.series && <span className="rounded bg-gray-100 px-2 py-0.5">#{s.series}</span>}
        </div>
        <p className="line-clamp-2 text-sm">
          {s.give_text ? `譲: ${s.give_text}` : ''}{s.give_text && s.want_text ? '｜' : ''}{s.want_text ? `求: ${s.want_text}` : ''}
        </p>
        <Link href={`/swap/${s.id}`} className="text-sm text-blue-600 underline">詳細・コメント</Link>
      </div>
    </article>
  )
}
