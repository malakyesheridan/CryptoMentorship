import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { revalidatePath } from 'next/cache'

const reorderSchema = z.object({
  channelIds: z.array(z.string()).min(1),
})

// POST /api/admin/channels/reorder - Reorder channels (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { channelIds } = reorderSchema.parse(body)

    // Update order for each channel
    await prisma.$transaction(
      channelIds.map((channelId, index) =>
        prisma.channel.update({
          where: { id: channelId },
          data: { order: index },
        })
      )
    )

    // Immediately revalidate the channels cache
    try {
      revalidatePath('/api/channels-minimal')
      revalidatePath('/api/community/channels')
      revalidatePath('/community')
    } catch (error) {
      // Log but don't fail the operation if revalidation fails
      console.error('Error revalidating cache after channel reorder:', error)
    }

    logger.info('Channels reordered', {
      channelIds,
      reorderedBy: session.user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    logger.error(
      'Error reordering channels',
      error instanceof Error ? error : new Error(String(error))
    )

    return NextResponse.json(
      { error: 'Failed to reorder channels' },
      { status: 500 }
    )
  }
}

