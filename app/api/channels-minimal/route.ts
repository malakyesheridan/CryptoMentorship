import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Cache for 5 minutes - channels don't change frequently
export const revalidate = 300

export async function GET() {
  try {
    // ✅ Return all channels - ordered by order field, then name
    const channels = await prisma.channel.findMany({
      orderBy: [
        { order: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        description: true,
        order: true,
        createdAt: true,
      }
    })
    
    return NextResponse.json({ 
      ok: true, 
      items: channels.map(channel => ({
        id: channel.id,
        name: channel.name,
        description: channel.description || '',
        order: channel.order,
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
