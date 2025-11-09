# 🔐 Phase 1: Simple Secure Login - Comprehensive Implementation Plan

**Date:** December 2024  
**Goal:** Implement simple, secure password-based authentication with zero regressions  
**Status:** 📋 **PLANNING PHASE**  
**Priority:** 🔴 CRITICAL

---

## 🎯 **Executive Summary**

This plan implements a **simple, secure password-based login system** while ensuring **zero regressions** to existing functionality. Focus is on core authentication needs: login, password reset, email verification, and basic security - **without complex features like MFA**.

**Key Principles:**
- ✅ **No Breaking Changes** - All existing auth flows continue to work
- ✅ **Simple & Secure** - Password-based login with strong password policies
- ✅ **Backward Compatible** - Existing users (demo/OAuth) don't need to change anything
- ✅ **Gradual Rollout** - Features can be enabled progressively
- ✅ **Comprehensive Testing** - Every feature tested against existing flows

**Removed from Scope:**
- ❌ Multi-Factor Authentication (MFA) - Too complex for initial implementation
- ✅ Focus on core: login, password reset, email verification, basic security

---

## 📊 **Current State Analysis**

### **✅ What's Already Working**

1. **Authentication System:**
   - ✅ NextAuth.js with PrismaAdapter enabled
   - ✅ JWT session strategy (stateless, scalable)
   - ✅ Three providers: Google OAuth, Email Magic Link, Demo (dev only)
   - ✅ Middleware authentication active
   - ✅ Session management functions (`getSession`, `requireUser`, `requireRole`)

2. **Database Schema:**
   - ✅ `User` model has: `passwordHash`, `emailVerified`, `lastLoginAt`, `loginCount`, `isActive`
   - ✅ `UserSession` model exists (ready for session management UI)
   - ✅ `SecurityEvent` model exists (ready for failed login tracking)
   - ✅ `Account` model exists (for OAuth account linking)
   - ✅ `VerificationToken` model exists (for password reset)

3. **Security:**
   - ✅ Environment variable validation
   - ✅ Structured logging
   - ✅ File validation and sanitization
   - ⚠️ In-memory rate limiting (needs Redis upgrade)

### **❌ What's Missing (Phase 1 Scope)**

1. **Password-Based Authentication**
   - No credentials provider for username/password login
   - Users can only use demo/OAuth/email magic link
   - Need simple email + password login option

2. **Password Reset Flow**
   - No password reset UI
   - No reset token management
   - NextAuth has token infrastructure, but no UI

3. **Email Verification**
   - `emailVerified` field exists but no verification flow
   - No verification email sending
   - No verification UI

4. **Session Management**
   - `UserSession` model exists but not used
   - No active sessions display
   - No logout from specific devices

5. **Enhanced Security**
   - No failed login tracking
   - No account lockout mechanism
   - In-memory rate limiting (not production-ready)

6. **Password Policies**
   - No password strength requirements
   - No password validation
   - Password hashing exists but not used in credentials provider

---

## 🏗️ **Implementation Strategy: Zero Regressions**

### **Core Principles**

