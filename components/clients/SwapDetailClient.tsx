'use client'

import { useEffect, useMemo, useState } from 'react'
import ImageCarousel from '@/components/ImageCarousel'

function normalizeImages(item: any): string[] {
  if (!item) return []
  const arrs: any[] = []
  if (Array.isArray(item.image_urls)) arrs.push(...item.image_urls)
  if (Array.isArray(item.imageUrls)) arrs.push(...item.imageUrls)
  if (Array.isArray(item.images)) arrs.push(...item.images)
  if (Array.isArray(item.photos)) arrs.push(...item.photos)
  if (typeof item.image_url === 'string') arrs.push(item.image_url)
  if (typeof item.primary_image_url === 'string') arrs.push(item.primary_image_url)
  if (typeof item.image_urls_json === 'string') {
    try { const j = JSON.parse(item.image_urls_json); if (Array.isArray(j)) arrs.push(...j) } catch {}
  }
  return Array.from(new Set(arrs.filter((v) => typeof v === 'string' && v)))
}

export default function SwapDetailClient({ id }: { id: string }) {
  const [item, setItem] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch(`/api/swap?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
        const j = await res.json().catch(() => null)
        const it = j?.item ?? (Array.isArray(j?.items) ? j.items[0] : (j && j.id ? j : null))
        if (alive) setItem(it)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [id])

  const imgs = useMemo(() => normalizeImages(item), [item])

  return (
    <>
      <h1 className="mb-3 text-xl font-semibold">交換の募集</h1>

      <div className="mb-4">
        <ImageCarousel images={imgs} alt="投稿画像" heightClass="h-80" />
      </div>

      <div className="space-y-2 rounded-xl border bg-white p-4">
        <div className="text-sm">
          <span className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white mr-2">交換</span>
          <span className="font-semibold">【求】</span> {item?.want ?? '—'}
        </div>
        <div className="text-sm"><span className="font-semibold">【譲】</span> {item?.give ?? '—'}</div>
        {item?.conditions && <p className="whitespace-pre-wrap text-sm text-gray-800">{item.conditions}</p>}
        {item?.created_at && (
          <div className="text-xs text-gray-500">
            投稿日：{new Date(item.created_at).toLocaleString('ja-JP')}
          </div>
        )}
      </div>
    </>
  )
}
