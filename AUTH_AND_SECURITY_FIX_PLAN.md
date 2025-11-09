# 🔒 Authentication & Security Fix Plan

**Date:** December 2024  
**Status:** 📋 **PLANNING**  
**Goal:** Secure authentication system and fix all critical security issues before Stripe integration

---

## 📊 Overview

This plan addresses:
1. **Authentication System** - Fix login, sessions, and authorization
2. **Critical Security Issues** - 10 issues identified in security audit
3. **Production Readiness** - Ensure system is secure before payment processing

**Estimated Time:** 3-4 days  
**Risk Level if Not Fixed:** 🔴 CRITICAL

---

## 🎯 Goals

### Authentication Goals
- ✅ Secure, working authentication system
- ✅ Support for Google OAuth and Email magic links
- ✅ Proper session management with database persistence
- ✅ Secure demo mode (development only)
- ✅ Role-based access control (RBAC)

### Security Goals
- ✅ No exposed credentials in repository
- ✅ XSS protection (input sanitization)
- ✅ Secure file uploads
- ✅ Production-ready rate limiting
- ✅ CSRF protection enabled
- ✅ No sensitive data in logs
- ✅ Environment variable validation

---

## 📋 Implementation Plan

### **PHASE 1: Authentication Foundation** (Priority: 🔴 CRITICAL)

#### Step 1.1: Fix PrismaAdapter and Database Sessions
**Files:** `src/lib/auth.ts`  
**Time:** 2-3 hours  
**Dependencies:** None

**Tasks:**
1. Re-enable PrismaAdapter (fix webpack issue properly)
2. Update NextAuth configuration to use database sessions
3. Ensure Prisma schema has required NextAuth tables
4. Test session persistence

**Implementation:**
```typescript
// src/lib/auth.ts
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma), // Re-enable
  // ... rest of config
}
```

**Verification:**
- [ ] Sessions stored in database
- [ ] Sessions persist across server restarts
- [ ] Session revocation works

---

#### Step 1.2: Configure OAuth Providers
**Files:** `src/lib/auth.ts`, `.env.example`  
**Time:** 1-2 hours  
**Dependencies:** Step 1.1

**Tasks:**
1. Conditionally add Google OAuth provider (if credentials exist)
2. Conditionally add Email magic link provider (if SMTP configured)
3. Update environment variable documentation
4. Test provider registration

**Implementation:**
```typescript
// src/lib/auth.ts
providers: [
  // Google OAuth (if configured)
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
  ...(process.env.NODE_ENV !== 'production' ? [demoProvider] : []),
],
```

**Verification:**
- [ ] Google OAuth works (when configured)
- [ ] Email magic link works (when configured)
- [ ] Demo provider only in development

---

#### Step 1.3: Fix JWT Token Creation and Callbacks
**Files:** `src/lib/auth.ts`  
**Time:** 2-3 hours  
**Dependencies:** Step 1.1

**Tasks:**
1. Fix JWT callback to properly fetch user from database
2. Add session refresh logic
3. Handle user role and membership tier
4. Remove console.log statements from callbacks

**Implementation:**
```typescript
callbacks: {
  async jwt({ token, user, account }) {
    // Initial sign in
    if (user) {
      // Fetch full user from database
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          memberships: {
            where: { status: 'active' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })

      if (dbUser) {
        token.sub = dbUser.id
        token.email = dbUser.email
        token.name = dbUser.name
        token.role = dbUser.role
        token.membershipTier = dbUser.memberships[0]?.tier || 'T1'
        token.picture = dbUser.image
      }
    }

    // Refresh user data periodically (every 5 minutes)
    const now = Math.floor(Date.now() / 1000)
    if (token.lastRefreshed && now - token.lastRefreshed < 300) {
      return token
    }

    // Refresh from database
    if (token.sub) {
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
        token.lastRefreshed = now
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
}
```

**Verification:**
- [ ] JWT tokens created successfully
- [ ] User data refreshed from database
- [ ] Role and membership tier correct
- [ ] No console.log in production

---

#### Step 1.4: Re-enable Authentication Middleware
**Files:** `middleware.ts`  
**Time:** 1 hour  
**Dependencies:** Step 1.3

**Tasks:**
1. Uncomment authentication check
2. Fix any token validation issues
3. Test protected routes
4. Add proper error handling

