// app/api/wanted/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BUCKET = process.env.NEXT_PUBLIC_IMAGE_BUCKET || 'images'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FILES = 5

function publicUrl(path: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

function parseStoragePathFromPublicUrl(url: string): { ok: boolean; path?: string; bucket?: string } {
  try {
    const u = new URL(url)
    const idx = u.pathname.indexOf('/storage/v1/object/public/')
    if (idx === -1) return { ok: false }
    const rest = u.pathname.slice(idx + '/storage/v1/object/public/'.length)
    const [bucket, ...seg] = rest.split('/')
    return { ok: true, bucket, path: seg.join('/') }
  } catch {
    return { ok: false }
  }
}

function sameOriginOK(req: NextRequest) {
  const origin = req.headers.get('origin') || ''
  const referer = req.headers.get('referer') || ''
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  const expected = `${proto}://${host}`
  return origin === expected || (referer && referer.startsWith(expected))
}

// CSRF：CookieにcsrfTokenがある場合のみ厳密照合。
// ただし「トークン一致 or same-origin」なら通す（後方互換モード）。
async function getVerifiedFormData(req: NextRequest): Promise<FormData | false | 'UNSUPPORTED'> {
  const ct = req.headers.get('content-type') || ''
  if (!ct.includes('multipart/form-data')) return 'UNSUPPORTED'
  const fd = await req.formData()

  const ck = await cookies()
  const cookieCsrf = ck.get('csrfToken')?.value
  if (!cookieCsrf) return fd // Cookieが無ければ照合しない

  const supplied = (fd.get('csrfToken') as string) || req.headers.get('x-csrf-token') || undefined
  if (supplied && supplied === cookieCsrf) return fd
  if (sameOriginOK(req)) return fd
  return false
}

export async function POST(req: NextRequest) {
  try {
    // 認証
    const session: any = await getServerSession()
    const userId = session?.user?.id || session?.user?.email
    if (!userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    // CSRF + 受信
    const v = await getVerifiedFormData(req)
    if (v === 'UNSUPPORTED') return NextResponse.json({ ok: false, error: 'UNSUPPORTED_CONTENT_TYPE' }, { status: 415 })
    if (v === false) return NextResponse.json({ ok: false, error: 'CSRF_MISMATCH' }, { status: 403 })
    const fd = v as FormData

    // files/file/images/image のいずれでも受け付ける
    const files: File[] = [
      ...fd.getAll('files'),
      ...fd.getAll('file'),
      ...fd.getAll('images'),
      ...fd.getAll('image'),
    ].filter((x): x is File => x instanceof File)

    if (!files.length) return NextResponse.json({ ok: false, error: 'NO_FILES' }, { status: 400 })
    if (files.length > MAX_FILES) return NextResponse.json({ ok: false, error: 'TOO_MANY_FILES' }, { status: 413 })

    const urls: string[] = []
    for (const file of files) {
      if (!ALLOWED.has(file.type)) return NextResponse.json({ ok: false, error: 'UNSUPPORTED_MIME' }, { status: 415 })
      if (file.size > MAX_SIZE) return NextResponse.json({ ok: false, error: 'FILE_TOO_LARGE' }, { status: 413 })

      const ext =
        file.type === 'image/jpeg' ? 'jpg' :
        file.type === 'image/png'  ? 'png' :
        file.type === 'image/webp' ? 'webp' :
        file.type === 'image/avif' ? 'avif' : 'bin'
      const key = `wanted/${encodeURIComponent(String(userId))}/${crypto.randomUUID()}.${ext}`

      const buf = Buffer.from(await file.arrayBuffer())
      const { error } = await supabase.storage.from(BUCKET).upload(key, buf, {
        contentType: file.type,
        upsert: false,
      })
      if (error) {
        console.error('[wanted/upload] supabase error', error)
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      }
      urls.push(publicUrl(key))
      if (urls.length >= MAX_FILES) break
    }

    return NextResponse.json({ ok: true, urls })
  } catch (e: any) {
    console.error('[wanted/upload] error', e)
    return NextResponse.json({ ok: false, error: 'Unhandled error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session: any = await getServerSession()
    const userId = session?.user?.id || session?.user?.email
    if (!userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const url = searchParams.get('url')
    if (!url) return NextResponse.json({ ok: false, error: 'MISSING_URL' }, { status: 400 })

    const parsed = parseStoragePathFromPublicUrl(url)
    if (!parsed.ok || parsed.bucket !== BUCKET || !parsed.path?.startsWith(`wanted/${String(userId)}/`)) {
      return NextResponse.json({ ok: false, error: 'INVALID_PATH' }, { status: 400 })
    }

    const { error } = await supabase.storage.from(BUCKET).remove([parsed.path!])
    if (error) {
      console.error('[wanted/upload DELETE] supabase error', error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[wanted/upload DELETE] error', e)
    return NextResponse.json({ ok: false, error: 'Unhandled error' }, { status: 500 })
  }
}
