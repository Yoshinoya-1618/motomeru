// app/api/profile/upload/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOW_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

function ng(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status })
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return ng('multipart/form-data を送信してください')
    }

    const form = await req.formData()
    // フロントは input name="file" で1枚送る想定
    const file = form.get('file')
    if (!(file instanceof File)) return ng('ファイルが見つかりません')

    if (!ALLOW_TYPES.includes(file.type)) {
      return ng('対応していない画像形式です（jpeg/png/webp/avif）')
    }
    if (file.size > MAX_SIZE) {
      return ng('ファイルサイズは5MB以下にしてください')
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) return ng('サーバ設定が不足しています', 500)

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    // 拡張子を保つ
    const ext = (() => {
      switch (file.type) {
        case 'image/jpeg': return 'jpg'
        case 'image/png': return 'png'
        case 'image/webp': return 'webp'
        case 'image/avif': return 'avif'
        default: return 'bin'
      }
    })()
    const key = `avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    // Storage: avatars バケット（公開想定）
    const { data, error } = await supabase.storage.from('avatars').upload(key, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    })
    if (error) return ng(`アップロードに失敗しました: ${error.message}`, 500)

    // 公開URL
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(data.path)
    const url = pub?.publicUrl
    if (!url) return ng('公開URLの取得に失敗しました', 500)

    return NextResponse.json({ ok: true, url })
  } catch (e: any) {
    return ng(String(e?.message || e), 500)
  }
}
