// components/WantedCard.tsx
import React from 'react'
import Link from 'next/link'

type Wanted = {
  id: number | string
  title: string
  description?: string | null
  images?: string[] | null
  price_min?: number | null
  price_max?: number | null
  category?: string | null
  series?: string | null
}

export default function WantedCard({ w }: { w: Wanted }) {
  const img = w.images?.[0]
  return (
    <article className="overflow-hidden rounded-xl border">
      {img ? (
        <img src={img} alt={w.title} className="h-44 w-full object-cover" />
      ) : (
        <div className="h-44 w-full bg-gray-100" />
      )}
      <div className="space-y-2 p-3">
        <div className="flex items-center gap-2 text-xs">
          {w.price_min && w.price_max && (
            <span className="rounded bg-gray-900 px-2 py-0.5 font-semibold text-white">¥{w.price_min}〜¥{w.price_max}</span>
          )}
          {w.category && <span className="rounded bg-gray-100 px-2 py-0.5">{w.category}</span>}
          {w.series && <span className="rounded bg-gray-100 px-2 py-0.5">#{w.series}</span>}
        </div>
        <h3 className="line-clamp-2 font-medium">{w.title}</h3>
        <Link href={`/wanted/${w.id}`} className="text-sm text-blue-600 underline">詳細・コメント</Link>
      </div>
    </article>
  )
}
