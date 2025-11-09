# 🔒 Authentication & Security Fix Plan (REVISED)

**Date:** December 2024  
**Status:** ✅ **REVIEWED & CORRECTED**  
**Goal:** Secure authentication system and fix all critical security issues

---

## 🔍 Professional Review Findings

### Critical Corrections Made:

1. **PrismaAdapter Clarification**: Can work WITH JWT strategy - adapter is for OAuth account linking, not session storage
2. **CSRF Protection**: NextAuth handles CSRF automatically - custom implementation is redundant/incorrect
3. **Priority Order**: Credentials removal must be FIRST (before any other changes)
4. **Session Strategy**: JWT strategy is correct for scalability - don't need database sessions
5. **Demo Provider**: Must be conditional on `NODE_ENV !== 'production'`

---

## 📋 REVISED Implementation Plan

### **PHASE 0: Immediate Credentials Security** (Priority: 🔴 URGENT - Do FIRST)

#### Step 0.1: Remove Exposed Credentials
**Files:** `env.example`, `scripts/setup-neon.mjs`, `scripts/setup-production-env.mjs`  
**Time:** 30 minutes  
**Dependencies:** None

**Why First:** Exposed credentials are a live security vulnerability that must be fixed immediately.

**Tasks:**
1. Replace all real credentials with placeholders
2. Document required environment variables
3. Verify `.gitignore` includes `.env*`
4. **ACTION REQUIRED:** Rotate all exposed credentials immediately

**Implementation:**
```bash
# env.example (placeholders only)
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
DIRECT_URL="postgresql://user:password@host:port/database?sslmode=require"
NEXTAUTH_SECRET="generate-using-npm-run-generate-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
EMAIL_SERVER="smtp://username:password@smtp.example.com:587"
EMAIL_FROM="Crypto Portal <no-reply@example.com>"
```

**Verification:**
- [ ] No real credentials in repository
- [ ] `.gitignore` verified
- [ ] All exposed credentials rotated
- [ ] Documentation updated

---

### **PHASE 1: Authentication Foundation** (Priority: 🔴 CRITICAL)

#### Step 1.1: Enable PrismaAdapter for OAuth Support
**Files:** `src/lib/auth.ts`  
**Time:** 1 hour  
**Dependencies:** Step 0.1 (credentials removed)

**Key Insight:** PrismaAdapter works WITH JWT strategy. The adapter is for linking OAuth accounts (Google, Email) to users, not for session storage. JWT sessions remain stateless and scalable.

**Tasks:**
1. Enable PrismaAdapter (test for any webpack issues)
2. Verify NextAuth tables exist (Account, Session, VerificationToken)
3. Test OAuth account linking works
4. Keep JWT session strategy (for scalability)

**Implementation:**
```typescript
// src/lib/auth.ts
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma), // Enable for OAuth account linking
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt', // Keep JWT for stateless, scalable sessions
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // ... rest of config
}
```

**Note:** If webpack error occurs, it's likely a Next.js config issue. Check `next.config.js` for proper webpack handling.

**Verification:**
- [ ] PrismaAdapter enabled without errors
- [ ] OAuth accounts link to users correctly
- [ ] JWT sessions still work
- [ ] NextAuth tables populated

---

#### Step 1.2: Configure OAuth Providers Conditionally
**Files:** `src/lib/auth.ts`  
**Time:** 1-2 hours  
**Dependencies:** Step 1.1

**Tasks:**
1. Conditionally add Google OAuth provider
2. Conditionally add Email magic link provider
3. Make demo provider development-only
4. Update type definitions

