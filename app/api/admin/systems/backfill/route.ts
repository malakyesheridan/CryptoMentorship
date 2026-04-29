import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { assignAllActiveSystems } from '@/lib/systems/assign'

export const dynamic = 'force-dynamic'

// POST /api/admin/systems/backfill
//
// DEPRECATED — kept for compatibility but no longer required for email
// delivery. The signal email pipeline switched to opt-out semantics:
// every user with an active/trial membership and email notifications on
// receives the daily digest by default. Explicit opt-outs are stored as
// UserSystemAssignment rows with isActive=false.
//
// This endpoint still works (writes UserSystemAssignment rows with
// isActive=true) and is harmless to call, but it no longer affects whether
// users receive emails. Useful only if a future feature wants explicit
// per-user, per-system "this user has been onboarded" provenance.
export async function POST(_request: NextRequest) {
  try {
    const { user: adminUser } = await requireRoleAPI(['admin'])

    const now = new Date()
    const memberships = await prisma.membership.findMany({
      where: {
        status: { in: ['active', 'trial'] },
        OR: [
          { currentPeriodEnd: null },
          { currentPeriodEnd: { gte: now } },
        ],
      },
      select: { userId: true },
    })

    let usersTouched = 0
    let assignmentsCreated = 0
    for (const m of memberships) {
      const created = await assignAllActiveSystems(m.userId, {
        assignedBy: adminUser.id,
      })
      if (created > 0) {
        usersTouched += 1
        assignmentsCreated += created
      }
    }

    logger.info('System assignment backfill complete', {
      memberships: memberships.length,
      usersTouched,
      assignmentsCreated,
      runBy: adminUser.id,
    })

    return NextResponse.json({
      success: true,
      memberships: memberships.length,
      usersTouched,
      assignmentsCreated,
    })
  } catch (error) {
    if (error instanceof Response) return error
    logger.error(
      'System assignment backfill failed',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      { error: 'Backfill failed' },
      { status: 500 }
    )
  }
}
