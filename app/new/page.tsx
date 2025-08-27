// app/new/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import NewWantedForm from '@/components/NewWantedForm'
import BackToPrev from '@/components/BackToPrev'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function Page() {
  // ログインガード
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) {
    const next = encodeURIComponent('/new')
    redirect(
      `/auth/login?callbackUrl=${encodeURIComponent(
        `/auth/post-login?next=${next}`,
      )}`,
    )
  }

  // CSRFトークンは props ではなく Cookie から取得
  const store = await cookies()
  const csrf = store.get('csrfToken')?.value ?? ''

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      {/* ページ左上：枠なしの大きめ戻る矢印 */}
      <BackToPrev className="mb-2" />

      <h1 className="mb-4 text-2xl font-semibold">買いたいを投稿</h1>
      <p className="mb-3 text-sm text-gray-600">
        予算の目安を「上限」で入力してください。条件の詳細は説明欄にご記入ください。
      </p>
      {/* ここでだけ子に渡す（Page は props を持たない） */}
      <NewWantedForm csrfToken={csrf} />
    </main>
  )
}
