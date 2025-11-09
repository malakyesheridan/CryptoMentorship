# Login Flow Deep Analysis

## Current Flow (What Should Happen)

1. User submits login form → `handleCredentialsLogin()`
2. Calls `signIn('credentials', { email, password, redirect: false })`
3. NextAuth makes POST to `/api/auth/callback/credentials`
4. NextAuth calls `authorize()` function in `src/lib/auth.ts`
5. If successful, `authorize()` returns user object
6. NextAuth JWT callback creates token and sets cookie
7. `signIn()` returns `{ ok: true }` or `{ error: ... }`
8. Client code waits 300ms then redirects via `window.location.href = '/dashboard'`
9. Browser requests `/dashboard`
10. Middleware intercepts, calls `getToken()` to read cookie
11. If token found, allow access; if not, redirect to `/login`

## Root Cause Analysis

### Issue #1: Secret Mismatch Between NextAuth and Middleware

**Problem:**
- NextAuth uses `env.NEXTAUTH_SECRET` from `src/lib/env.ts` (which applies defaults)
- Middleware uses `process.env.NEXTAUTH_SECRET` directly (no defaults applied)
- Terminal check shows `NEXTAUTH_SECRET` is NOT SET in environment
- Even though both have fallbacks, they might not be using the same value

**Evidence:**
- Terminal: `NEXTAUTH_SECRET: NOT SET Length: 0`
- `env.ts` defaults to: `'dev-secret-key-for-local-development-only-not-for-production-use'`
- Middleware defaults to: `'dev-secret-key-for-local-development-only-not-for-production-use'` (same, but timing might differ)

**Impact:**
- If NextAuth encrypts cookie with one secret but middleware tries to decrypt with different secret, token will be null
- This causes redirect loop: login succeeds → cookie set → middleware can't read it → redirects to login

### Issue #2: Cookie May Not Be Set When Using `redirect: false`

**Problem:**
- When using `redirect: false`, NextAuth might not set the cookie immediately
- The 300ms wait might not be enough
- Cookie might be set with different name than expected

**Evidence:**
- `cookies.txt` shows `next-auth.callback-url` and `next-auth.csrf-token` but no `next-auth.session-token`
- This suggests the session cookie might not be set at all

### Issue #3: Cookie Name Configuration

**Problem:**
- NextAuth uses different cookie names in dev vs production:
  - Dev: `next-auth.session-token`
  - Prod (HTTPS): `__Secure-next-auth.session-token`
- Middleware's `getToken()` should auto-detect, but might not be working

### Issue #4: NEXTAUTH_URL Mismatch

**Problem:**
- `env.ts` defaults to `http://localhost:3000`
- But app might be running on `http://localhost:5001` or `http://localhost:5000`
- Cookie domain/path might be wrong

## Solution

### Fix 1: Ensure Middleware Uses Same Secret Logic as NextAuth

Make middleware use the validated env from `src/lib/env.ts` instead of raw `process.env`.

### Fix 2: Use NextAuth's Built-in Redirect

Instead of `redirect: false` + manual redirect, use `redirect: true` and let NextAuth handle it.

### Fix 3: Add Explicit Cookie Configuration

Configure NextAuth to explicitly set cookie name and ensure it's readable by middleware.

### Fix 4: Add Debug Logging

Add logging to see:
- What secret NextAuth is using
- What secret middleware is using
- What cookies are being set
- What cookies middleware can see

