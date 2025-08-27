'use client'

import Link from 'next/link'
import { useMemo } from 'react'

export type WantedItem = {
  id: string
  title: string
  description?: string | null
  category?: string | null
  budget_upper?: number | null
  created_at?: string
  image_urls?: any
  imageUrls?: any
  images?: any
  primary_image_url?: string
}

type Props = {
  item: WantedItem
  showTypeBadge?: boolean
  from?: string
}

function isUrlString(x: any): x is string { return typeof x === 'string' && /^https?:\/\//i.test(x) }
function parsePgArray(str: string): string[] {
  const s = str.trim(); if (!(s.startsWith('{') && s.endsWith('}'))) return []
  const inner = s.slice(1, -1)
  return inner.split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1')).filter(Boolean)
}
function normalizeUrlList(raw: any): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(v => (isUrlString(v) ? v : (v?.url || v?.publicUrl || v?.public_url || ''))).filter(isUrlString)
  if (typeof raw === 'string' && raw.startsWith('[')) { try { return normalizeUrlList(JSON.parse(raw)) } catch {} }
  if (typeof raw === 'string' && raw.includes('{') && raw.includes('}')) return normalizeUrlList(parsePgArray(raw))
  if (isUrlString(raw)) return [raw]
  return []
}
const yen = (n: number) => new Intl.NumberFormat('ja-JP').format(n)

export default function WantedListCard({ item, showTypeBadge = false, from }: Props) {
  const urls = useMemo(() => {
    const src = item.image_urls ?? item.imageUrls ?? item.images ?? (item.primary_image_url ? [item.primary_image_url] : [])
    return normalizeUrlList(src)
  }, [item])
  const img = urls[0] || ''
  const budget = typeof item.budget_upper === 'number' ? item.budget_upper : 0
  const created = item.created_at ? new Date(item.created_at) : null
  const dateLabel = created ? created.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }) : ''
  const href = from ? `/wanted/${item.id}?from=${encodeURIComponent(from)}` : `/wanted/${item.id}`

  return (
    <li>
      <Link
        href={href}
        className="block overflow-hidden rounded-2xl border border-gray-200 bg-white ring-1 ring-emerald-200/80 transition-transform duration-200 hover:scale-[1.02] hover:shadow-sm"
      >
        <div className="bg-gray-50 h-32 flex items-center justify-center overflow-hidden">
          {img ? (
            <img src={img} alt={item.title} className="h-32 w-full object-contain p-2" />
          ) : (
            <div className="h-32 w-full flex items-center justify-center text-2xl">🛍️</div>
          )}
        </div>
        <div className="p-3">
          <div className="mb-1 flex items-center gap-2">
            {budget > 0 && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[11px]">
                〜¥{yen(budget)}
              </span>
            )}
            <span className="ml-auto text-[11px] text-gray-400">{dateLabel}</span>
          </div>
          <h3 className="text-sm font-medium line-clamp-1">{item.title}</h3>
          {item.description && <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{item.description}</p>}
          {showTypeBadge && (
            <div className="mt-2">
              <span className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">
                買いたい
              </span>
            </div>
          )}
        </div>
      </Link>
    </li>
  )
}
