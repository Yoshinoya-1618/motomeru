import './globals.css'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import AuthProvider from '@/components/providers/AuthProvider'
import SiteHeader from '@/components/header/SiteHeader'
import SiteFooter from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: 'モトメル',
  description: '買いたい・交換の投稿から始まるマーケットプレイス',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-white text-gray-900">
        {/* Server → Client の境界を明確化して next-auth を安全に提供 */}
        <AuthProvider>
          <Suspense fallback={null}>
            <SiteHeader />
          </Suspense>
          {children}
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  )
}
