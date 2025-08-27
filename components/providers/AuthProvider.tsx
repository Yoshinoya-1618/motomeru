'use client'

import { SessionProvider } from 'next-auth/react'
import type { ReactNode } from 'react'

export default function AuthProvider({ children }: { children: ReactNode }) {
  // next-auth の SessionProvider は Client でのみ使用可能
  return <SessionProvider>{children}</SessionProvider>
}
