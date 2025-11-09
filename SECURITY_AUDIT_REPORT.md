# 🔒 Security Audit Report - Pre-Stripe Integration

**Date:** December 2024  
**Status:** ⚠️ **CRITICAL ISSUES FOUND**  
**Priority:** Must fix before Stripe integration

---

## Executive Summary

This audit identified **10 CRITICAL** security issues that must be resolved before integrating Stripe payments. The application currently has authentication disabled, exposed credentials, and multiple XSS vulnerabilities that pose significant risks to both users and payment processing.

**Risk Level:** 🔴 **CRITICAL** - Not production-ready for payment processing

---

## 🔴 CRITICAL ISSUES (Must Fix Immediately)

### 1. Authentication Middleware DISABLED
**File:** `middleware.ts:87-93`  
**Severity:** 🔴 CRITICAL  
**Impact:** All protected routes are accessible without authentication

```typescript
// TEMPORARILY DISABLE AUTH CHECK FOR TESTING
// TODO: Re-enable after fixing JWT token creation
// if (!token) {
//   const loginUrl = new URL('/login', req.url)
//   loginUrl.searchParams.set('callbackUrl', pathname)
//   return NextResponse.redirect(loginUrl)
// }
```

**Risk:**
- Anyone can access admin endpoints
- Payment endpoints will be unprotected
- User data exposed

**Fix Required:**
- Re-enable authentication check
- Fix JWT token creation issue
- Test all protected routes

---

### 2. PrismaAdapter Commented Out
**File:** `src/lib/auth.ts:9`  
**Severity:** 🔴 CRITICAL  
**Impact:** Sessions not persisted to database, vulnerable to token manipulation

```typescript
// adapter: PrismaAdapter(prisma), // Temporarily remove to fix webpack error
```

**Risk:**
- No database session validation
- Token replay attacks possible
- No session revocation capability
- Payment fraud risk

**Fix Required:**
- Re-enable PrismaAdapter
- Fix webpack error properly
- Implement session validation

---

### 3. Database Credentials Exposed
**Files:** `env.example`, `scripts/setup-neon.mjs`, `scripts/setup-production-env.mjs`  
**Severity:** 🔴 CRITICAL  
**Impact:** Production database credentials visible in repository

```bash
# env.example contains:
DATABASE_URL="postgresql://neondb_owner:npg_grz4csh0AWRl@ep-green-dawn-..."
```

**Risk:**
- Database compromise
- Data breach
- Financial data exposure (when Stripe integrated)

**Fix Required:**
- Remove all real credentials from repository
- Use placeholder values in examples
- Rotate all exposed credentials
- Add to `.gitignore` verification

---

### 4. Demo Auth Creating Users in Production
**File:** `app/api/community/messages/route.ts:96-105`  
**Severity:** 🔴 CRITICAL  
**Impact:** Unauthenticated users can post messages as demo users

```typescript
// Create a demo user for messages
const demoUser = await prisma.user.upsert({
  where: { email: 'demo-member@example.com' },
  update: {},
  create: {
    email: 'demo-member@example.com',
    name: 'Demo User',
    role: 'member',
  },
})
```

**Risk:**
- Spam attacks
- Unauthorized access
- Database pollution
- Payment fraud (when Stripe integrated)

**Fix Required:**
- Require authentication for message posting
- Remove demo user creation
- Validate user sessions

---

### 5. No Input Sanitization - XSS Vulnerabilities
**Files:** Multiple (see details below)  
**Severity:** 🔴 CRITICAL  
**Impact:** Stored XSS attacks possible in user-generated content

**Vulnerable Locations:**
1. **Messages** (`app/api/community/messages/route.ts:111`)
   - No sanitization before storing `body: text`

2. **Questions** (`src/lib/actions/questions.ts:63`)
   - No sanitization for `body` field

3. **Signal Thesis** (`src/components/signals/TradeDetail.tsx:254`)
   - Uses `dangerouslySetInnerHTML` without sanitization

4. **Content Body** (`src/components/admin/ContentForm.tsx:255`)
   - Uses `dangerouslySetInnerHTML` without sanitization

**Risk:**
- XSS attacks
- Session hijacking
- Payment form manipulation
- Credential theft

**Fix Required:**
- Install and configure `DOMPurify` or `isomorphic-dompurify`
- Sanitize all user inputs before storage
- Sanitize before rendering with `dangerouslySetInnerHTML`
- Validate and escape all outputs

---

### 6. File Upload Security Weaknesses
**Files:** `app/api/videos/route.ts`, `app/api/resources/upload/route.ts`  
**Severity:** 🔴 CRITICAL  
**Impact:** Malicious file uploads possible

**Issues:**
- MIME type validation only (easily spoofed)
- No file content scanning
- No virus/malware detection
- File size limits but no rate limiting on uploads
- No filename sanitization

