// app/profile/edit/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

// NOTE: 実運用では NextAuth で session.user.id を使うのが安全。
// ここでは暫定として formData 経由の user_id を使います（後述の注意を必読）。
export async function updateProfile(formData: FormData) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SR_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SR_KEY) {
    throw new Error('Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  }

  const supabase = createClient(SUPABASE_URL, SR_KEY, { auth: { persistSession: false } })

  // ===== 入力値の取得（暫定） =====
  const userId = (formData.get('user_id') as string | null)?.trim() ?? ''
  const displayName = (formData.get('display_name') as string | null)?.trim() ?? ''
  const bio = (formData.get('bio') as string | null)?.trim() ?? ''
  const tags = (formData.get('tags') as string | null)?.trim() ?? ''

  // ===== 最低限のサニタイズ・NGワード =====
  const NG = ['無料', '無償', 'タダ']
  if (NG.some((w) => displayName.includes(w) || bio.includes(w))) {
    throw new Error('NGワードが含まれています')
  }
  if (!userId) {
    throw new Error('user_id is required')
  }

  // ===== Supabase へ永続化（profiles テーブル想定） =====
  // カラム例: id (pk), display_name text, bio text, tags text
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        display_name: displayName,
        bio,
        tags,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

  if (error) {
    console.error('[updateProfile] supabase error:', error)
    throw new Error(error.message)
  }

  // プロフィール表示を再生成
  revalidatePath('/profile')
  // ここで redirect('/profile') してもOK。ページ側で行うならここではしない。
}
