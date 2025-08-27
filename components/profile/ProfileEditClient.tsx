'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

const NICK_MAX = 20
const BIO_MAX = 1000
const NG_WORDS = ['無料', '無償', 'タダ']
const ALLOW_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const MAX_SIZE = 5 * 1024 * 1024

function hasNg(s?: string | null) { return !!s && NG_WORDS.some((w) => s.includes(w)) }
function initialFromString(s?: string | null) {
  const t = (s || '').trim()
  const c = t ? t[0]!.toUpperCase() : 'M'
  return /[A-Z0-9]/.test(c) ? c : 'M'
}

export default function ProfileEditClient() {
  const router = useRouter()
  const { data: session } = useSession()

  const [nickname, setNickname] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const [errNick, setErrNick] = useState<string | null>(null)
  const [errBio, setErrBio] = useState<string | null>(null)
  const [errImg, setErrImg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/profile', { cache: 'no-store' })
        if (!res.ok) return
        const j = await res.json()
        const p = j?.profile
        if (p) {
          setNickname(p.nickname || '')
          setBio(p.bio || '')
          setAvatarUrl(p.avatar_url || null)
        }
      } catch {}
    })()
  }, [])

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const nickRemain = useMemo(() => Math.max(0, NICK_MAX - nickname.length), [nickname])
  const bioRemain = useMemo(() => Math.max(0, BIO_MAX - bio.length), [bio])

  const baseNameForInitial =
    (nickname && nickname.trim()) ||
    (session?.user?.name as string) ||
    (session?.user?.email as string) ||
    'M'

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setErrImg(null)
    const f = e.target.files?.[0] || null
    if (!f) return setFile(null)
    if (!ALLOW_TYPES.includes(f.type)) { setErrImg('対応していない画像形式です（jpeg/png/webp/avif）'); return }
    if (f.size > MAX_SIZE) { setErrImg('ファイルサイズは5MB以下にしてください'); return }
    setFile(f)
  }

  async function uploadIfNeeded(): Promise<string | null> {
    if (!file) return avatarUrl || null
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/profile/upload', { method: 'POST', body: fd })
    const j = await res.json().catch(() => null)
    if (!res.ok || !j?.ok) throw new Error(j?.error || 'アップロードに失敗しました')
    return j.url as string
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrNick(null); setErrBio(null); setErrImg(null)

    if (!nickname.trim()) { setErrNick('ニックネームを入力してください'); return }
    if (nickname.length > NICK_MAX) { setErrNick(`ニックネームは${NICK_MAX}文字以内です`); return }
    if (bio.length > BIO_MAX) { setErrBio(`自己紹介は${BIO_MAX}文字以内です`); return }
    if (hasNg(nickname) || hasNg(bio)) { setErrBio('NGワード（無料/無償/タダ等）が含まれています'); return }

    setSaving(true)
    try {
      const url = await uploadIfNeeded()
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim(), bio, avatar_url: url }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.ok) throw new Error(j?.error || '保存に失敗しました')

      // ★ 即時反映シグナル（ヘッダーが受け取って再取得）
      try {
        window.dispatchEvent(new CustomEvent('motomeru:profile:updated'))
        localStorage.setItem('motomeru:profile:updated_at', Date.now().toString())
      } catch {}

      // 完了トースト用（/profile 側で ?updated=1 を拾って表示）
      router.push('/profile?updated=1')
    } catch (e: any) {
      const msg = String(e?.message || e)
      if (msg.includes('ニックネーム')) setErrNick(msg)
      else setErrBio(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold">プロフィールを編集</h1>
        <p className="mt-1 text-sm text-gray-600">アバター・ニックネーム・自己紹介を設定できます。</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-6" noValidate>
          {/* アバター */}
          <section>
            <label className="block text-sm font-medium">アバター</label>
            <div className="mt-2 flex items-center gap-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-full border bg-white">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="プレビュー" className="h-full w-full object-cover" />
                ) : avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="現在のアバター" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 via-indigo-100 to-rose-100 text-2xl text-gray-600">
                    {initialFromString(baseNameForInitial)}
                  </div>
                )}
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                  onChange={onPickFile}
                  aria-label="アバター画像を選択"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-2xl border px-4 py-2 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  画像を選ぶ
                </button>
                {errImg && <p className="mt-1 text-sm text-red-600">{errImg}</p>}
                <p className="mt-1 text-xs text-gray-500">jpeg/png/webp/avif・最大5MB</p>
              </div>
            </div>
          </section>

          {/* ニックネーム */}
          <section>
            <label className="mb-1 block text-sm font-medium">
              ニックネーム <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">必須</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={NICK_MAX}
                className={`w-full rounded-lg border px-3 py-2 pr-14 ${errNick ? 'border-red-500 focus:ring-red-400' : ''}`}
                placeholder="例）モトメルくん"
                aria-invalid={!!errNick}
              />
              <span className="pointer-events-none absolute bottom-1 right-2 text-[11px] text-gray-500 select-none">
                残り {nickRemain}
              </span>
            </div>
            {errNick && <p className="mt-1 text-sm text-red-600">{errNick}</p>}
          </section>

          {/* 自己紹介 */}
          <section>
            <label className="mb-1 block text-sm font-medium">自己紹介</label>
            <div className="relative">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={BIO_MAX}
                rows={5}
                className={`w-full rounded-lg border px-3 py-2 pr-16 ${errBio ? 'border-red-500 focus:ring-red-400' : ''}`}
                placeholder="収集ジャンルや取引の希望など"
                aria-invalid={!!errBio}
              />
              <span className="pointer-events-none absolute bottom-1 right-2 text-[11px] text-gray-500 select-none">
                残り {bioRemain}
              </span>
            </div>
            {errBio && <p className="mt-1 text-sm text-red-600">{errBio}</p>}
          </section>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {saving ? '保存中…' : '保存する'}
            </button>
            <button
              type="button"
              onClick={() => history.back()}
              className="inline-flex items-center justify-center rounded-2xl border px-4 py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              戻る
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
