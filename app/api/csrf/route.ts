// app/api/csrf/route.ts
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function randomToken(bytes = 32) {
  // @ts-ignore
  const buf = crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(bytes)) : require('crypto').randomBytes(bytes)
  if (buf instanceof Uint8Array) {
    return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
  }
  return buf.toString('hex')
}

export async function GET() {
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const secure = proto === 'https'

  const token = randomToken(32)
  const res = NextResponse.json({ csrfToken: token })
  res.cookies.set('csrfToken', token, {
    httpOnly: true,        // JSからは読ませない（送信値とCookie照合で使う）
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 60 * 2,   // 2h
  })
  return res
}
