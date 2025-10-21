import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Only allow this in development or for debugging
  if (process.env.NODE_ENV === 'production' && !request.headers.get('x-debug')) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const envCheck = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
    timestamp: new Date().toISOString()
  }

  return NextResponse.json(envCheck)
}
