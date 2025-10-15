import NextAuth, { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: 'guest' | 'member' | 'editor' | 'admin'
      membershipTier?: string
    } & DefaultSession['user']
  }

  interface User {
    id: string
    email: string
    name: string | null
    role: 'guest' | 'member' | 'editor' | 'admin'
    membershipTier?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'guest' | 'member' | 'editor' | 'admin'
    membershipTier?: string
  }
}
