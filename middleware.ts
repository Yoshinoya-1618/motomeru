// middleware.ts
export { default } from 'next-auth/middleware'

/**
 * 認証が必要なルートだけを列挙
 * - /profile（マイページ/編集）
 * - /new（Wanted投稿）
 * - /swap/new（Swap投稿）
 * - /events/new（当日スレ作成）
 * - /notifications（通知）
 */
export const config = {
  matcher: [
    '/profile',
    '/profile/:path*',
    '/new',
    '/swap/new',
    '/events/new',
    '/notifications',
  ],
}
