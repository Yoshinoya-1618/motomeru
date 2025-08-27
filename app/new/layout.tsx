import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '募集を投稿 | モトメル',
}

// ※ RootLayoutのヘッダー（Headerコンポーネント）をそのまま使うため、
// ここでは余計なヘッダーを出さずに children だけ返します。
export default function NewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
