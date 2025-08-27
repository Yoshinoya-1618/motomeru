'use client'

import { useState } from 'react'

type UploadResult = { ok: boolean; urls?: string[]; paths?: string[]; error?: string }
type DiagResult = { ok: boolean; exists?: boolean; bucket?: string; path?: string; error?: string }
type PostResult = { ok: boolean; item?: { id: string }; error?: string }

export default function StorageTestPage() {
  const [files, setFiles] = useState<FileList | null>(null)
  const [uploadRes, setUploadRes] = useState<UploadResult | null>(null)
  const [diagRes, setDiagRes] = useState<DiagResult | null>(null)
  const [title, setTitle] = useState('ストレージテスト投稿')
  const [budget, setBudget] = useState(1000)
  const [posting, setPosting] = useState(false)
  const [postRes, setPostRes] = useState<PostResult | null>(null)

  const urls = uploadRes?.urls ?? []

  async function doUpload() {
    setUploadRes(null); setDiagRes(null); setPostRes(null)
    if (!files?.length) { alert('画像を選択してください'); return }
    const fd = new FormData()
    Array.from(files).forEach(f => fd.append('files', f))
    const res = await fetch('/api/wanted/upload', { method: 'POST', body: fd })
    const json = await res.json() as UploadResult
    setUploadRes(json)
    if (!json.ok) alert(`アップロード失敗: ${json.error || res.status}`)
  }

  async function doDiag(u: string) {
    const res = await fetch(`/api/_diag/storage?url=${encodeURIComponent(u)}`, { cache:'no-store' })
    const json = await res.json() as DiagResult
    setDiagRes(json)
    if (!json.ok) alert(`診断失敗: ${json.error || res.status}`)
  }

  async function doPostWanted() {
    if (!urls.length) { alert('先にアップロードしてください'); return }
    setPosting(true); setPostRes(null)
    try {
      const fd = new FormData()
      fd.append('title', title)
      fd.append('budgetUpper', String(budget))
      urls.forEach(u => fd.append('image_urls', u))
      fd.append('description', 'dev/storage-test から投稿')
      const res = await fetch('/api/wanted', { method: 'POST', body: fd })
      const json = await res.json() as PostResult
      setPostRes(json)
      if (!json.ok) alert(`投稿失敗: ${json.error || res.status}`)
    } finally {
      setPosting(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold">Storage テスト（開発用）</h1>
      <p className="mt-1 text-sm text-gray-600">アップロード→公開URL確認→診断→Wanted投稿をこのページで試せます。</p>

      <section className="mt-6 rounded-xl border bg-white p-4">
        <h2 className="font-semibold">1) 画像アップロード（POST /api/wanted/upload）</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(e)=>setFiles(e.target.files)} className="w-full rounded-lg border px-3 py-2" />
          <button onClick={doUpload} className="sm:w-40 rounded-2xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">アップロード</button>
        </div>
        {uploadRes && (
          <div className="mt-4 text-sm">
            <div className={`rounded-lg border px-3 py-2 ${uploadRes.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              {uploadRes.ok ? 'アップロード成功' : `アップロード失敗: ${uploadRes.error}`}
            </div>
            {urls.length>0 && (
              <div className="mt-3 space-y-3">
                {urls.map((u, i)=>(
                  <div key={i} className="rounded-lg border p-3">
                    <div className="mb-2 flex gap-2">
                      <a href={u} target="_blank" className="text-blue-600 underline">新しいタブで開く</a>
                      <button onClick={()=>doDiag(u)} className="rounded border px-2 py-1 text-xs hover:bg-gray-50">存在チェック</button>
                    </div>
                    <div className="text-xs break-all">{u}</div>
                    <div className="mt-2 overflow-hidden rounded-lg border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="preview" className="h-40 w-full object-contain p-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {diagRes && (
        <section className="mt-4 rounded-xl border bg-white p-4 text-sm">
          <h2 className="font-semibold">2) 診断結果（/api/_diag/storage）</h2>
          <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-3">{JSON.stringify(diagRes, null, 2)}</pre>
        </section>
      )}

      <section className="mt-6 rounded-xl border bg-white p-4">
        <h2 className="font-semibold">3) このURLで Wanted を作成（POST /api/wanted）</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-600">タイトル</label>
            <input value={title} onChange={(e)=>setTitle(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs text-gray-600">上限予算（¥）</label>
            <input type="number" min={0} value={budget} onChange={(e)=>setBudget(Number(e.target.value)||0)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </div>
        </div>
        <button onClick={doPostWanted} disabled={!urls.length || posting} className="mt-3 rounded-2xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50">
          {posting ? '投稿中…' : 'このURLで Wanted を作成'}
        </button>

        {postRes && (
          <div className="mt-3 text-sm">
            <div className={`rounded-lg border px-3 py-2 ${postRes.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              {postRes.ok ? '投稿成功' : `投稿失敗: ${postRes.error}`}
            </div>
            {postRes.ok && postRes.item?.id && (
              <div className="mt-2">
                <a href={`/wanted/${encodeURIComponent(postRes.item.id)}`} className="rounded border px-3 py-1 text-sm hover:bg-gray-50">投稿詳細を開く</a>
              </div>
            )}
          </div>
        )}
      </section>

      <p className="mt-6 text-xs text-gray-500">※ 開発用ページ。検証後は削除可。</p>
    </main>
  )
}
