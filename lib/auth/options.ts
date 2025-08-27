// lib/auth/options.ts
import type { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      id: 'email-only',
      name: 'EmailOnly',
      credentials: {
        email: { label: 'メールアドレス', type: 'email', placeholder: 'you@example.com' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase()
        if (!email || !email.includes('@')) return null
        // 簡易ユーザー
        return { id: email, email }
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: '/auth/login',
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // 初回サインイン時のみ user が入る
      if (user) {
        token.sub = user.id ?? token.sub
        token.email = user.email ?? token.email
      }
      // Google の表示名を通す
      if ((account?.provider === 'google') && (profile as any)?.name) {
        token.name = String((profile as any).name)
      }
      // 既に name がない場合、メール前半をnameにしておく（ヘッダーのM対策）
      if (!token.name && token.email) {
        token.name = String(token.email).split('@')[0]
      }
      return token
    },
    async session({ session, token }) {
      const id = (token.sub as string) || (token.email as string) || session.user?.email || ''
      if (!session.user) (session as any).user = {}
      ;(session.user as any).id = id
      ;(session.user as any).email = token.email
      if (token.name) (session.user as any).name = token.name
      return session
    },
  },
  debug: process.env.NODE_ENV !== 'production',
}
