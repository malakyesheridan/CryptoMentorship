import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { rateLimit, csrfProtection, securityHeaders } from '@/lib/security'

// Import the validated env to ensure secret matches
// Note: We can't import env.ts directly in middleware (runs at edge)
// So we'll replicate the logic but ensure it matches exactly
function getNextAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret || secret.length < 32) {
    return 'dev-secret-key-for-local-development-only-not-for-production-use'
  }
  return secret
}

// Get the cookie name - must match the cookie name configured in auth.ts
// Edge runtime doesn't always auto-detect __Secure- prefixed cookies
function getCookieName(): string {
  return process.env.NODE_ENV === 'production'
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token'
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // Apply security headers
  const response = securityHeaders(req)
  
  // Apply rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const rateLimitResponse = rateLimit(100, 60000)(req) // 100 requests per minute
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    // Apply CSRF protection for API routes
    const csrfResponse = csrfProtection(req)
    if (csrfResponse) {
      return csrfResponse
    }
  }
  
  // Allow public routes without authentication
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/subscribe',
    '/api/auth',
    '/api/auth/signin',
    '/api/auth/signout',
    '/api/auth/callback',
    '/api/auth/session',
    '/api/auth/providers',
    '/api/auth/csrf',
    '/api/auth/error',
    '/api/auth/verify-request',
    '/api/auth/signin/google',
    '/api/auth/signin/email',
    '/api/auth/signin/demo',
    '/api/auth/register',
    '/api/auth/reset-password',
    '/api/stripe',
    '/api/me/subscription-status',
    '/api/test',
    '/api/basic-test',
    '/api/test-auth',
    '/api/test-db',
    '/api/test-prisma',
    '/api/test-providers',
    '/api/test-video',
    '/api/test-video-create',
    '/api/debug-auth',
    '/api/auth-debug',
    '/api/auth-test',
    '/api/db-debug',
    '/api/debug-video',
    '/api/clear-session',
    '/api/channels-minimal',
    '/api/channels-simple',
    '/api/videos-simple',
    '/api/ticker',
    '/api/ticker/test',
    '/api/video-serve',
    '/api/events/calendar.ics',
    '/robots.txt',
    '/sitemap.xml',
    '/rss.xml',
    '/favicon.ico',
    '/_next',
    '/_vercel',
    '/vercel.json'
  ]

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  if (isPublicRoute) {
    return response
  }

  // Get session token - optimize for speed
  // Use the same secret logic as NextAuth (from src/lib/env.ts)
  const nextAuthSecret = getNextAuthSecret()
  
  // Get token - this is fast in Edge runtime (reads from cookie)
  const token = await getToken({ 
    req, 
    secret: nextAuthSecret,
    cookieName: getCookieName(), // Explicitly specify cookie name for Edge runtime
  })

  // ✅ Re-enable authentication check
  if (!token) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Define routes that don't require subscription
  const subscriptionExemptRoutes = [
    '/subscribe',
    '/account',
    '/account/subscription',
    '/api/stripe',
    '/api/auth',
    '/api/me/account',
    '/api/me/subscription-status',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
  ]
  
  // Check if current route requires subscription
  const requiresSubscription = !subscriptionExemptRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
  
  // If route requires subscription, check membership status
  // Note: We can't do async DB calls in middleware, so we'll check in the page/API route itself
  // Middleware just allows authenticated users through - subscription check happens at page level
  
  // Add user info to headers for server components
  response.headers.set('x-user-id', token?.sub || '')
  response.headers.set('x-user-role', token?.role || 'guest')
  response.headers.set('x-user-email', token?.email || '')
  
  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
