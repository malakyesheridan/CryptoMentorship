import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  // Only allow this in development or for debugging
  if (process.env.NODE_ENV === 'production' && !request.headers.get('x-debug')) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    // Test database connection
    await prisma.$connect()
    const userCount = await prisma.user.count()
    
    return NextResponse.json({
      success: true,
      database: 'CONNECTED',
      userCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      database: 'CONNECTION FAILED',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