**Implementation:**
```typescript
// src/lib/auth.ts
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // ... session config ...
  
  providers: [
    // Google OAuth (if configured)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    
    // Email Magic Link (if configured)
    ...(process.env.EMAIL_SERVER && process.env.EMAIL_FROM
      ? [
          EmailProvider({
            server: process.env.EMAIL_SERVER,
            from: process.env.EMAIL_FROM,
          }),
        ]
      : []),
    
    // Demo provider (development only)
    ...(process.env.NODE_ENV !== 'production'
      ? [
          {
            id: 'demo',
            name: 'Demo Login',
            type: 'credentials' as const,
            credentials: {
              role: { label: 'Role', type: 'text' },
            },
            async authorize(credentials: any) {
              if (!credentials?.role) return null
              
              const role = credentials.role as 'member' | 'admin'
              
              // Create or find demo user in database
              const demoUser = await prisma.user.upsert({
                where: { email: `demo-${role}@example.com` },
                update: {},
                create: {
                  email: `demo-${role}@example.com`,
                  name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`,
                  role: role,
                  emailVerified: new Date(),
                },
              })
              
              // Get or create membership
              await prisma.membership.upsert({
                where: { userId: demoUser.id },
                update: { tier: role === 'admin' ? 'T3' : 'T2', status: 'active' },
                create: {
                  userId: demoUser.id,
                  tier: role === 'admin' ? 'T3' : 'T2',
                  status: 'active',
                },
              })
              
              return {
                id: demoUser.id,
                email: demoUser.email,
                name: demoUser.name,
                role: demoUser.role,
                membershipTier: role === 'admin' ? 'T3' : 'T2',
              }
            },
          },
        ]
      : []),
  ],
  
  // ... callbacks ...
}
```

**Verification:**
- [ ] Google OAuth works (when configured)
- [ ] Email magic link works (when configured)
- [ ] Demo provider only in development
- [ ] No demo provider in production builds

---

#### Step 1.3: Fix JWT Callbacks to Fetch from Database
**Files:** `src/lib/auth.ts`  
**Time:** 2 hours  
**Dependencies:** Step 1.2

**Key Insight:** Even with JWT strategy, we should refresh user data from database periodically to ensure role/tier changes are reflected.

**Tasks:**
1. Update JWT callback to fetch user from database
2. Add refresh logic (check user data every 5 minutes)
3. Handle membership tier lookup
4. Remove console.log statements

**Implementation:**
```typescript
callbacks: {
  async jwt({ token, user, account }) {
    // Initial sign in - user object provided
    if (user) {
      token.sub = user.id
      token.email = user.email
      token.name = user.name
      token.role = (user as any).role || 'guest'
      token.membershipTier = (user as any).membershipTier || 'T1'
      token.picture = user.image
      token.lastRefreshed = Math.floor(Date.now() / 1000)
      return token
    }

    // Refresh user data from database (every 5 minutes)
    const now = Math.floor(Date.now() / 1000)
    const lastRefreshed = (token.lastRefreshed as number) || 0
    
    if (now - lastRefreshed < 300) {
      // Return cached token (refreshed recently)
      return token
    }

    // Fetch fresh user data from database
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
          token.role = dbUser.role
          token.membershipTier = dbUser.memberships[0]?.tier || 'T1'
          token.name = dbUser.name
          token.email = dbUser.email
          token.picture = dbUser.image
          token.lastRefreshed = now
        }
      } catch (error) {
        // Log error but don't break token
        console.error('Error refreshing user data:', error)
      }
    }

    return token
  },

  async session({ session, token }) {
    if (token && session.user) {
      session.user.id = token.sub as string
      session.user.email = token.email as string
      session.user.name = token.name as string
      session.user.role = token.role as 'guest' | 'member' | 'editor' | 'admin'
      session.user.membershipTier = token.membershipTier as string
      session.user.image = token.picture as string | null
    }
    return session
  },
  
  // Link OAuth account to user
  async signIn({ user, account, profile }) {
    if (account?.provider === 'google' || account?.provider === 'email') {
      // PrismaAdapter handles account linking automatically
      return true
    }
    return true
  },
},
```

**Verification:**
- [ ] JWT tokens created successfully
- [ ] User data refreshed from database
- [ ] Role and tier updates reflected
- [ ] No console.log in production
- [ ] OAuth account linking works

---

#### Step 1.4: Re-enable Authentication Middleware
**Files:** `middleware.ts`  
**Time:** 1 hour  
**Dependencies:** Step 1.3

**Tasks:**
1. Uncomment authentication check
2. Fix token validation
3. Test protected routes
4. Ensure proper redirects

**Implementation:**
```typescript
// middleware.ts
export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // Apply security headers
  const response = securityHeaders(req)
  
  // ... rate limiting (keep existing) ...
  
  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  if (isPublicRoute) {
    return response
  }

  // ✅ Re-enable authentication check
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET 
  })

  if (!token) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Add user info to headers for server components
  response.headers.set('x-user-id', token.sub || '')
  response.headers.set('x-user-role', token.role || 'guest')
  response.headers.set('x-user-email', token.email || '')

  return response
}
```

**Verification:**
- [ ] Protected routes require authentication
- [ ] Unauthenticated users redirected to login
- [ ] Callback URL preserved
- [ ] Public routes accessible

---

#### Step 1.5: Remove Demo User Creation in Production Code
**Files:** `app/api/community/messages/route.ts`, `app/api/videos/route.ts`, `app/api/videos-simple/route.ts`  
**Time:** 1-2 hours  
**Dependencies:** Step 1.4

**Tasks:**
1. Remove all `demoUser.upsert()` calls
2. Require authentication for all write operations
3. Use authenticated user from session
4. Update error messages

**Implementation Pattern:**
```typescript
// app/api/community/messages/route.ts
export async function POST(req: Request) {
  // ✅ Require authentication
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, code: 'UNAUTH', message: 'Authentication required' },
      { status: 401 },
    )
  }

  // ... validation ...

  // ✅ Use authenticated user
  const saved = await prisma.message.create({
    data: {
      channelId,
      userId: session.user.id, // Real user ID
      body: text,
    },
    // ...
  })

  // ...
}
```

**Files to Update:**
- `app/api/community/messages/route.ts` (line 97-105)
- `app/api/videos/route.ts` (line 87-96)
- `app/api/videos-simple/route.ts` (line 78-87)

**Verification:**
- [ ] No demo users created
- [ ] All write operations require auth
- [ ] Correct user ID used
- [ ] Error messages appropriate

---

#### Step 1.6: Standardize Authorization Checks
**Files:** All admin API routes  
**Time:** 2-3 hours  
**Dependencies:** Step 1.5

**Tasks:**
1. Replace manual checks with `requireRole()`
2. Ensure consistent error responses
3. Test all admin endpoints

**Pattern:**
```typescript
// Before:
const session = await getServerSession(authOptions)
if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// After:
const user = await requireRole(['admin', 'editor'])
// user guaranteed to exist and have required role
```

**Verification:**
- [ ] All admin routes use `requireRole()`
- [ ] Consistent error responses
- [ ] Proper status codes (401 vs 403)
- [ ] All routes tested

---

### **PHASE 2: Security Hardening** (Priority: 🔴 CRITICAL)

#### Step 2.1: Install and Configure Input Sanitization
**Files:** New `src/lib/sanitize.ts`, update multiple files  
**Time:** 3-4 hours  
**Dependencies:** None

**Installation:**
```bash
npm install isomorphic-dompurify
npm install --save-dev @types/dompurify
```

**Implementation:**
```typescript
// src/lib/sanitize.ts
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  })
}

