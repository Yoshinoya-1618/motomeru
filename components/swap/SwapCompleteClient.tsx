// components/swap/SwapCompleteClient.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type PostedSwap = {
  id: string
  category?: string
  series?: string
  give: string
  want: string
  conditions?: string
  imageUrls?: string[]
  createdAt?: number
}

export default function SwapCompleteClient() {
  const sp = useSearchParams()
  const id = sp.get('id') || ''
  const [data, setData] = useState<PostedSwap | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('lastPostedSwap')
      if (raw) {
        const obj = JSON.parse(raw) as PostedSwap
        if (!id || obj.id === id) setData(obj)
      }
    } catch {
      // 破損データなどは握りつぶし
    }
  }, [id])

  const mainImage = useMemo(
    () => data?.imageUrls?.[0] || '/placeholder-image.png',
    [data],
  )

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 rounded-xl border bg-white p-4 sm:p-6">
        <div className="mb-4">
          <h1 className="text-xl font-bold">投稿が完了しました</h1>
          <p className="text-sm text-gray-600">
            いただいた内容は審査の上、一覧に表示されます。
          </p>
        </div>

        {!data ? (
          <div className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-600">
            直前の投稿データが見つかりませんでした。トップへお戻りください。
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <div className="overflow-hidden rounded-xl border">
                <img
                  src={mainImage}
                  alt="投稿のメイン画像"
                  className="aspect-[4/3] w-full object-cover"
                  loading="eager"
                />
              </div>
              {!!data.imageUrls?.length && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {data.imageUrls.map((u, i) => (
                    <img
                      key={`${u}-${i}`}
                      src={u}
                      alt={`サムネイル ${i + 1}`}
                      className="h-16 w-16 flex-none rounded-lg border object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold">【譲】{data.give}</h2>
              <div className="text-lg font-semibold">【求】{data.want}</div>

              {data.series && (
                <div className="text-sm text-gray-700">シリーズ：{data.series}</div>
              )}
              {data.category && (
                <div className="text-sm text-gray-700">カテゴリ：{data.category}</div>
              )}

              {data.conditions && (
                <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm leading-relaxed">
                  {data.conditions}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/"
                  className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                >
                  トップへ戻る
                </Link>
                <Link
                  href="/swap/new"
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                >
                  続けて投稿する
                </Link>
                <Link
                  href={`/swap/${encodeURIComponent(data.id)}`}
                  className="rounded-md px-4 py-2 text-sm font-semibold text-emerald-700 hover:underline"
                >
                  投稿詳細を見る
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