```typescript
// Current validation is insufficient:
if (file.type !== 'application/pdf') {
  return NextResponse.json({ ok: false, message: 'Only PDF files are allowed' }, { status: 400 })
}
```

**Risk:**
- Malware uploads
- Server compromise
- Data exfiltration
- Payment system compromise

**Fix Required:**
- Implement file content verification (magic bytes)
- Add virus scanning (ClamAV or cloud service)
- Strict filename sanitization
- Rate limit upload endpoints
- Store files outside web root with controlled access

---

### 7. Rate Limiting Uses In-Memory Store
**File:** `src/lib/rate-limit.ts`, `src/lib/security.ts`  
**Severity:** 🔴 CRITICAL  
**Impact:** Rate limiting won't work in serverless/production

```typescript
const rateLimitStore = new Map<string, RateLimitEntry>()
```

**Risk:**
- No rate limiting in production
- DDoS attacks
- Brute force attacks
- Payment endpoint abuse

**Fix Required:**
- Implement Redis-based rate limiting
- Use Vercel Edge Config or Upstash Redis
- Configure proper limits for payment endpoints

---

### 8. CSRF Protection Disabled in Development
**File:** `src/lib/security.ts:71-73`  
**Severity:** 🔴 CRITICAL  
**Impact:** CSRF protection not enforced

```typescript
// In development, be more lenient
if (process.env.NODE_ENV === 'development') {
  return null
}
```

**Risk:**
- CSRF attacks in development
- Risk of shipping to production with weak protection
- Payment form manipulation

**Fix Required:**
- Enable CSRF in all environments
- Use NextAuth CSRF tokens
- Validate on all state-changing operations

---

### 9. Excessive Console Logging
**Files:** Multiple API routes  
**Severity:** 🔴 CRITICAL  
**Impact:** Sensitive data exposed in logs

**Found:** 148+ `console.log/error/warn` statements across 39 files

**Examples:**
```typescript
console.log('🔐 Session check:', {
  hasSession: !!session,
  userId: session?.user?.id,
  userRole: session?.user?.role,
  userEmail: session?.user?.email  // ⚠️ Sensitive!
})
```

**Risk:**
- Credential exposure in logs
- Payment data leakage
- User privacy violations
- GDPR violations

**Fix Required:**
- Remove all sensitive data from logs
- Use structured logging (Winston/Pino)
- Mask PII in production
- Environment-based log levels

---

### 10. No Webhook Signature Verification
**Severity:** 🔴 CRITICAL  
**Impact:** Cannot securely receive Stripe webhooks

**Current State:** No webhook endpoint exists

**Risk:**
- Webhook replay attacks
- Payment status manipulation
- Subscription fraud

**Fix Required:**
- Implement Stripe webhook endpoint
- Verify webhook signatures
- Implement idempotency checks
- Add webhook event logging

---

## 🟠 HIGH PRIORITY ISSUES

### 11. Inconsistent Authorization Checks
**Files:** Multiple admin API routes  
**Issue:** Some routes use `requireRole()`, others check manually

**Examples:**
- ✅ Good: `app/api/admin/episodes/route.ts` uses `requireRole`
- ❌ Bad: `app/api/admin/signals/route.ts` manually checks session

**Fix:** Standardize on `requireRole()` for all admin endpoints

---

### 12. No Environment Variable Validation
**Issue:** Missing runtime validation of required env vars

**Fix Required:**
- Use `zod` to validate env vars at startup
- Fail fast if critical vars missing
- Document all required variables

---

### 13. Missing Session Refresh Logic
**Issue:** Sessions last 30 days with no refresh mechanism

**Risk:** Stolen tokens valid for extended period

**Fix Required:**
- Implement refresh token rotation
- Shorter access token lifetime
- Session activity tracking

---

### 14. Error Messages May Expose Sensitive Info
**Files:** Multiple API routes  
**Issue:** Generic errors sometimes include internal details

**Fix Required:**
- Standardize error responses
- Never expose stack traces in production
- Use error codes instead of messages

---

## 🟡 MEDIUM PRIORITY ISSUES

### 15. No Request Size Limits
**Issue:** No explicit request body size limits

**Risk:** Memory exhaustion attacks

**Fix:** Configure Next.js body size limits

---

### 16. Security Headers Could Be Stricter
**File:** `src/lib/security.ts:92-100`  
**Issue:** CSP allows `unsafe-inline` and `unsafe-eval`

```typescript
"script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // ⚠️ Too permissive
```

**Fix:** Remove unsafe directives, use nonces

---

### 17. No Content-Type Validation
**Issue:** Some endpoints accept any content type

**Fix:** Strict content-type validation

---

### 18. Missing Audit Trail for Critical Operations
**Issue:** Not all write operations are audited

**Fix:** Ensure all payment-related operations are audited

---

## 📋 Security Checklist Before Stripe Integration

