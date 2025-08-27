// app/auth/signup/page.tsx
import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: '会員登録 | モトメル' }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SR_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const Schema = z.object({
  nickname: z.string().trim().min(1, '表示名を入力してください').max(20, '表示名は20文字までです'),
  bio: z.string().trim().max(1000, '自己紹介は1000文字までです').optional().transform(v => v ?? ''),
})

function sanitize(rel?: string) { return rel && rel.startsWith('/') && !rel.startsWith('//') ? rel : '/' }
function s(v: unknown) { return typeof v === 'string' ? v : Array.isArray(v) && typeof v[0] === 'string' ? v[0] : undefined }

async function submit(formData: FormData) {
  'use server'
  const spRaw = formData.get('callbackUrl')
  const callbackUrl = sanitize(typeof spRaw === 'string' ? spRaw : undefined)

  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) redirect(`/auth/login?callbackUrl=${encodeURIComponent(`/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`)}`)

  const nickname = (formData.get('nickname') as string | null) ?? ''
  const bio = (formData.get('bio') as string | null) ?? ''
  const parsed = Schema.safeParse({ nickname, bio })
  if (!parsed.success) {
    const msg = parsed.error.errors.map(e => e.message).join(' / ')
    redirect(`/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}&error=${encodeURIComponent(msg)}&prefill=${encodeURIComponent(nickname)}`)
  }

  const sclient = createClient(SUPABASE_URL, SR_KEY, { auth: { persistSession: false } })
  const { error } = await sclient.from('profiles').upsert({
    id: userId,
    display_name: parsed.data.nickname,
    bio: parsed.data.bio,
  }, { onConflict: 'id' })

  if (error) {
    console.error('[signup.upsert] error:', error)
    redirect(`/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}&error=${encodeURIComponent('保存に失敗しました')}&prefill=${encodeURIComponent(nickname)}`)
  }

  redirect(callbackUrl)
}

export default async function SignupPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) redirect('/auth/login?callbackUrl=/auth/signup')

  const sp = await searchParams
  const callbackUrl = sanitize(s(sp?.callbackUrl)) || '/'
  const error = s(sp?.error)
  const prefill = s(sp?.prefill) || (session?.user as any)?.name || ''

  return (
    <main className="mx-auto max-w-sm px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">会員登録（初回プロフィール設定）</h1>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form action={submit} className="space-y-4 rounded-xl border p-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <div>
          <label htmlFor="nickname" className="mb-2 block text-sm font-medium">表示名</label>
          <input id="nickname" name="nickname" type="text" defaultValue={prefill} maxLength={20} required className="w-full rounded-lg border px-3 py-2" />
        </div>
        <div>
          <label htmlFor="bio" className="mb-2 block text-sm font-medium">自己紹介（任意）</label>
          <textarea id="bio" name="bio" rows={6} maxLength={1000} className="w-full rounded-lg border px-3 py-2" placeholder="取引ポリシーや推しタグなど" />
        </div>
        <button type="submit" className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-white">登録してはじめる</button>
      </form>
    </main>
  )
}