1. **Opt-In Design:**
   - MFA is optional (users enable it themselves)
   - Password policies only apply when creating/updating passwords
   - Email verification is optional (users can still use app)
   - Session management is informational (doesn't affect existing sessions)

2. **Backward Compatibility:**
   - All existing auth flows continue working
   - Demo provider unchanged
   - OAuth providers unchanged
   - JWT sessions unchanged

3. **Progressive Enhancement:**
   - Features are additive, not replacements
   - Can be enabled/disabled via feature flags (optional)
   - Graceful degradation if optional services unavailable

4. **Testing Strategy:**
   - Test each feature in isolation
   - Test all existing flows still work
   - Test new features don't break existing ones
   - Integration tests for all scenarios

---

## 📋 **PHASE 1.1: Simple Email + Password Login**

### **1.1.1: Install Dependencies** ✅ **NON-BREAKING**

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

**Impact:** ✅ **ZERO REGRESSIONS**
- New dependency for password hashing
- Only used for credentials provider
- Doesn't affect existing providers

---

### **1.1.2: Create Password Utilities** ✅ **NON-BREAKING**

**File:** `src/lib/password.ts` (NEW)

**Features:**
- Hash passwords (bcrypt)
- Compare passwords
- Simple password validation

**Implementation:**
```typescript
import { hash, compare } from 'bcryptjs'

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword)
}
```

**Impact:** ✅ **ZERO REGRESSIONS**
- New utility file
- Only used when credentials provider is accessed

---

### **1.1.3: Add Credentials Provider** ✅ **NON-BREAKING**

**File:** `src/lib/auth.ts` (UPDATE)

**Add credentials provider alongside demo provider:**

```typescript
import CredentialsProvider from 'next-auth/providers/credentials'
import { verifyPassword } from '@/lib/password'

// In providers array, add after Email Provider:
CredentialsProvider({
  id: 'credentials',
  name: 'Email & Password',
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) {
      return null
    }

    try {
      // Find user by email
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
        },
      })

      if (!user || !user.passwordHash) {
        // Don't reveal if user exists
        return null
      }

      // Check if account is active
      if (!user.isActive) {
        throw new Error('Account is disabled')
      }

      // Verify password
      const isValid = await verifyPassword(credentials.password, user.passwordHash)

      if (!isValid) {
        return null
      }

      // Get user's membership
      const membership = await prisma.membership.findUnique({
        where: { userId: user.id },
        select: { tier: true },
      })

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          loginCount: { increment: 1 },
        },
      }).catch(() => {
        // Don't block login if update fails
      })

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as 'guest' | 'member' | 'editor' | 'admin',
        membershipTier: membership?.tier || 'T1',
      }
    } catch (error) {
      logger.error(
        'Credentials login error',
        error instanceof Error ? error : new Error(String(error)),
        { email: credentials.email }
      )
      return null
    }
  },
}),
```

**Impact:** ✅ **ZERO REGRESSIONS**
- New provider added alongside existing ones
- Demo/OAuth/Email providers unchanged
- Only called when user explicitly uses credentials login

---

### **1.1.4: Create User Registration API** ✅ **NON-BREAKING**

**File:** `app/api/auth/register/route.ts` (NEW)

**Features:**
- Accept email, password, name
- Validate email uniqueness
- Hash password
- Create user with membership
- Send verification email (optional)

**Security:**
- Validate password strength
- Rate limit registration (5 per hour per IP)
- Don't reveal if email exists until after validation

**Implementation:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { validatePassword } from '@/lib/password-validation'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  name: z.string().min(2).max(100).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name } = registerSchema.parse(body)

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user and membership in transaction
    const { user, membership } = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          name: name || null,
          passwordHash,
          role: 'member',
          emailVerified: null, // Require email verification
        },
      })

      const newMembership = await tx.membership.create({
        data: {
          userId: newUser.id,
          tier: 'T1',
          status: 'trial',
        },
      })

      return { user: newUser, membership: newMembership }
    })

    logger.info('User registered', { userId: user.id, email })

    // TODO: Send verification email

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    logger.error(
      'Registration error',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    )
  }
}
```

**Impact:** ✅ **ZERO REGRESSIONS**
- New endpoint doesn't affect existing auth
- Only used for new user registration
- Doesn't change existing login flows

---

### **1.1.5: Update Login Page** ✅ **NON-BREAKING**

**File:** `app/(auth)/login/page.tsx` (UPDATE)

**Add email/password form alongside existing demo buttons:**

```typescript
// Add state for email/password login
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [showPasswordLogin, setShowPasswordLogin] = useState(false)

// Add handler for credentials login
const handleCredentialsLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  setError(null)

  try {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid email or password')
    } else if (result?.ok) {
      router.push(callbackUrl)
    }
  } catch (err) {
    setError('An unexpected error occurred')
  } finally {
    setIsLoading(false)
  }
}

