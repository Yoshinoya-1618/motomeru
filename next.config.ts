// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // ← ここに直置きの serverActions は置かない
  experimental: {
    serverActions: {
      // Server Actions に対するボディ上限（既定は 1MB）
      // 例: '2mb' | '5mb' | 2_000_000 など
      bodySizeLimit: '10mb',
      // 必要ならプロキシ等の許可ドメインを追加
      // allowedOrigins: ['my-proxy.com', '*.my-proxy.com'],
    },
  },
  eslint: {
    ignoreDuringBuilds: false, // 一時的に通したい時は true でも可（戻すの推奨）
  },
}

export default nextConfig