export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
}
```

**Apply to:**
- `app/api/community/messages/route.ts` - Sanitize message body
- `src/lib/actions/questions.ts` - Sanitize question body
- `src/components/signals/TradeDetail.tsx` - Sanitize before rendering
- `src/components/admin/ContentForm.tsx` - Sanitize before rendering

**Verification:**
- [ ] DOMPurify installed
- [ ] All user inputs sanitized
- [ ] XSS attacks prevented
- [ ] Content renders correctly

---

#### Step 2.2: Secure File Uploads
**Files:** `app/api/videos/route.ts`, `app/api/resources/upload/route.ts`  
**Time:** 3-4 hours  
**Dependencies:** None

**Installation:**
```bash
npm install file-type
```

**Implementation:**
```typescript
// src/lib/file-validation.ts
import { fileTypeFromBuffer } from 'file-type'

export async function validateFileContent(buffer: Buffer, expectedMime: string): Promise<{ valid: boolean; error?: string }> {
  const detected = await fileTypeFromBuffer(buffer)
  
  if (!detected) {
    return { valid: false, error: 'Unable to detect file type' }
  }

  const allowedTypes: Record<string, string[]> = {
    'application/pdf': ['pdf'],
    'video/mp4': ['mp4'],
    'video/webm': ['webm'],
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
  }

  const expectedTypes = allowedTypes[expectedMime]
  if (!expectedTypes || !expectedTypes.includes(detected.ext)) {
    return {
      valid: false,
      error: `File type mismatch. Expected ${expectedMime}, detected ${detected.mime}`,
    }
  }

  return { valid: true }
}