**Implementation:**
```typescript
// middleware.ts
export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // ... security headers, rate limiting, CSRF ...
  
  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Get session token
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET 
  })

  // ✅ Re-enable authentication check
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
- [ ] Login redirect preserves callback URL
- [ ] Public routes still accessible

---

#### Step 1.5: Remove Demo User Creation in Production Code
**Files:** `app/api/community/messages/route.ts`, `app/api/videos/route.ts`, `app/api/videos-simple/route.ts`  
**Time:** 1-2 hours  
**Dependencies:** Step 1.4

**Tasks:**
1. Remove all `demoUser.upsert()` calls
2. Require authentication for all write operations
3. Use actual authenticated user from session
4. Update error messages

**Implementation:**
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
      userId: session.user.id, // Use actual user ID
      body: text,
    },
    // ...
  })

  // ...
}
```

**Verification:**
- [ ] No demo users created in production
- [ ] All write operations require auth
- [ ] Correct user ID used
- [ ] Error messages appropriate

---

#### Step 1.6: Standardize Authorization Checks
**Files:** All admin API routes  
**Time:** 2-3 hours  
**Dependencies:** Step 1.5

**Tasks:**
1. Replace manual auth checks with `requireRole()`
2. Ensure consistent error responses
3. Add proper logging (without sensitive data)
4. Test all admin endpoints

**Files to Update:**
- `app/api/admin/signals/route.ts`
- `app/api/admin/signals/[signalId]/route.ts`
- `app/api/admin/events/route.ts`
- `app/api/admin/events/[eventId]/route.ts`
- `app/api/videos/route.ts`
- `app/api/videos-simple/route.ts`
- `app/api/resources/upload/route.ts`

**Implementation Pattern:**
```typescript
// Before (inconsistent):
const session = await getServerSession(authOptions)
if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// After (standardized):
const user = await requireRole(['admin', 'editor'])
// user is guaranteed to exist and have required role
```

**Verification:**
- [ ] All admin routes use `requireRole()`
- [ ] Consistent error responses
- [ ] Proper status codes (401 vs 403)
- [ ] All routes tested

---

### **PHASE 2: Security Hardening** (Priority: 🔴 CRITICAL)

#### Step 2.1: Remove Exposed Credentials
**Files:** `env.example`, `scripts/setup-neon.mjs`, `scripts/setup-production-env.mjs`  
**Time:** 1 hour  
**Dependencies:** None

**Tasks:**
1. Remove all real credentials from repository
2. Use placeholder values in examples
3. Document required environment variables
4. Verify `.gitignore` includes `.env*`
5. **Rotate all exposed credentials immediately**

**Implementation:**
```bash
# env.example (placeholders only)
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
NEXTAUTH_SECRET="generate-using-npm-run-generate-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

**Verification:**
- [ ] No real credentials in repository
- [ ] `.gitignore` verified
- [ ] All exposed credentials rotated
- [ ] Documentation updated

---

#### Step 2.2: Install and Configure Input Sanitization
**Files:** New file `src/lib/sanitize.ts`, update multiple files  
**Time:** 3-4 hours  
**Dependencies:** None

**Tasks:**
1. Install `isomorphic-dompurify`
2. Create sanitization utilities
3. Sanitize all user inputs before storage
4. Sanitize before rendering with `dangerouslySetInnerHTML`

**Installation:**
```bash
npm install isomorphic-dompurify
npm install --save-dev @types/dompurify
```

**Implementation:**
```typescript
// src/lib/sanitize.ts
import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML content for safe rendering
 */
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

/**
 * Sanitize plain text (remove all HTML)
 */
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
}
```

**Update Files:**
- `app/api/community/messages/route.ts` - Sanitize message body
- `src/lib/actions/questions.ts` - Sanitize question body
- `src/components/signals/TradeDetail.tsx` - Sanitize thesis before rendering
- `src/components/admin/ContentForm.tsx` - Sanitize body before rendering

**Verification:**
- [ ] DOMPurify installed
- [ ] All user inputs sanitized
- [ ] XSS attacks prevented
- [ ] Content still renders correctly

---

#### Step 2.3: Secure File Uploads
**Files:** `app/api/videos/route.ts`, `app/api/resources/upload/route.ts`, `src/lib/video-storage.ts`  
**Time:** 4-5 hours  
**Dependencies:** None

**Tasks:**
1. Install `file-type` for content verification
2. Add magic byte validation (not just MIME type)
3. Implement strict filename sanitization
4. Add upload rate limiting
5. Store files outside web root (already done, verify)

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

  // Map of allowed MIME types to file signatures
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
  // Remove path components and dangerous characters
  const base = filename.split(/[/\\]/).pop() || filename
  return base
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 255) // Limit length
}
```

**Verification:**
- [ ] Content verification works
- [ ] MIME type spoofing prevented
- [ ] Filenames sanitized
- [ ] Upload rate limiting active

---

