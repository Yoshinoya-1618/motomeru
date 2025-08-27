'use client'
import useSWR from 'swr'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import BackButton from '@/components/BackButton'

const fetcher = (u:string)=>fetch(u).then(r=>r.json())

export default function ProfileEditPage() {
  const { data, isLoading } = useSWR('/api/profile/me', fetcher)
  const r = useRouter()
  const sp = useSearchParams()
  const first = sp.get('first') === '1'

  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string|null>(null)

  useEffect(()=>{
    if (data?.profile) {
      setDisplayName(data.profile.display_name ?? '')
      setAvatarUrl(data.profile.avatar_url ?? '')
    }
  },[data])

  const onSave = async (e: React.FormEvent)=>{
    e.preventDefault(); setSaving(true); setMsg(null)
    const res = await fetch('/api/profile/upsert', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ display_name: displayName, avatar_url: avatarUrl })
    })
    setSaving(false)
    if (res.ok) {
      setMsg('保存しました')
      if (first) r.push('/'); // 初回はホームに戻す（必要ならマイページに遷移）
    } else {
      const j = await res.json().catch(()=>({}))
      setMsg('保存に失敗しました: '+(j?.error ?? 'unknown'))
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <div className="mb-4"><BackButton /></div>
      <h1 className="text-2xl font-bold mb-2">プロフィール設定</h1>
      <p className="text-sm text-subtle mb-6">{first ? '初めてのご利用ありがとうございます。表示名を設定しましょう。' : '表示名やアバターを変更できます。'}</p>

      <form onSubmit={onSave} className="bg-white rounded-2xl border shadow-sm p-4 space-y-4">
        <div>
          <label htmlFor="display_name" className="block text-sm font-medium">表示名</label>
          <input id="display_name" required minLength={1} maxLength={40} value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="例）モトメル太郎" className="mt-1 w-full rounded-xl border px-4 py-3 text-base outline-none focus:ring-2" />
        </div>
        <div>
          <label htmlFor="avatar_url" className="block text-sm font-medium">アバターURL（任意）</label>
          <input id="avatar_url" value={avatarUrl} onChange={e=>setAvatarUrl(e.target.value)} placeholder="https://example.com/avatar.png" className="mt-1 w-full rounded-xl border px-4 py-3 text-base outline-none focus:ring-2" />
        </div>
        {msg && <div className="text-sm">{msg}</div>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving || isLoading} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm">{saving?'保存中…':'保存する'}</button>
        </div>
      </form>
    </main>
  )
}
