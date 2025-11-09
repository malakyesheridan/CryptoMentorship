import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    logger.debug('Simple channels API called')
    
    // Test basic Prisma connection
    logger.debug('Testing Prisma connection')
    const count = await prisma.channel.count()
    logger.debug('Prisma connection verified', { channelCount: count })
    
    // Test the exact query from the main API
    logger.debug('Fetching channels')
    const rows = await prisma.channel.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    })
    logger.debug('Channels fetched', { count: rows.length })
    
    return NextResponse.json({ 
      ok: true, 
      count,
      channels: rows.length,
      sample: rows[0] || null
    })
  } catch (error) {
    logger.error(
      'Simple channels API error',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      { 
        ok: false, 
        message: 'Simple API failed', 
        error: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : 'Unknown'
      },
      { status: 500 }
    )
  }
}
