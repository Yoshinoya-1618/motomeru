// app/notifications/page.tsx
import React from 'react'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
function sb() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }) }

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/auth/login?callbackUrl=/notifications')
  const userId = (session.user as any).id as string

  const { data } = await sb().from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)

  return (
    <main className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">通知</h1>
      <ul className="space-y-2">
        {(data || []).map((n) => (
          <li key={n.id} className="rounded-lg border px-3 py-2 text-sm">
            <span className="mr-2 inline-block rounded bg-gray-900 px-2 py-0.5 text-xs font-semibold text-white">{n.type}</span>
            <span className="text-gray-800">{JSON.stringify(n.payload)}</span>
            <span className="ml-2 text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </main>
  )
}
