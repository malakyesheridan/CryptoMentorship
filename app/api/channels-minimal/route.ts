import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Ultra-minimal query - just get all channels without any filters
    const channels = await prisma.channel.findMany()
    
    return NextResponse.json({ 
      ok: true, 
      items: channels.map(channel => ({
        id: channel.id,
        name: channel.name,
        description: channel.description || '',
        createdAt: channel.createdAt.toISOString(),
      }))
    })
  } catch (error) {
    console.error('Minimal API error:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
