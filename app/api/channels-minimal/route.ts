import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveSubscription } from '@/lib/access'

// Make dynamic to allow immediate updates after reordering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  await requireActiveSubscription('api')
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
