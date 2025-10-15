import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  // adapter: PrismaAdapter(prisma), // Temporarily remove to fix webpack error
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt', // Use JWT strategy
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    // Demo Credentials Provider (development only)
    {
      id: 'demo',
      name: 'Demo Login',
      type: 'credentials' as const,
      credentials: {
        role: { label: 'Role', type: 'text' }
      },
        async authorize(credentials: any) {
          try {
            console.log('Authorize called with:', credentials)
            if (!credentials?.role) {
              return null
            }
            
            const role = credentials.role as 'member' | 'admin'
            
            // Simple demo user without database operations
            const user = {
              id: `demo-${role}-${Date.now()}`,
              email: `demo-${role}@example.com`,
              name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`,
              role: role,
              membershipTier: role === 'admin' ? 'T3' : 'T2',
            }
            
            console.log('Returning user:', user)
            return user
          } catch (error) {
            console.error('Demo login error:', error)
            return null
          }
        }
    }
  ],
  callbacks: {
    async jwt({ token, user }) {
      console.log('JWT callback called:', { token, user })
      if (user) {
        token.sub = user.id
        token.role = (user as any).role
        token.membershipTier = (user as any).membershipTier || 'T1'
        token.email = user.email
        token.name = user.name
      }
      console.log('JWT token after update:', token)
      return token
    },
    
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as 'guest' | 'member' | 'editor' | 'admin'
        session.user.membershipTier = token.membershipTier as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-key-for-local-development-only',
  debug: process.env.NODE_ENV === 'development'
}