### Authentication & Authorization
- [ ] Re-enable authentication middleware
- [ ] Fix PrismaAdapter and enable database sessions
- [ ] Remove demo user creation in production code
- [ ] Standardize authorization checks (use `requireRole()`)
- [ ] Implement session refresh logic
- [ ] Add session activity tracking

### Input Validation & Sanitization
- [ ] Install and configure DOMPurify
- [ ] Sanitize all user inputs before storage
- [ ] Sanitize before `dangerouslySetInnerHTML`
- [ ] Remove all `dangerouslySetInnerHTML` where possible
- [ ] Validate file content (not just MIME type)
- [ ] Implement strict filename sanitization

### File Upload Security
- [ ] Add file content verification (magic bytes)
- [ ] Implement virus scanning
- [ ] Store uploads outside web root
- [ ] Add upload rate limiting
- [ ] Implement file access controls

### Secrets Management
- [ ] Remove all real credentials from repository
- [ ] Use placeholder values in examples
- [ ] Rotate all exposed credentials
- [ ] Verify `.env*` files in `.gitignore`
- [ ] Implement env var validation at startup

### Rate Limiting & DDoS Protection
- [ ] Implement Redis-based rate limiting
- [ ] Configure payment endpoint limits
- [ ] Add request size limits
- [ ] Implement circuit breaker pattern

### Webhook Security (Stripe)
- [ ] Create webhook endpoint `/api/webhooks/stripe`
- [ ] Implement signature verification
- [ ] Add idempotency checks
- [ ] Log all webhook events
- [ ] Handle webhook failures gracefully

### Logging & Monitoring
- [ ] Remove sensitive data from logs
- [ ] Implement structured logging
- [ ] Add log level configuration
- [ ] Set up monitoring/alerting
- [ ] Mask PII in production logs

### Error Handling
- [ ] Standardize error responses
- [ ] Never expose stack traces in production
- [ ] Use error codes
- [ ] Implement error tracking (Sentry)

### Security Headers
- [ ] Remove `unsafe-inline` and `unsafe-eval` from CSP
- [ ] Add HSTS header
- [ ] Implement nonce-based CSP
- [ ] Add Permissions Policy header

---

## 🛠️ Recommended Packages to Add

```json
{
  "dependencies": {
    "isomorphic-dompurify": "^2.9.0",           // XSS protection
    "@upstash/ratelimit": "^2.0.3",             // Redis rate limiting
    "@upstash/redis": "^1.32.0",                // Redis client
    "stripe": "^14.0.0",                        // Stripe SDK
    "winston": "^3.11.0",                       // Structured logging
    "file-type": "^19.0.0",                    // File content detection
    "zod": "^4.1.11"                           // Already have, use for env validation
  }
}
```

---

## 📊 Risk Assessment

| Category | Risk Level | Status |
|----------|-----------|--------|
| Authentication | 🔴 Critical | ⚠️ Disabled |
| Authorization | 🟠 High | ⚠️ Inconsistent |
| Input Validation | 🔴 Critical | ❌ Missing |
| File Upload | 🔴 Critical | ⚠️ Weak |
| Secrets Management | 🔴 Critical | ❌ Exposed |
| Rate Limiting | 🔴 Critical | ❌ In-memory |
| CSRF Protection | 🔴 Critical | ⚠️ Disabled in dev |
| Logging | 🔴 Critical | ⚠️ Exposes PII |
| Webhook Security | 🔴 Critical | ❌ Not implemented |
| Error Handling | 🟠 High | ⚠️ Inconsistent |

**Overall Risk:** 🔴 **CRITICAL - NOT PRODUCTION READY**

---

## 🚀 Implementation Priority

### Phase 1: Critical Fixes (Before Any Testing)
1. Remove exposed credentials
2. Re-enable authentication
3. Fix PrismaAdapter
4. Remove demo user creation
5. Install DOMPurify

### Phase 2: Core Security (Before Stripe Integration)
6. Sanitize all user inputs
7. Implement Redis rate limiting
8. Fix file upload security
9. Remove sensitive console.logs
10. Enable CSRF protection

### Phase 3: Stripe Preparation
11. Implement webhook endpoint
12. Add webhook signature verification
13. Set up audit logging for payments
14. Add request size limits

### Phase 4: Production Hardening
15. Strict security headers
16. Environment validation
17. Structured logging
18. Error tracking

---

## ⚠️ Next Steps

1. **Immediate Action:** Do NOT deploy to production until Critical fixes are complete
2. **Before Stripe:** Complete Phase 1 and Phase 2
3. **Testing:** Security testing after each phase
4. **Documentation:** Update security policies

---

## 📝 Notes

- This audit focused on pre-payment integration security
- Additional security considerations needed for PCI compliance
- Consider security audit by third-party before processing real payments
- Regular security scans recommended

---

**Report Generated:** December 2024  
**Auditor:** AI Security Audit  
**Status:** ⚠️ **ACTION REQUIRED**

