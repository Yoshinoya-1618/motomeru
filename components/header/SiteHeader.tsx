'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, FormEvent, Suspense } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'

type Profile = { nickname?: string | null; avatar_url?: string | null }

/** 多言語対応の先頭グラフェムを返す。ASCII 英字のみ大文字化。 */
function initialFromGrapheme(input?: string | null) {
  const t = (input ?? '').trim()
  if (!t) return 'M'
  try {
    // @ts-ignore
    const seg = new Intl.Segmenter('ja-JP', { granularity: 'grapheme' })
    const iter = seg.segment(t)[Symbol.iterator]()
    const first = iter.next().value?.segment as string | undefined
    if (!first) return 'M'
    return /^[a-z]$/i.test(first) ? first.toUpperCase() : first
  } catch {
    const c = t[0]!
    return /^[a-z]$/i.test(c) ? c.toUpperCase() : c
  }
}

export default function SiteHeader() {
  const ses = (useSession as any)?.() as { data?: any; status?: 'loading'|'authenticated'|'unauthenticated' } | undefined
  const session = ses?.data ?? null
  const status = ses?.status ?? 'unauthenticated'
  const isLoading = status === 'loading'
  const isAuthed = Boolean(session?.user)

  const pathname = usePathname()
  const cbUrl = useMemo(() => pathname || '/', [pathname])

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)

  async function loadProfile() {
    if (!isAuthed) { setProfile(null); return }
    try {
      setLoadingProfile(true)
      const res = await fetch('/api/profile', { cache: 'no-store' })
      if (res.ok) {
        const j = await res.json().catch(() => null)
        setProfile(j?.profile ?? null)
      }
    } finally {
      setLoadingProfile(false)
    }
  }

  useEffect(() => { if (isAuthed) loadProfile(); else setProfile(null) }, [isAuthed])

  // プロフィール更新イベントを監視
  useEffect(() => {
    const onUpdated = () => loadProfile()
    const onStorage = (e: StorageEvent) => { if (e.key === 'motomeru:profile:updated_at') loadProfile() }
    window.addEventListener('motomeru:profile:updated' as any, onUpdated)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('motomeru:profile:updated' as any, onUpdated)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // 表示名の優先度：nickname → session.user.name → session.user.email
  const displayName =
    (profile?.nickname && profile.nickname.trim()) ||
    (session?.user?.name as string) ||
    (session?.user?.email as string) ||
    ''

  const avatarUrl = profile?.avatar_url || null
  const initial = initialFromGrapheme(displayName || (session?.user?.email as string) || '')

  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
        {/* Left: Brand */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2" prefetch={false}>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">M</span>
            <span className="text-base font-bold">モトメル</span>
          </Link>
        </div>

        {/* Center: Search（Suspense で包む） */}
        <Suspense
          fallback={
            <div className="hidden sm:flex items-center gap-2 flex-1 justify-center">
              <input
                disabled
                placeholder="検索"
                className="w-full max-w-md rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-400"
              />
              <button
                disabled
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-400"
              >
                検索
              </button>
            </div>
          }
        >
          <HeaderSearch />
        </Suspense>

        {/* Right: Actions */}
        <div className="ml-auto flex items-center gap-3">
          {isAuthed ? (
            <>
              <Link
                href="/new"
                prefetch={false}
                className="hidden sm:inline-flex items-center rounded-2xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                買いたいを投稿
              </Link>
              {/* 募集ボタンは amber 塗り */}
              <Link
                href="/swap/new"
                prefetch={false}
                className="hidden sm:inline-flex items-center rounded-2xl bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                交換を募集
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={() => (window.location.href = '/new')}
                className="hidden sm:inline-flex items-center rounded-2xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                買いたいを投稿
              </button>
              <button
                onClick={() => (window.location.href = '/swap/new')}
                className="hidden sm:inline-flex items-center rounded-2xl bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                交換を募集
              </button>
              <button
                onClick={() => signIn(undefined, { callbackUrl: cbUrl })}
                className="text-sm text-gray-700 hover:underline"
                title="会員登録（ログイン画面へ）"
              >
                会員登録
              </button>
              <button
                onClick={() => signIn(undefined, { callbackUrl: cbUrl })}
                className="text-sm text-gray-700 hover:underline"
              >
                ログイン
              </button>
            </>
          )}

          {/* Account */}
          {isLoading || loadingProfile ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
          ) : isAuthed ? (
            <ProfileMenu avatarUrl={avatarUrl} initial={initial} />
          ) : null}
        </div>
      </div>
    </header>
  )
}

/** 検索フォーム（useSearchParams をこの中で使用） */
function HeaderSearch() {
  const router = useRouter()
  const sp = useSearchParams()
  const [q, setQ] = useState(sp?.get('q') ?? '')

  useEffect(() => { setQ(sp?.get('q') ?? '') }, [sp])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const qs = new URLSearchParams()
    if (q.trim()) qs.set('q', q.trim())
    router.push(`/search?${qs.toString()}`)
  }

  return (
    <form onSubmit={onSubmit} className="hidden sm:flex items-center gap-2 flex-1 justify-center">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="検索（例：ポケカ シャイニートレジャー）"
        aria-label="検索キーワード"
        className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <button
        type="submit"
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        検索
      </button>
    </form>
  )
}

function ProfileMenu({ avatarUrl, initial }: { avatarUrl: string | null; initial: string }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!open) return
      const t = e.target as Node
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (open && e.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', onDown); window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border bg-white text-sm font-bold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        aria-haspopup="menu" aria-expanded={open} aria-label="アカウントメニュー"
      >
        {avatarUrl
          ? <img src={avatarUrl} alt="アバター" className="h-full w-full object-cover" />
          : initial}
      </button>

      {open && (
        <div ref={menuRef} role="menu" className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border bg-white shadow-lg">
          <Link href="/mypage" prefetch={false} className="block px-4 py-2 text-sm hover:bg-gray-50" role="menuitem" onClick={() => setOpen(false)}>マイページ</Link>
          <Link href="/profile" prefetch={false} className="block px-4 py-2 text-sm hover:bg-gray-50" role="menuitem" onClick={() => setOpen(false)}>プロフィール</Link>
          <div className="my-1 h-px bg-gray-100" />
          <button role="menuitem" onClick={() => { setOpen(false); signOut({ callbackUrl: '/' }) }} className="block w-full px-4 py-2 text-left text-sm font-semibold text-blue-600 hover:bg-blue-50">
            ログアウト
          </button>
        </div>
      )}
    </div>
  )
}
