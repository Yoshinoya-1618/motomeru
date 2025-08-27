// app/api/swap/upload/route.ts
import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const UPLOAD_BUCKET = process.env.UPLOAD_BUCKET || 'uploads' // 任意で .env から指定
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif',
])

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function verifyCsrf(fd: FormData) {
  const ck = await cookies()
  const cookieToken = ck.get('csrfToken')?.value || ''
  const formToken = (fd.get('csrfToken') || fd.get('csrf_token') || fd.get('csrf') || '').toString()
  if (!cookieToken || !formToken || cookieToken !== formToken) {
    return false
  }
  return true
}

function randName() {
  // @ts-ignore
  const id = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))
  return id.replace(/[^a-z0-9-]/gi, '')
}
function extractPathFromPublicUrl(url: string) {
  // 例: https://<proj>.supabase.co/storage/v1/object/public/<bucket>/swap/xxx.jpg
  const m = url.match(/\/object\/public\/[^/]+\/(.+)$/)
  return m ? m[1] : ''
}

export async function POST(req: Request) {
  const fd = await req.formData()
  if (!(await verifyCsrf(fd))) {
    return NextResponse.json({ error: 'CSRF token mismatch' }, { status: 403 })
  }

  const file = fd.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file がありません' }, { status: 400 })
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: '対応形式は JPEG/PNG/WebP/AVIF/HEIC です' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: '画像サイズは最大5MBまでです' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const path = `swap/${Date.now()}_${randName()}_${file.name}`

  const { error: upErr } = await supabase
    .storage
    .from(UPLOAD_BUCKET)
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false })

  if (upErr) {
    return NextResponse.json({ error: upErr.message || 'アップロードに失敗しました' }, { status: 500 })
  }

  const { data: pub } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(path)
  const publicUrl = pub?.publicUrl
  if (!publicUrl) {
    return NextResponse.json({ error: '公開URLの取得に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, url: publicUrl })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url') || ''
  if (!url) return NextResponse.json({ error: 'url がありません' }, { status: 400 })
  const path = extractPathFromPublicUrl(url)
  if (!path) return NextResponse.json({ error: '削除対象の特定に失敗しました' }, { status: 400 })

  const { error } = await supabase.storage.from(UPLOAD_BUCKET).remove([path])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
