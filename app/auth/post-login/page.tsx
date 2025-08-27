// app/auth/post-login/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SR_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

function sanitize(rel?: string) {
  if (!rel) return '/'
  return rel.startsWith('/') && !rel.startsWith('//') ? rel : '/'
}

export default async function PostLoginPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const next = sanitize(typeof sp?.next === 'string' ? sp?.next : Array.isArray(sp?.next) ? sp?.next[0] : '/')

  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  const userName = (session?.user as any)?.name as string | undefined
  if (!userId) redirect(`/auth/login?callbackUrl=${encodeURIComponent(`/auth/post-login?next=${encodeURIComponent(next)}`)}`)

  const s = createClient(SUPABASE_URL, SR_KEY, { auth: { persistSession: false } })
  const { data } = await s.from('profiles').select('display_name').eq('id', userId).maybeSingle()

  // プロフィールが無ければ会員登録（初回設定）へ
  if (!data?.display_name) {
    redirect(`/auth/signup?callbackUrl=${encodeURIComponent(next)}&prefill=${encodeURIComponent(userName || '')}`)
  }

  redirect(next)
}