export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() || filename
  return base
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 255)
}
```

**Verification:**
- [ ] Content verification works
- [ ] MIME type spoofing prevented
- [ ] Filenames sanitized
- [ ] Upload rate limiting active

---

#### Step 2.3: Fix CSRF Protection (Use NextAuth's Built-in)
**Files:** `src/lib/security.ts`, `middleware.ts`  
**Time:** 1 hour  
**Dependencies:** None

**Key Insight:** NextAuth handles CSRF automatically via double-submit cookies. Our custom implementation is redundant and may interfere. We should remove it or make it non-blocking for NextAuth routes.

**Tasks:**
1. Remove custom CSRF for NextAuth routes
2. Keep simple origin check for API routes
3. Rely on NextAuth's built-in CSRF

**Implementation:**
```typescript
// src/lib/security.ts
export function csrfProtection(req: NextRequest) {
  const method = req.method
  const pathname = req.nextUrl.pathname
  
  // Skip CSRF for safe methods
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null
  }

  // NextAuth handles CSRF automatically - don't interfere
  if (pathname.startsWith('/api/auth/')) {
    return null
  }

  // For other API routes, basic origin check
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  
  // Allow same-origin requests (Next.js pages)
  if (origin && referer) {
    try {
      const originUrl = new URL(origin)
      const refererUrl = new URL(referer)
      
      if (originUrl.origin === refererUrl.origin) {
        return null
      }
    } catch {
      // Invalid URLs - reject
    }
  }

  // Block cross-origin requests to API routes (except NextAuth)
  return NextResponse.json(
    { error: 'Cross-origin request blocked' },
    { status: 403 }
  )
}
```

**Verification:**
- [ ] NextAuth CSRF not interfered with
- [ ] Cross-origin API requests blocked
- [ ] Same-origin requests allowed
- [ ] No false positives

---

#### Step 2.4: Implement Redis-Based Rate Limiting
**Files:** `src/lib/rate-limit.ts`, `middleware.ts`  
**Time:** 3-4 hours  
**Dependencies:** Upstash Redis account

**Installation:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Implementation:**
```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Fallback in-memory rate limiter for development
class InMemoryRateLimit {
  private store = new Map<string, { count: number; resetTime: number }>()
  
  async limit(identifier: string, limit: number, window: string) {
    const windowMs = this.parseWindow(window)
    const now = Date.now()
    const key = `${identifier}:${window}`
    const entry = this.store.get(key) || { count: 0, resetTime: now + windowMs }
    
    if (entry.resetTime < now) {
      entry.count = 0
      entry.resetTime = now + windowMs
    }
    
    entry.count++
    this.store.set(key, entry)
    
    return {
      success: entry.count <= limit,
      remaining: Math.max(0, limit - entry.count),
      reset: Math.ceil((entry.resetTime - now) / 1000),
    }
  }
  
  private parseWindow(window: string): number {
    const match = window.match(/(\d+)\s*([smhd])/)
    if (!match) return 60000
    const value = parseInt(match[1])
    const unit = match[2]
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 }
    return value * (multipliers[unit] || 60000)
  }
}

// Use Redis if available, otherwise in-memory (dev only)
let rateLimiter: Ratelimit | InMemoryRateLimit

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  
  rateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
  })
} else {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ Redis not configured - rate limiting disabled in production')
  }
  rateLimiter = new InMemoryRateLimit()
}

export const apiRateLimit = {
  limit: async (identifier: string) => {
    return rateLimiter.limit(identifier, 100, '1 m')
  },
}

export const messageRateLimit = {
  limit: async (identifier: string) => {
    return rateLimiter.limit(identifier, 10, '1 m')
  },
}
```

**Verification:**
- [ ] Redis connection works (if configured)
- [ ] Fallback works in development
- [ ] Rate limiting functional
- [ ] Appropriate limits configured

---

#### Step 2.5: Remove Sensitive Data from Logs
**Files:** New `src/lib/logger.ts`, update all API routes  
**Time:** 3-4 hours  
**Dependencies:** None

**Implementation:**
```typescript
// src/lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.logLevel)
  }

  private maskPII(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) return data

    const sensitive = ['password', 'secret', 'token', 'email', 'userId', 'userEmail', 'access_token', 'refresh_token']
    const masked = { ...data as Record<string, unknown> }

    for (const key of Object.keys(masked)) {
      if (sensitive.some(s => key.toLowerCase().includes(s))) {
        masked[key] = '[REDACTED]'
      } else if (typeof masked[key] === 'object') {
        masked[key] = this.maskPII(masked[key])
      }
    }

    return masked
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog('debug')) return
    const data = this.isDevelopment ? context : this.maskPII(context)
    if (data && Object.keys(data).length > 0) {
      console.debug(`[DEBUG] ${message}`, data)
    } else {
      console.debug(`[DEBUG] ${message}`)
    }
  }

  info(message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog('info')) return
    const data = this.isDevelopment ? context : this.maskPII(context)
    if (data && Object.keys(data).length > 0) {
      console.info(`[INFO] ${message}`, data)
    } else {
      console.info(`[INFO] ${message}`)
    }
  }

  warn(message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog('warn')) return
    const data = this.isDevelopment ? context : this.maskPII(context)
    if (data && Object.keys(data).length > 0) {
      console.warn(`[WARN] ${message}`, data)
    } else {
      console.warn(`[WARN] ${message}`)
    }
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    if (!this.shouldLog('error')) return
    const data = this.isDevelopment ? context : this.maskPII(context)
    const errorInfo = error ? { message: error.message, stack: this.isDevelopment ? error.stack : '[REDACTED]' } : null
    
    if (errorInfo || (data && Object.keys(data).length > 0)) {
      console.error(`[ERROR] ${message}`, errorInfo, data)
    } else {
      console.error(`[ERROR] ${message}`)
    }
  }
}