#### Step 2.4: Implement Redis-Based Rate Limiting
**Files:** `src/lib/rate-limit.ts`, `src/lib/security.ts`  
**Time:** 3-4 hours  
**Dependencies:** Upstash account or Redis instance

**Tasks:**
1. Set up Upstash Redis (or use existing Redis)
2. Install `@upstash/ratelimit` and `@upstash/redis`
3. Replace in-memory rate limiting
4. Configure appropriate limits
5. Add environment variable validation

**Installation:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Implementation:**
```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Create rate limiters for different use cases
export const messageRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 messages per minute
  analytics: true,
})

export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true,
})

export const uploadRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 uploads per hour
  analytics: true,
})
```

**Update `middleware.ts`:**
```typescript
// Use Redis-based rate limiting
import { apiRateLimit } from '@/lib/rate-limit'

if (pathname.startsWith('/api/')) {
  const identifier = req.ip || 'unknown'
  const { success } = await apiRateLimit.limit(identifier)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }
}
```

**Fallback for Development:**
```typescript
// If Redis not configured, use in-memory (development only)
export const getRateLimit = process.env.UPSTASH_REDIS_REST_URL
  ? apiRateLimit
  : createInMemoryRateLimit() // Simple fallback
```

**Verification:**
- [ ] Redis connection works
- [ ] Rate limiting functional
- [ ] Appropriate limits configured
- [ ] Fallback for development

---

#### Step 2.5: Enable CSRF Protection in All Environments
**Files:** `src/lib/security.ts`  
**Time:** 1-2 hours  
**Dependencies:** None

**Tasks:**
1. Remove development bypass
2. Use NextAuth CSRF tokens
3. Validate on all state-changing operations
4. Test in development

**Implementation:**
```typescript
// src/lib/security.ts
export function csrfProtection(req: NextRequest) {
  const method = req.method
  
  // Skip CSRF for safe methods
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null
  }

  // Check for NextAuth CSRF token
  const csrfToken = req.cookies.get('next-auth.csrf-token')?.value
  const headerToken = req.headers.get('x-csrf-token')

  // Allow requests from same origin (Next.js pages)
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  
  if (origin && referer) {
    try {
      const originUrl = new URL(origin)
      const refererUrl = new URL(referer)
      
      if (originUrl.origin === refererUrl.origin) {
        // Same origin request - allow (Next.js handles CSRF)
        return null
      }
    } catch {
      // Invalid URLs
    }
  }

  // For API routes, require CSRF token
  if (!csrfToken && !headerToken) {
    return NextResponse.json(
      { error: 'CSRF token missing' },
      { status: 403 }
    )
  }

  return null
}
```

**Verification:**
- [ ] CSRF protection enabled in all environments
- [ ] Same-origin requests allowed
- [ ] Cross-origin requests blocked
- [ ] No false positives

---

#### Step 2.6: Remove Sensitive Data from Logs
**Files:** Multiple API routes (148+ console.log statements)  
**Time:** 2-3 hours  
**Dependencies:** None

**Tasks:**
1. Create structured logger utility
2. Replace all `console.log/error/warn` with logger
3. Mask PII in production
4. Configure log levels

**Implementation:**
```typescript
// src/lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.logLevel)
  }

  private maskPII(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) return data

    const sensitive = ['password', 'secret', 'token', 'email', 'userId', 'userEmail']
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

  debug(message: string, context?: LogContext) {
    if (!this.shouldLog('debug')) return
    const data = this.isDevelopment ? context : this.maskPII(context)
    console.debug(`[DEBUG] ${message}`, data || '')
  }

  info(message: string, context?: LogContext) {
    if (!this.shouldLog('info')) return
    const data = this.isDevelopment ? context : this.maskPII(context)
    console.info(`[INFO] ${message}`, data || '')
  }

  warn(message: string, context?: LogContext) {
    if (!this.shouldLog('warn')) return
    const data = this.isDevelopment ? context : this.maskPII(context)
    console.warn(`[WARN] ${message}`, data || '')
  }

  error(message: string, error?: Error, context?: LogContext) {
    if (!this.shouldLog('error')) return
    const data = this.isDevelopment ? context : this.maskPII(context)
    console.error(`[ERROR] ${message}`, error?.stack || error, data || '')
  }
}

export const logger = new Logger()
```

**Usage:**
```typescript
// Before:
console.log('🔐 Session check:', {
  hasSession: !!session,
  userId: session?.user?.id, // ⚠️ Sensitive!
  userEmail: session?.user?.email, // ⚠️ Sensitive!
})

// After:
logger.debug('Session check', {
  hasSession: !!session,
  // userId and email automatically masked in production
})
```

