import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRoleAPI } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getActiveSystems, isValidSystemSlug } from '@/lib/system-registry'

export const dynamic = 'force-dynamic'

// GET /api/admin/users/[userId]/systems
// Returns the user's current assignments + every system available to assign.
export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await requireRoleAPI(['admin'])

    const userId = params.userId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const assignments = await prisma.userSystemAssignment.findMany({
      where: { userId },
      orderBy: { systemSlug: 'asc' },
      select: {
        systemSlug: true,
        isActive: true,
        assignedAt: true,
      },
    })

    const availableSystems = getActiveSystems().map((s) => ({
      slug: s.slug,
      name: s.name,
      shortName: s.shortName,
      description: s.description,
    }))

    return NextResponse.json({
      userId,
      assignments,
      availableSystems,
    })
  } catch (error) {
    if (error instanceof Response) return error
    logger.error(
      'Failed to fetch user system assignments',
      error instanceof Error ? error : new Error(String(error)),
      { userId: params.userId }
    )
    return NextResponse.json(
      { error: 'Failed to fetch user system assignments' },
      { status: 500 }
    )
  }
}

const putBodySchema = z.object({
  systems: z.array(z.string().min(1)),
})

// PUT /api/admin/users/[userId]/systems
// Replace this user's full set of assignments with the supplied slugs.
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { user: adminUser } = await requireRoleAPI(['admin'])

    const userId = params.userId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    const parsed = putBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.issues.map((i) => ({
            path: i.path,
            message: i.message,
          })),
        },
        { status: 400 }
      )
    }

    const requestedSlugs = Array.from(new Set(parsed.data.systems))
    const invalid = requestedSlugs.filter((slug) => !isValidSystemSlug(slug))
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Unknown system slugs: ${invalid.join(', ')}` },
        { status: 400 }
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.userSystemAssignment.deleteMany({ where: { userId } })
      if (requestedSlugs.length > 0) {
        await tx.userSystemAssignment.createMany({
          data: requestedSlugs.map((slug) => ({
            userId,
            systemSlug: slug,
            isActive: true,
            assignedBy: adminUser.id,
          })),
        })
      }
      return tx.userSystemAssignment.findMany({
        where: { userId },
        orderBy: { systemSlug: 'asc' },
        select: { systemSlug: true, isActive: true, assignedAt: true },
      })
    })

    logger.info('User system assignments updated', {
      userId,
      slugs: requestedSlugs,
      updatedBy: adminUser.id,
    })

    return NextResponse.json({
      userId,
      assignments: updated,
    })
  } catch (error) {
    if (error instanceof Response) return error
    logger.error(
      'Failed to update user system assignments',
      error instanceof Error ? error : new Error(String(error)),
      { userId: params.userId }
    )
    return NextResponse.json(
      { error: 'Failed to update user system assignments' },
      { status: 500 }
    )
  }
}
