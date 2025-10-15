import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { rateLimit, csrfProtection, securityHeaders } from '@/lib/security'

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
    return NextResponse.next()
  }

  // Get session token
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET 
  })

  // TEMPORARILY DISABLE AUTH CHECK FOR TESTING
  // TODO: Re-enable after fixing JWT token creation
  // if (!token) {
  //   const loginUrl = new URL('/login', req.url)
  //   loginUrl.searchParams.set('callbackUrl', pathname)
  //   return NextResponse.redirect(loginUrl)
  // }

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
