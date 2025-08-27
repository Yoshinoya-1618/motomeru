'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ImageCarousel from '@/components/ImageCarousel'
import Link from 'next/link'

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

export default function SwapCompleteClient() {
  const sp = useSearchParams()
  const id = sp?.get('id') || ''
  const [item, setItem] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const fallback = (() => {
        try {
          const raw = sessionStorage.getItem('lastPostedSwap')
          if (!raw) return null
          const j = JSON.parse(raw)
          if (j?.id && id && j.id === id) return j
          return j || null
        } catch { return null }
      })()

      try {
        if (!id) { setItem(fallback); return }
        const res = await fetch(`/api/swap?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
        const j = await res.json().catch(() => null)
        const it = j?.item ?? (Array.isArray(j?.items) ? j.items[0] : (j && j.id ? j : null))
        if (alive) setItem(it || fallback)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [id])

  const imgs = useMemo(() => normalizeImages(item), [item])

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">投稿が完了しました</h1>
      <p className="mb-4 text-sm text-gray-600">内容の確認ができます。コメントやオファーをお待ちください。</p>

      <div className="mb-4">
        <ImageCarousel images={imgs} alt="投稿画像" heightClass="h-72" />
      </div>

      <div className="space-y-2 rounded-xl border bg-white p-4">
        <div className="text-sm">
          <span className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white mr-2">交換</span>
          <span className="font-semibold">【求】</span> {item?.want ?? '—'}
        </div>
        <div className="text-sm"><span className="font-semibold">【譲】</span> {item?.give ?? '—'}</div>
        {item?.conditions && <p className="whitespace-pre-wrap text-sm text-gray-800">{item.conditions}</p>}
      </div>

      <div className="mt-6 flex gap-3">
        {id ? <Link href={`/swap/${encodeURIComponent(id)}`} className="rounded-lg bg-amber-500 px-4 py-2 text-white hover:bg-amber-600">投稿を開く</Link> : null}
        <Link href="/swap/new" className="rounded-lg border px-4 py-2 hover:bg-gray-50">続けて投稿</Link>
        <Link href="/" className="rounded-lg border px-4 py-2 hover:bg-gray-50">トップへ戻る</Link>
      </div>
    </>
  )
}
