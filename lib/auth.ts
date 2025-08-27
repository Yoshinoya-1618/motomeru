// lib/auth.ts
import type { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

/**
 * MVP用：メール入力だけでログイン（パスなし）
 * - id = email
 * - name = ローカル部
 */
export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: 'Email only',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase()
        if (!email) return null
        // 超軽量バリデーション
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
        const name = email.split('@')[0]
        return { id: email, email, name }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = (user as any).id
        token.email = user.email
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      // 型は緩める（他所で any 参照しているため）
      ;(session as any).user = {
        id: token.sub as string,
        email: (token.email as string) ?? null,
        name: (token.name as string) ?? null,
      }
      return session
    },
  },
}