**Verification:**
- [ ] Logger utility created
- [ ] All console.logs replaced
- [ ] PII masked in production
- [ ] Log levels configurable

---

#### Step 2.7: Environment Variable Validation
**Files:** New file `src/lib/env.ts`  
**Time:** 2-3 hours  
**Dependencies:** None

**Tasks:**
1. Create Zod schema for environment variables
2. Validate at application startup
3. Provide clear error messages
4. Document all required variables

**Implementation:**
```typescript
// src/lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().optional(),
  DATABASE_URL_DEV: z.string().optional(),
  
  // NextAuth
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  
  // OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // Email (optional)
  EMAIL_SERVER: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  
  // Redis (optional for development)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
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
      const missing = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n')
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
// In any file:
import { env } from '@/lib/env'

// Type-safe access:
const secret = env.NEXTAUTH_SECRET // ✅ TypeScript knows it's a string
```

**Verification:**
- [ ] Schema defined
- [ ] Validation at startup
- [ ] Clear error messages
- [ ] Type-safe access

---

## ✅ Testing Checklist

### Authentication Testing
- [ ] Login with Google OAuth (if configured)
- [ ] Login with Email magic link (if configured)
- [ ] Demo login works (development only)
- [ ] Sessions persist across page refreshes
- [ ] Sessions persist across server restarts
- [ ] Logout works correctly
- [ ] Protected routes require authentication
- [ ] Public routes accessible without auth
- [ ] Role-based access control works
- [ ] Unauthorized access returns 401/403

### Security Testing
- [ ] XSS attacks prevented (try `<script>alert('xss')</script>`)
- [ ] File upload with spoofed MIME type rejected
- [ ] Rate limiting prevents brute force
- [ ] CSRF protection blocks cross-origin requests
- [ ] Sensitive data not in logs
- [ ] Environment variables validated
- [ ] No credentials in repository

### Integration Testing
- [ ] All admin endpoints require auth
- [ ] All write operations require auth
- [ ] Messages use authenticated user
- [ ] File uploads use authenticated user
- [ ] No demo users created in production

---

## 📅 Timeline

### Phase 1: Authentication Foundation (Days 1-2)
- Day 1 Morning: Steps 1.1-1.2 (PrismaAdapter, OAuth providers)
- Day 1 Afternoon: Steps 1.3-1.4 (JWT callbacks, middleware)
- Day 2 Morning: Steps 1.5-1.6 (Remove demo users, standardize auth)

### Phase 2: Security Hardening (Days 2-4)
- Day 2 Afternoon: Steps 2.1-2.2 (Credentials, sanitization)
- Day 3 Morning: Steps 2.3-2.4 (File uploads, rate limiting)
- Day 3 Afternoon: Steps 2.5-2.6 (CSRF, logging)
- Day 4 Morning: Step 2.7 (Environment validation)
- Day 4 Afternoon: Testing and bug fixes

---

## 🚨 Critical Dependencies

1. **Upstash Redis Account** - For production rate limiting
   - Sign up at https://upstash.com
   - Get REST URL and token
   - Free tier available

2. **Environment Variables** - Must be set before deployment
   - `NEXTAUTH_SECRET` - Generate with `npm run generate-secret`
   - `NEXTAUTH_URL` - Your production URL
   - OAuth credentials (optional)
   - Email SMTP config (optional)
   - Redis credentials (optional, recommended)

3. **Database Schema** - Ensure NextAuth tables exist
   - Run `npx prisma db push` after enabling PrismaAdapter
   - Verify tables: `Account`, `Session`, `User`, `VerificationToken`

---

## 📝 Notes

- **Demo Mode**: Should only work in development (`NODE_ENV !== 'production'`)
- **OAuth Providers**: Can be enabled/disabled via environment variables
- **Rate Limiting**: Falls back to in-memory if Redis not configured (dev only)
- **Logging**: Use structured logger for all new code
- **Testing**: Test thoroughly after each phase before moving to next

---

## 🔄 Rollback Plan

If issues arise:

1. **Authentication Issues:**
   - Revert middleware changes (keep auth disabled temporarily)
   - Keep PrismaAdapter disabled until webpack issue resolved
   - Use JWT-only strategy as fallback

2. **Security Issues:**
   - Each step is independent and can be reverted
   - Keep original console.logs until logger ready
   - Rate limiting can fall back to in-memory

3. **Database Issues:**
   - PrismaAdapter can be disabled if causing problems
   - Use JWT strategy as temporary solution

---

**Status:** 📋 Ready for Implementation  
**Next Step:** Begin Phase 1, Step 1.1 - Fix PrismaAdapter

