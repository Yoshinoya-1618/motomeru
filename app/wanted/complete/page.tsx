// app/wanted/complete/page.tsx (Server Component wrapper)
import { headers } from 'next/headers'
import CompleteClient from './CompleteClient'

export const runtime = 'nodejs'
export const revalidate = 0
export const dynamic = 'force-dynamic'

async function getBase(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const sp = await searchParams
  const id = sp?.id ?? ''
  const base = await getBase()
  return <CompleteClient id={id} base={base} />
}
