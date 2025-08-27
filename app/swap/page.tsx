import React from 'react'
import Link from 'next/link'

type Search = Record<string, string | string[] | undefined> | undefined
const pick = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v

type SwapItem = { id: string; give: string; want: string; conditions?: string; imageUrls?: string[] }

async function fetchSwap({ q, series, limit = 24 }: { q?: string; series?: string; limit?: number }): Promise<SwapItem[]> {
  const qs = new URLSearchParams()
  if (q) qs.set('q', q)
  if (series) qs.set('series', series)
  if (limit) qs.set('limit', String(limit))
  const url = `/api/swap?${qs.toString()}`

  try {
    const res = await fetch(url, { cache: 'no-store' })
    const text = await res.text()
    try {
      const json = JSON.parse(text)
      return Array.isArray(json) ? (json.filter(Boolean) as SwapItem[]) : []
    } catch { return [] }
  } catch { return [] }
}

export const dynamic = 'force-dynamic'

export default async function SwapPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const sp = (await searchParams) ?? {}
  const q = pick(sp?.q) || ''
  const series = pick(sp?.series) || ''

  const list = await fetchSwap({ q, series, limit: 24 })

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">交換を募集</h1>
        <Link href="/swap/new" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
          交換を募集
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border p-6 text-center text-sm text-gray-600">
          まだ交換の募集がありません。<Link href="/swap/new" className="underline">最初の募集</Link>をしてみましょう。
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((it) => (
            <div key={it.id} className="rounded-xl border p-4">
              <div className="text-sm text-gray-500">譲</div>
              <div className="mb-2 font-medium">{it.give}</div>
              <div className="text-sm text-gray-500">求</div>
              <div className="mb-2 font-medium">{it.want}</div>
              {it.conditions && <p className="line-clamp-2 text-sm text-gray-600">{it.conditions}</p>}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