export const logger = new Logger()
```

**Replace all console.log/error/warn with logger**

**Verification:**
- [ ] Logger created
- [ ] All console.logs replaced
- [ ] PII masked in production
- [ ] Log levels configurable

---

#### Step 2.6: Environment Variable Validation
**Files:** New `src/lib/env.ts`  
**Time:** 1-2 hours  
**Dependencies:** None

**Implementation:**
```typescript
// src/lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().optional(),
  DATABASE_URL_DEV: z.string().optional(),
  
  // NextAuth (required)
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  
  // OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // Email (optional)
  EMAIL_SERVER: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  
  // Redis (optional)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  
  // Public vars
  NEXT_PUBLIC_GOOGLE_ENABLED: z.string().optional(),
  NEXT_PUBLIC_EMAIL_ENABLED: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors.map(e => `  - ${e.path.join('.')}: ${e.message}`).join('\n')
      throw new Error(
        `❌ Invalid environment variables:\n${missing}\n\n` +
        `Please check your .env file and ensure all required variables are set.`
      )
    }
    throw error
  }
}

export const env = validateEnv()
```

**Usage:**
```typescript
// At top of files that need env vars:
import { env } from '@/lib/env'

const secret = env.NEXTAUTH_SECRET // Type-safe
```

**Verification:**
- [ ] Schema defined
- [ ] Validation at startup
- [ ] Clear error messages
- [ ] Type-safe access

---

## ✅ Testing Checklist

### Authentication Testing
- [ ] Login with demo provider (dev only)
- [ ] Login with Google OAuth (if configured)
- [ ] Login with Email magic link (if configured)
- [ ] Sessions persist across refreshes
- [ ] Protected routes require auth
- [ ] Public routes accessible
- [ ] Role-based access works
- [ ] Unauthorized returns 401/403

### Security Testing
- [ ] XSS attacks prevented
- [ ] File upload MIME spoofing blocked
- [ ] Rate limiting works
- [ ] CSRF protection active
- [ ] No sensitive data in logs
- [ ] Environment validation works
- [ ] No credentials in repository

---

## 📅 REVISED Timeline

### Day 1: Critical Security
- Morning: Step 0.1 (Remove credentials) - **30 min**
- Morning: Step 1.1-1.2 (PrismaAdapter, OAuth)
- Afternoon: Step 1.3 (JWT callbacks)

### Day 2: Authentication
- Morning: Step 1.4-1.5 (Middleware, remove demo users)
- Afternoon: Step 1.6 (Standardize auth checks)

### Day 3: Security Hardening
- Morning: Step 2.1-2.2 (Sanitization, file uploads)
- Afternoon: Step 2.3-2.4 (CSRF, rate limiting)

### Day 4: Finishing Touches
- Morning: Step 2.5-2.6 (Logging, env validation)
- Afternoon: Testing and bug fixes

---

## 🔑 Key Corrections Summary

1. ✅ **Credentials removal is FIRST** (before anything else)
2. ✅ **PrismaAdapter works with JWT** (adapter is for OAuth, not sessions)
3. ✅ **CSRF simplified** (rely on NextAuth's built-in)
4. ✅ **Demo provider conditional** (development only)
5. ✅ **JWT strategy maintained** (better for scalability)
6. ✅ **Database refresh** (update user data every 5 minutes)

---

**Status:** ✅ **REVIEWED & CORRECTED - Ready for Implementation**  
**Next Step:** Begin Phase 0, Step 0.1 - Remove Exposed Credentials

