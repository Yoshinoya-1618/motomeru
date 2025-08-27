// app/api/events/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { EVENT_TTL_HOURS } from '@/lib/config'

export const runtime = 'nodejs'
function sb() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }) }

const Schema = z.object({
  title: z.string().min(1).max(120),
  location: z.string().max(120).optional().default(''),
  datetime: z.string().min(5),
  series: z.string().max(80).optional().default(''),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  const form = await req.formData()
  const raw = {
    title: (form.get('title') as string | null) ?? '',
    location: (form.get('location') as string | null) ?? '',
    datetime: (form.get('datetime') as string | null) ?? '',
    series: (form.get('series') as string | null) ?? '',
  }
  const p = Schema.safeParse(raw)
  if (!p.success) return NextResponse.json({ message: p.error.issues[0]?.message || 'validation error' }, { status: 400 })

  const dt = new Date(p.data.datetime)
  const expires = new Date(dt.getTime() + EVENT_TTL_HOURS * 3600 * 1000)

  const payload = {
    user_id: userId,
    title: p.data.title,
    location: p.data.location || null,
    datetime: dt.toISOString(),
    series: p.data.series || null,
    expires_at: expires.toISOString(),
    created_at: new Date().toISOString(),
  }

  const { data, error } = await sb().from('event_threads').insert(payload).select('id').maybeSingle()
  if (error) return NextResponse.json({ message: 'insert error' }, { status: 500 })

  return NextResponse.redirect(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/events/${data?.id}`, { status: 303 })
}
