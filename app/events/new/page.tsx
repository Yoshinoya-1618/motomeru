// app/events/new/page.tsx
import { randomBytes } from 'crypto'
import React from 'react'

export const dynamic = 'force-dynamic'

export default async function NewEventPage() {
  const csrf = randomBytes(32).toString('hex')
  return (
    <main className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">イベント当日スレを作成</h1>
      <form action="/api/events" method="POST" className="space-y-4">
        <input type="hidden" name="csrfToken" value={csrf} />
        <div>
          <label className="block text-sm font-medium">タイトル（例：◯◯一番くじ発売日）</label>
          <input name="title" required maxLength={120} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">場所（会場・店舗など）</label>
          <input name="location" maxLength={120} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">日時（ISO形式 or 2025-08-24T10:00）</label>
          <input name="datetime" required className="mt-1 w-full rounded-lg border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">シリーズ（任意、ハブ連携）</label>
          <input name="series" maxLength={80} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </div>
        <button className="w-full rounded-lg bg-black px-4 py-3 text-white">作成する</button>
      </form>
      <p className="text-xs text-gray-500">※ スレは既定で72時間でアーカイブされます（環境変数で調整）。</p>
    </main>
  )
}
