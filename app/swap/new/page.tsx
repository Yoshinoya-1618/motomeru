import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import NewSwapForm from '@/components/NewSwapForm'
import BackToPrev from '@/components/BackToPrev'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function Page() {
  // ログインガード
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) {
    const next = encodeURIComponent('/swap/new')
    redirect(
      `/auth/login?callbackUrl=${encodeURIComponent(
        `/auth/post-login?next=${next}`,
      )}`,
    )
  }

  // CSRFトークン（Cookieから取得／無ければ空文字）
  const store = await cookies()
  const csrf = store.get('csrfToken')?.value ?? ''

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      {/* ページ左上：枠なしの大きめ戻る矢印 */}
      <BackToPrev className="mb-2" />

      <h1 className="mb-4 text-2xl font-semibold">交換を募集</h1>
      <p className="mb-3 text-sm text-gray-600">
        交換条件をできるだけ具体的に。送料負担や受け渡し方法も書くとスムーズです。
      </p>
      <NewSwapForm csrfToken={csrf} />
    </main>
  )
}
