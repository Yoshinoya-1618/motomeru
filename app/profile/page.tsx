import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'プロフィール | モトメル',
  description: 'あなたのプロフィール情報',
}

type Profile = {
  nickname?: string | null
  bio?: string | null
  avatar_url?: string | null
  updated_at?: string | null
}

/** 多言語対応の先頭グラフェムを返す。ASCII 英字のみ大文字化。 */
function initialFromGrapheme(input?: string | null) {
  const t = (input ?? '').trim()
  if (!t) return 'M'
  try {
    // 先頭のグラフェム（絵文字・合成文字も1文字として扱う）
    // @ts-ignore: Intl.Segmenter は最新環境で標準
    const seg = new Intl.Segmenter('ja-JP', { granularity: 'grapheme' })
    const iter = seg.segment(t)[Symbol.iterator]()
    const first = iter.next().value?.segment as string | undefined
    if (!first) return 'M'
    // 英字のみ大文字化、それ以外はそのまま
    return /^[a-z]$/i.test(first) ? first.toUpperCase() : first
  } catch {
    const c = t[0]!
    return /^[a-z]$/i.test(c) ? c.toUpperCase() : c
  }
}

async function fetchProfileWithCookie(cookie: string): Promise<Profile | null> {
  try {
    const res = await fetch('/api/profile', { cache: 'no-store', headers: { cookie } })
    if (!res.ok) return null
    const j = await res.json().catch(() => null)
    return (j?.profile ?? null) as Profile | null
  } catch {
    return null
  }
}

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> }

export default async function Page({ searchParams }: PageProps) {
  const sp = await searchParams
  const updated = (typeof sp?.updated === 'string' ? sp.updated : undefined) === '1'

  // セッション（メールアドレスの表示に使用）
  const session = await getServerSession(authOptions)
  const email = (session?.user?.email as string) || ''

  // Next.js 15: headers() は Promise。await してから cookie を取る
  const h = await headers()
  const cookie = h.get('cookie') ?? ''

  // DBプロフィール（nickname / avatar_url 優先）
  const profile = await fetchProfileWithCookie(cookie)

  // 表示名の優先度：nickname → session.user.name → email
  const displayName =
    (profile?.nickname && profile.nickname.trim()) ||
    ((session?.user?.name as string) || '') ||
    email ||
    ''

  const avatarUrl = profile?.avatar_url || null
  const initial = initialFromGrapheme(displayName || email)

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {updated && (
        <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          プロフィールを更新しました。
        </div>
      )}

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <header className="flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full border bg-white">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="アバター" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 via-indigo-100 to-rose-100 text-2xl text-gray-700">
                {initial}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-xl font-bold">
              {displayName || 'ニックネーム未設定'}
            </h1>
            {/* ログイン方法に関わらず、メールアドレスを表示 */}
            <p className="mt-1 text-sm text-gray-600">{email || '未ログイン'}</p>
          </div>

          <div className="ml-auto">
            <Link href="/profile/edit" className="rounded-2xl border px-4 py-2 text-sm hover:bg-gray-50" prefetch={false}>
              編集する
            </Link>
          </div>
        </header>

        {profile?.bio && (
          <section className="mt-6">
            <h2 className="mb-2 text-base font-semibold">自己紹介</h2>
            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">{profile.bio}</p>
          </section>
        )}

        <section className="mt-6">
          <h2 className="mb-2 text-base font-semibold">クイックリンク</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Link href="/mypage" className="rounded-xl border p-3 text-center text-sm hover:bg-gray-50" prefetch={false}>
              マイページ
            </Link>
            <Link href="/search?tab=wanted" className="rounded-xl border p-3 text-center text-sm hover:bg-gray-50" prefetch={false}>
              買いたいを探す
            </Link>
            <Link href="/new" className="rounded-xl border p-3 text-center text-sm hover:bg-gray-50" prefetch={false}>
              買いたいを投稿
            </Link>
            <Link href="/swap/new" className="rounded-xl border p-3 text-center text-sm hover:bg-gray-50" prefetch={false}>
              交換を募集
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