// Add UI for email/password form
{showPasswordLogin ? (
  <form onSubmit={handleCredentialsLogin}>
    <input
      type="email"
      placeholder="Email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      required
    />
    <input
      type="password"
      placeholder="Password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      required
    />
    <button type="submit" disabled={isLoading}>
      Sign In
    </button>
    <button type="button" onClick={() => setShowPasswordLogin(false)}>
      Cancel
    </button>
  </form>
) : (
  // Existing demo buttons...
  <button onClick={() => setShowPasswordLogin(true)}>
    Sign in with Email & Password
  </button>
)}
```

**Impact:** ✅ **ZERO REGRESSIONS**
- Adds new login option
- Existing demo/OAuth buttons unchanged
- Optional form (user chooses login method)

---

### **1.1.6: Create Registration Page** ✅ **NON-BREAKING**

**File:** `app/(auth)/register/page.tsx` (NEW)

**Features:**
- Email, password, name fields
- Password strength indicator
- Link to login page
- Terms of service checkbox

**Impact:** ✅ **ZERO REGRESSIONS**
- New page doesn't affect existing pages
- Only for new user registration

---

## 📋 **PHASE 1.2: Password Reset Flow**

### **1.2.1: Use Existing NextAuth Infrastructure** ✅ **NON-BREAKING**

NextAuth's `VerificationToken` model and EmailProvider already support password reset. We just need to add UI and API endpoints.

---

### **1.2.2: Password Reset Request API** ✅ **NON-BREAKING**

**File:** `app/api/auth/reset-password/request/route.ts` (NEW)

**Features:**
- Accept email address
- Generate reset token (using NextAuth's token system)
- Send reset email
- Rate limit (5 requests per hour per email)

**Security:**
- Don't reveal if email exists (prevent enumeration)
- Token expiry (1 hour)
- One-time use tokens

**Implementation:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { env } from '@/lib/env'

const requestSchema = z.object({
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = requestSchema.parse(body)
    
    // Check rate limiting (simplified - use Redis in production)
    // TODO: Add Redis rate limiting
    
    // Check if user exists (don't reveal if not)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    })
    
    if (!user) {
      // Don't reveal if email exists
      return NextResponse.json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      })
    }
    
    // Generate reset token
    const token = randomBytes(32).toString('hex')
    const expires = new Date()
    expires.setHours(expires.getHours() + 1) // 1 hour expiry
    
    // Store token (using NextAuth's VerificationToken model)
    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: email,
          token: token,
        },
      },
      update: {
        token: token,
        expires: expires,
      },
      create: {
        identifier: email,
        token: token,
        expires: expires,
      },
    })
    
    // Send reset email (using configured email provider)
    // TODO: Implement email sending
    
    logger.info('Password reset requested', { email, userId: user.id })
    
    return NextResponse.json({
      message: 'If an account exists with this email, a password reset link has been sent.',
    })
    
  } catch (error) {
    logger.error('Password reset request error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
```

**Impact:** ✅ **ZERO REGRESSIONS**
- New endpoint doesn't affect existing auth
- Uses existing VerificationToken model
- Doesn't change login flow

---

### **1.2.3: Password Reset Confirmation API** ✅ **NON-BREAKING**

**File:** `app/api/auth/reset-password/confirm/route.ts` (NEW)

**Features:**
- Accept token and new password
- Verify token (check expiry, one-time use)
- Update password hash
- Invalidate token after use

**Security:**
- Require strong password (use password validation)
- Token must be valid and not expired
- Invalidate token after use

**Implementation:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { validatePassword } from '@/lib/password-validation' // Phase 1.6

