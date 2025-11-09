import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { verifyPassword } from '@/lib/password'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma), // Used for OAuth providers only
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt', // Use JWT strategy (stateless, scalable)
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    // Google OAuth (if configured)
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    
    // Email Magic Link (if configured)
    ...(env.EMAIL_SERVER && env.EMAIL_FROM
      ? [
          EmailProvider({
            server: env.EMAIL_SERVER,
            from: env.EMAIL_FROM,
          }),
        ]
      : []),
    
    // Credentials Provider (Email & Password)
    CredentialsProvider({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          // Log failed attempt (non-blocking)
          if (credentials?.email) {
            prisma.loginAttempt.create({
              data: {
                email: credentials.email,
                success: false,
                reason: 'Missing email or password',
              },
            }).catch(() => {
              // Don't block login if logging fails
            })
          }
          return null
        }

        try {
          // Check account lockout
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              name: true,
              passwordHash: true,
              role: true,
              isActive: true,
              emailVerified: true,
              lockedUntil: true,
              failedLoginAttempts: true,
              image: true, // Add image field
            },
          })

          if (!user || !user.passwordHash) {
            // Don't reveal if user exists - log attempt (non-blocking)
            prisma.loginAttempt.create({
              data: {
                email: credentials.email,
                success: false,
                reason: 'Invalid credentials',
              },
            }).catch(() => {
              // Don't block if logging fails
            })
            return null
          }

          // Check if account is locked
          if (user.lockedUntil && user.lockedUntil > new Date()) {
            const lockoutMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
            logger.warn('Login attempt on locked account', {
              email: credentials.email,
              lockedUntil: user.lockedUntil,
            })
            
            // Log locked account attempt (non-blocking)
            prisma.loginAttempt.create({
              data: {
                email: credentials.email,
                success: false,
                reason: `Account locked for ${lockoutMinutes} more minutes`,
              },
            }).catch(() => {})
            
            // Return null instead of throwing - NextAuth handles null as failed auth
            return null
          }

          // Check if account is active
          if (!user.isActive) {
            prisma.loginAttempt.create({
              data: {
                email: credentials.email,
                success: false,
                reason: 'Account disabled',
              },
            }).catch(() => {})
            // Return null instead of throwing - NextAuth handles null as failed auth
            return null
          }

          // Verify password
          const isValid = await verifyPassword(credentials.password, user.passwordHash)

          // Log login attempt (non-blocking)
          prisma.loginAttempt.create({
            data: {
              email: credentials.email,
              success: isValid,
              reason: isValid ? null : 'Invalid password',
            },
          }).catch(() => {
            // Don't block login if logging fails
          })

          if (!isValid) {
            // Increment failed attempts (non-blocking)
            const failedAttempts = (user.failedLoginAttempts || 0) + 1
            const shouldLock = failedAttempts >= 5
            
            prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: failedAttempts,
                // Lock account for 15 minutes after 5 failed attempts
                lockedUntil: shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null,
              },
            }).catch(() => {
              // Don't block login if update fails
            })

            if (shouldLock) {
              logger.warn('Account locked due to failed login attempts', {
                userId: user.id,
                email: credentials.email,
                failedAttempts,
              })
            }

            return null
          }

          // Reset failed attempts on successful login (non-blocking)
          if (user.failedLoginAttempts > 0 || user.lockedUntil) {
            prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
              },
            }).catch(() => {
              // Don't block login if update fails
            })
          }

          // Get user's membership
          const membership = await prisma.membership.findUnique({
            where: { userId: user.id },
            select: { tier: true },
          })

          // Update last login (non-blocking)
          prisma.user.update({
            where: { id: user.id },
            data: {
              lastLoginAt: new Date(),
              loginCount: { increment: 1 },
            },
          }).catch(() => {
            // Don't block login if update fails
          })

          logger.info('Credentials login successful', {
            userId: user.id,
            email: user.email,
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image, // Add image field
            role: user.role as 'guest' | 'member' | 'editor' | 'admin',
            membershipTier: membership?.tier || 'T1',
          }
        } catch (error) {
          logger.error(
            'Credentials login error',
            error instanceof Error ? error : new Error(String(error)),
            { email: credentials.email }
          )
          
          // Log error attempt (non-blocking)
          prisma.loginAttempt.create({
            data: {
              email: credentials.email,
              success: false,
              reason: error instanceof Error ? error.message : 'Unknown error',
            },
          }).catch(() => {})
          
          return null
        }
      },
    }),
    
    // Demo provider (development only)
    ...(env.NODE_ENV !== 'production'
      ? [
          {
            id: 'demo',
            name: 'Demo Login',
            type: 'credentials' as const,
            credentials: {
              role: { label: 'Role', type: 'text' }
            },
            async authorize(credentials: any) {
              const role = credentials?.role as 'member' | 'admin' | undefined
              
              try {
                if (!role) {
                  return null
                }
                
                // ✅ Wrap user + membership creation in transaction for atomicity
                const { demoUser, membership } = await prisma.$transaction(async (tx) => {
                  const user = await tx.user.upsert({
                    where: { email: `demo-${role}@example.com` },
                    update: {},
                    create: {
                      email: `demo-${role}@example.com`,
                      name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`,
                      role: role,
                      emailVerified: new Date(),
                    },
                  })
                  
                  const mem = await tx.membership.upsert({
                    where: { userId: user.id },
                    update: { 
                      tier: role === 'admin' ? 'T3' : 'T2', 
                      status: 'active' 
                    },
                    create: {
                      userId: user.id,
                      tier: role === 'admin' ? 'T3' : 'T2',
                      status: 'active',
                    },
                  })
                  
                  return { demoUser: user, membership: mem }
                })
                
                return {
                  id: demoUser.id,
                  email: demoUser.email,
                  name: demoUser.name,
                  role: demoUser.role as 'member' | 'admin',
                  membershipTier: membership.tier,
                }
              } catch (error) {
                // ✅ Improved error handling with logger
                logger.error(
                  'Demo login error',
                  error instanceof Error ? error : new Error(String(error)),
                  { attemptedRole: role }
                )
                return null
              }
            }
          },
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in - user object provided
      if (user) {
        logger.info('JWT callback - initial sign in', { 
          userId: user.id, 
          email: user.email,
          hasRole: !!(user as any).role,
          hasMembershipTier: !!(user as any).membershipTier
        })
        
        token.sub = user.id
        token.email = user.email
        token.name = user.name
        token.role = (user as any).role || 'guest'
        token.membershipTier = (user as any).membershipTier || 'T1'
        token.picture = user.image
        token.lastRefreshed = Math.floor(Date.now() / 1000)
        
        logger.info('JWT token created', { 
          sub: token.sub, 
          role: token.role, 
          membershipTier: token.membershipTier 
        })
        
        return token
      }

      // ✅ Refresh user data from database (every 5 minutes)
      const now = Math.floor(Date.now() / 1000)
      const lastRefreshed = (token.lastRefreshed as number) || 0
      
      if (now - lastRefreshed < 300) {
        // Return cached token (refreshed recently)
        return token
      }

      // ✅ Fetch fresh user data from database
      if (token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            include: {
              memberships: {
                where: { status: 'active' },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          })

          if (dbUser) {
            token.role = dbUser.role as 'guest' | 'member' | 'editor' | 'admin'
            token.membershipTier = dbUser.memberships[0]?.tier || 'T1'
            token.name = dbUser.name
            token.email = dbUser.email
            token.picture = dbUser.image
            token.lastRefreshed = now
          }
        } catch (error) {
          // ✅ Improved error handling with logger
          logger.error(
            'Error refreshing user data from database',
            error instanceof Error ? error : new Error(String(error)),
            { userId: token.sub }
          )
          // Returns cached token to prevent auth failure
          // Will retry on next request (within 5 min window)
        }
      }

      return token
    },
    
    async session({ session, token }) {
      try {
        if (token && session?.user) {
          session.user.id = (token.sub as string) || ''
          session.user.email = (token.email as string) || ''
          session.user.name = (token.name as string) || ''
          session.user.role = (token.role as 'guest' | 'member' | 'editor' | 'admin') || 'guest'
          session.user.membershipTier = (token.membershipTier as string) || 'T1'
          session.user.image = (token.picture as string | null) || null
        }
        return session
      } catch (error) {
        logger.error(
          'Session callback error',
          error instanceof Error ? error : new Error(String(error)),
          { tokenSub: token?.sub }
        )
        // Return session even if there's an error to prevent 500
        return session
      }
    },
    
    // ✅ Link OAuth account to user
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' || account?.provider === 'email') {
        // PrismaAdapter handles account linking automatically
        return true
      }
      return true
    },
  },
  secret: env.NEXTAUTH_SECRET,
  debug: env.NODE_ENV === 'development',
  // Explicitly configure cookies to ensure they're set correctly
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
}
