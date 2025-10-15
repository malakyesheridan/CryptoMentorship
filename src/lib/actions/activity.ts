'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { revalidateDashboard } from '@/lib/revalidate'
import { z } from 'zod'

const ViewInput = z.object({
  entityType: z.enum(['content', 'episode', 'signal', 'resource', 'lesson', 'event']),
  entityId: z.string().min(1),
})

export async function recordView(rawInput: unknown) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { ok: false, reason: 'unauthenticated' } as const
  }

  const { entityType, entityId } = ViewInput.parse(rawInput)

  const now = new Date()

  await prisma.viewEvent.upsert({
    where: {
      userId_entityType_entityId: {
        userId: session.user.id,
        entityType,
        entityId,
      },
    },
    create: {
      userId: session.user.id,
      entityType,
      entityId,
      createdAt: now,
    },
    update: {
      createdAt: now,
    },
  })

  await revalidateDashboard(session.user.id)

  return { ok: true } as const
}


