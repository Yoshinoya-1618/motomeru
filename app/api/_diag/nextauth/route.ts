import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const secretSet = Boolean(process.env.NEXTAUTH_SECRET)
    const urlSet = Boolean(process.env.NEXTAUTH_URL) // trustHost:true なら未設定でも動く
    const googleIdSet = Boolean(process.env.GOOGLE_CLIENT_ID)
    const googleSecretSet = Boolean(process.env.GOOGLE_CLIENT_SECRET)

    return NextResponse.json({
      ok: true,
      env: {
        NEXTAUTH_SECRET: secretSet,
        NEXTAUTH_URL: urlSet,
        GOOGLE_CLIENT_ID: googleIdSet,
        GOOGLE_CLIENT_SECRET: googleSecretSet,
      },
      hints: [
        '開発: NEXTAUTH_URL は http://localhost:3000',
        '本番: NEXTAUTH_URL は https://<本番ドメイン>',
        'Google: Redirect URI は /api/auth/callback/google を dev/prod それぞれ登録',
        'PreviewでGoogleを使う場合は固定のステージングドメインを用意して登録',
      ],
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
