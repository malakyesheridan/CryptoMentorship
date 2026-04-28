import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { isValidSystemSlug } from '@/lib/system-registry'

export const dynamic = 'force-dynamic'

const schema = z.object({
  systemSlug: z.string().min(1),
  accept: z.boolean(),
})

// POST /api/me/risk-onboarding/system-decision
// Toggles a single system on/off for the calling user. Updates both
// UserSystemRecommendation (accepted/declined flags) AND
// UserSystemAssignment (the actual delivery row). Idempotent.
export async function POST(request: NextRequest) {
  const user = await requireUser()
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      { status: 400 }
    )
  }

  const { systemSlug, accept } = parsed.data
  if (!isValidSystemSlug(systemSlug)) {
    return NextResponse.json({ error: `Unknown system: ${systemSlug}` }, { status: 400 })
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Recommendation row may not exist yet (e.g., user toggling before
      // completing the quiz). Update if present, ignore otherwise.
      const existing = await tx.userSystemRecommendation.findUnique({
        where: { userId_systemSlug: { userId: user.id, systemSlug } },
      })
      if (existing) {
        await tx.userSystemRecommendation.update({
          where: { userId_systemSlug: { userId: user.id, systemSlug } },
          data: {
            accepted: accept,
            declined: !accept,
          },
        })
      }

      if (accept) {
        await tx.userSystemAssignment.upsert({
          where: { userId_systemSlug: { userId: user.id, systemSlug } },
          create: {
            userId: user.id,
            systemSlug,
            isActive: true,
            assignedBy: null,
          },
          update: { isActive: true },
        })
      } else {
        await tx.userSystemAssignment.deleteMany({
          where: { userId: user.id, systemSlug },
        })
      }
    })
  } catch (error) {
    logger.error(
      'Failed to apply system decision',
      error instanceof Error ? error : new Error(String(error)),
      { userId: user.id, systemSlug, accept }
    )
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }

  return NextResponse.json({ success: true, systemSlug, accepted: accept })
}
