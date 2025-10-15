import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('Simple channels API called')
    console.log('Prisma client:', typeof prisma)
    console.log('Database URL:', process.env.DATABASE_URL)
    
    // Test basic Prisma connection
    console.log('Testing Prisma connection...')
    const count = await prisma.channel.count()
    console.log('Channel count:', count)
    
    // Test the exact query from the main API
    console.log('Testing exact query...')
    const rows = await prisma.channel.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    })
    console.log('Query result:', rows.length, 'channels')
    
    return NextResponse.json({ 
      ok: true, 
      count,
      channels: rows.length,
      sample: rows[0] || null
    })
  } catch (error) {
    console.error('Simple channels API error:', error)
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown')
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
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