const confirmSchema = z.object({
  token: z.string(),
  password: z.string().min(12),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, password } = confirmSchema.parse(body)
    
    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      )
    }
    
    // Find token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    })
    
    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }
    
    // Check expiry
    if (verificationToken.expires < new Date()) {
      await prisma.verificationToken.delete({
        where: { token },
      })
      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 400 }
      )
    }
    
    // Find user by email (identifier)
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Hash new password
    const passwordHash = await hash(password, 12)
    
    // Update password and invalidate token
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      })
      
      await tx.verificationToken.delete({
        where: { token },
      })
    })
    
    logger.info('Password reset completed', { userId: user.id })
    
    return NextResponse.json({
      message: 'Password reset successfully. You can now log in with your new password.',
    })
    
  } catch (error) {
    logger.error('Password reset confirmation error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
```

**Impact:** ✅ **ZERO REGRESSIONS**
- New endpoint doesn't affect existing auth
- Only called from reset password page
- Doesn't change login flow

---

### **1.2.4: Password Reset UI Pages** ✅ **NON-BREAKING**

**Files:**
- `app/(auth)/forgot-password/page.tsx` (NEW)
- `app/(auth)/reset-password/page.tsx` (NEW)

**Features:**
- Forgot password form
- Reset password form (with token from URL)
- Link from login page

**Impact:** ✅ **ZERO REGRESSIONS**
- New pages don't affect existing login
- Optional feature (users can use it if needed)

---

## 📋 **PHASE 1.3: Email Verification**

### **1.3.1: Email Verification API** ✅ **NON-BREAKING**

**File:** `app/api/auth/verify-email/route.ts` (NEW)

**Features:**
- Send verification email
- Verify email with token
- Resend verification email

**Implementation:**
Similar to password reset, using NextAuth's VerificationToken model.

**Impact:** ✅ **ZERO REGRESSIONS**
- Uses existing `emailVerified` field
- Opt-in feature (users can still use app without verification)
- Doesn't block existing flows

---

## 📋 **PHASE 1.4: Session Management**

### **1.4.1: Use Existing UserSession Model** ✅ **NON-BREAKING**

The `UserSession` model already exists in the schema. We need to:
1. Create sessions when users log in
2. Display active sessions in UI
3. Allow logout from specific sessions

---

### **1.4.2: Create Session on Login** ⚠️ **CAREFUL**

**File:** `src/lib/auth.ts` (UPDATE - `signIn` callback)

**Strategy:** Only create UserSession record if needed for session management UI. This is optional and doesn't affect JWT sessions.

**Implementation:**
```typescript
async signIn({ user, account, profile }) {
  // ... existing code ...
  
  // Create UserSession record for session management UI (optional)
  if (user?.id) {
    try {
      // Get IP address and device info from request (if available)
      // This is optional - doesn't break if it fails
      await prisma.userSession.create({
        data: {
          userId: user.id,
          sessionToken: randomBytes(32).toString('hex'),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          // deviceInfo and ipAddress can be added later
        },
      }).catch(() => {
        // Silently fail - session management is optional
      })
    } catch (error) {
      // Don't block login if session creation fails
      logger.debug('Failed to create UserSession record', { userId: user.id })
    }
  }
  
  return true
}
```

**Impact:** ✅ **ZERO REGRESSIONS**
- Wrapped in try-catch
- Doesn't block login if it fails
- Optional feature

---

### **1.4.3: Session Management API** ✅ **NON-BREAKING**

**File:** `app/api/auth/sessions/route.ts` (NEW)

**Features:**
- GET: List user's active sessions
- DELETE: Logout from specific session

**Impact:** ✅ **ZERO REGRESSIONS**
- New endpoint doesn't affect existing auth
- Informational only (doesn't change how sessions work)

---

### **1.4.4: Session Management UI** ✅ **NON-BREAKING**

**File:** `src/components/account/SessionManagement.tsx` (NEW)

**Features:**
- Display active sessions list
- Show device/location info
- Allow logout from specific sessions

**Impact:** ✅ **ZERO REGRESSIONS**
- New component doesn't affect existing UI
- Only shown in account settings

---

## 📋 **PHASE 1.5: Enhanced Security Features**

### **1.5.1: Failed Login Tracking** ✅ **NON-BREAKING**

**File:** `prisma/schema.prisma` (UPDATE)

**Add new model:**
```prisma
model LoginAttempt {
  id        String   @id @default(cuid())
  email     String
  ipAddress String?
  success   Boolean
  reason    String?
  createdAt DateTime @default(now())

  @@index([email, createdAt])
  @@index([ipAddress, createdAt])
}
```

**Impact:** ✅ **ZERO REGRESSIONS**
- New model doesn't affect existing models
- Only used for tracking (read-only for users)

---

### **1.5.2: Track Login Attempts** ⚠️ **CAREFUL**

**File:** `src/lib/auth.ts` (UPDATE - credentials provider `authorize` function)

**Strategy:** Add tracking but don't block on failure. Log attempts but don't change behavior.

**Implementation:**
Add to credentials provider authorize function:
```typescript
// Log login attempt (non-blocking)
await prisma.loginAttempt.create({
  data: {
    email: credentials.email,
    success: isValid,
    reason: isValid ? null : 'Invalid password',
    ipAddress: req.ip || req.headers.get('x-forwarded-for') || null,
  },
}).catch(() => {
  // Don't block login if logging fails
})
```

**Impact:** ✅ **ZERO REGRESSIONS**
- Logging is non-blocking (wrapped in try-catch)
- Doesn't change login behavior
- Optional feature (doesn't affect existing flows)

---

### **1.5.3: Account Lockout (Optional)** ⚠️ **CAREFUL - OPTIONAL**

**Strategy:** Only lock accounts after multiple failed attempts. This is optional and can be disabled.

**Add to `User` model:**
```prisma
model User {
  // ... existing fields ...
  lockedUntil DateTime? // Lock account until this time
  failedLoginAttempts Int @default(0) // Track failed attempts
}
```

**Implementation:**
Check lockout before login, increment on failure, reset on success.

**Impact:** ✅ **ZERO REGRESSIONS**
- Optional fields (can be null/0)
- Only applies if lockout is triggered
- Existing users not affected

---

### **1.5.4: Redis Rate Limiting Upgrade** ✅ **NON-BREAKING**

**File:** `src/lib/security.ts` (UPDATE)

**Strategy:** Upgrade from in-memory to Redis, but fallback to in-memory if Redis unavailable.

**Implementation:**
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { env } from '@/lib/env'

// Try to use Redis, fallback to in-memory
let ratelimit: Ratelimit | null = null

if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
    
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
    })
  } catch (error) {
    logger.warn('Failed to initialize Redis rate limiting, using in-memory fallback')
  }
}

export function rateLimit(limit: number = 10, windowMs: number = 60000) {
  return async (req: NextRequest) => {
    // Use Redis if available, otherwise fallback to in-memory
    if (ratelimit) {
      // Use Redis rate limiting
      const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
      const { success } = await ratelimit.limit(ip)
      
      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests' },
          { status: 429 }
        )
      }
    } else {
      // Fallback to existing in-memory rate limiting
      // ... existing code ...
    }
    
    return null
  }
}
```

**Impact:** ✅ **ZERO REGRESSIONS**
- Fallback to in-memory if Redis unavailable
- Existing rate limiting continues working
- Only improves if Redis is available

---

## 📋 **PHASE 1.6: Strong Password Policies**

### **1.6.1: Password Validation Library** ✅ **NON-BREAKING**

**File:** `src/lib/password-validation.ts` (NEW)

**Features:**
- Minimum 12 characters
- Require uppercase, lowercase, number, special char
- Common password blacklist
- Password strength scoring

**Implementation:**
```typescript
export interface PasswordValidation {
  valid: boolean
  error?: string
  strength: 'weak' | 'medium' | 'strong'
}

export function validatePassword(password: string): PasswordValidation {
  if (password.length < 12) {
    return {
      valid: false,
      error: 'Password must be at least 12 characters long',
      strength: 'weak',
    }
  }

  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    return {
      valid: false,
      error: 'Password must contain uppercase, lowercase, number, and special character',
      strength: 'weak',
    }
  }

  // Check common passwords (simplified)
  const commonPasswords = ['password', '123456', 'qwerty', 'admin']
  const lowerPassword = password.toLowerCase()
  if (commonPasswords.some(cp => lowerPassword.includes(cp))) {
    return {
      valid: false,
      error: 'Password is too common',
      strength: 'weak',
    }
  }

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  if (password.length >= 16 && hasUpper && hasLower && hasNumber && hasSpecial) {
    strength = 'strong'
  } else if (password.length >= 12) {
    strength = 'medium'
  }

  return {
    valid: true,
    strength,
  }
}
```

**Impact:** ✅ **ZERO REGRESSIONS**
- New utility file
- Only used when passwords are created/updated
- Doesn't affect existing users

---

### **1.6.2: Password Strength Meter Component** ✅ **NON-BREAKING**

**File:** `src/components/auth/PasswordStrengthMeter.tsx` (NEW)

**Features:**
- Visual password strength indicator
- Real-time validation feedback
- Color-coded (red/yellow/green)

**Impact:** ✅ **ZERO REGRESSIONS**
- New component
- Only shown in password creation/reset forms
- Doesn't affect existing forms

---

## 🧪 **Testing Strategy: Zero Regressions**

### **Test Plan**

1. **Existing Flows (Must Still Work):**
   - ✅ Demo login (member and admin)
   - ✅ Google OAuth login (if configured)
   - ✅ Email magic link login (if configured)
   - ✅ Session refresh (JWT)
   - ✅ Protected routes access
   - ✅ Role-based access control

2. **New Features (Must Work Without Breaking):**
   - ✅ MFA setup (opt-in)
   - ✅ Password reset (optional)
   - ✅ Email verification (optional)
   - ✅ Session management (informational)
   - ✅ Failed login tracking (non-blocking)

3. **Integration Tests:**
   - ✅ Enable MFA, verify login still works
   - ✅ Reset password, verify login with new password
   - ✅ Verify email, verify account still accessible
   - ✅ View sessions, verify doesn't affect current session

4. **Regression Tests:**
   - ✅ All existing API routes work
   - ✅ All existing pages load
   - ✅ All existing components render
   - ✅ Database queries unchanged
   - ✅ Authentication middleware unchanged

---

## 📊 **Implementation Order (Zero Regression Guarantee)**

### **Step 1: Database Migrations** ✅ **SAFE**
- Create LoginAttempt model
- Add optional lockout fields to User (if implementing lockout)
- All fields optional with defaults
- **Test:** Run migration, verify existing data intact

### **Step 2: Utility Libraries** ✅ **SAFE**
- Create `src/lib/password.ts` (hashing/verification)
- Create `src/lib/password-validation.ts` (strength checking)
- New files don't affect existing code
- **Test:** Verify no import errors

### **Step 3: Add Credentials Provider** ✅ **SAFE**
- Update `src/lib/auth.ts` to add credentials provider
- Demo/OAuth/Email providers unchanged
- **Test:** Verify existing providers still work, credentials provider works

### **Step 4: API Endpoints** ✅ **SAFE**
- Create registration endpoint
- Create password reset endpoints
- Create email verification endpoints
- Create session management endpoints
- New endpoints don't affect existing ones
- **Test:** Verify existing API routes still work

### **Step 5: UI Components** ✅ **SAFE**
- Update login page (add email/password form)
- Create registration page
- Create password reset pages
- Create password strength meter
- Create session management component
- New components don't affect existing UI
- **Test:** Verify existing pages still load

### **Step 6: Optional Enhancements** ⚠️ **CAREFUL**
- Add login attempt tracking (non-blocking)
- Add account lockout (optional)
- Upgrade rate limiting (with fallback)
- **Test:** Verify existing flows still work

### **Step 7: Integration** ✅ **SAFE**
- Add links to new features in UI
- Add optional checks in auth flow
- **Test:** Full integration testing

---

## ✅ **Verification Checklist**

Before marking Phase 1 complete:

- [ ] All database migrations run successfully
- [ ] Existing demo login works
- [ ] Existing OAuth login works (if configured)
- [ ] Existing email login works (if configured)
- [ ] New email/password login works
- [ ] User registration works
- [ ] All protected routes still require auth
- [ ] All existing API routes work
- [ ] All existing pages load
- [ ] Password reset works
- [ ] Email verification works (optional)
- [ ] Session management displays correctly
- [ ] Failed login tracking works (non-blocking)
- [ ] Redis rate limiting works (with fallback)
- [ ] Password validation works (when creating/updating passwords)
- [ ] Password strength meter displays correctly
- [ ] Zero TypeScript errors
- [ ] Zero linter errors
- [ ] All tests pass

---

## 🎯 **Success Criteria**

Phase 1 is successful when:
1. ✅ All existing authentication flows continue working
2. ✅ All new features are opt-in and working
3. ✅ Zero regressions in existing functionality
4. ✅ All features tested and verified
5. ✅ Documentation updated

---

**Next Step:** Begin implementation following this plan, step by step, with testing after each step to ensure zero regressions.

