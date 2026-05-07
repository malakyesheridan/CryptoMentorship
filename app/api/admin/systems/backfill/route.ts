import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { assignAllActiveSystems } from '@/lib/systems/assign'

export const dynamic = 'force-dynamic'

// Mirror the cron-route auth pattern (see app/api/cron/signal-bridge/route.ts).
// Returns true when the request carries a valid CRON_SECRET / VERCEL_CRON_SECRET
// /INTERNAL_DISPATCH_SECRET via Authorization: Bearer / x-internal-job-token /
// ?secret=, or arrives from Vercel's cron infrastructure.
function authorizeBearerFallback(request: NextRequest): boolean {
  const cronSecret = process.env.VERCEL_CRON_SECRET || process.env.CRON_SECRET
  const internalDispatchSecret =
    process.env.INTERNAL_DISPATCH_SECRET || process.env.NEXTAUTH_SECRET

  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : ''
  const querySecret = request.nextUrl.searchParams.get('secret') || ''
  const internalToken = request.headers.get('x-internal-job-token') || ''

  if (isVercelCron) return true
  if (cronSecret && (bearer === cronSecret || querySecret === cronSecret)) return true
  if (
    internalDispatchSecret &&
    (internalToken === internalDispatchSecret || bearer === internalDispatchSecret)
  )
    return true
  return false
}

// POST /api/admin/systems/backfill
//
// Auth: admin NextAuth session OR Bearer cron secret. The Bearer path was
// added so ops tasks (re-running the backfill after a new system ships)
// can fire from a CLI without a browser session.
//
// Behaviour: writes UserSystemAssignment rows with isActive=true for every
// active/trial member who's missing one for any registry slug. Idempotent —
// re-running is a no-op once every member has all five rows. Explicit
// opt-outs (isActive=false rows) are preserved, never reactivated.
export async function POST(request: NextRequest) {
  try {
    let runByLabel = 'cron-secret'
    if (!authorizeBearerFallback(request)) {
      const { user: adminUser } = await requireRoleAPI(['admin'])
      runByLabel = adminUser.id
    }

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
        assignedBy: runByLabel === 'cron-secret' ? null : runByLabel,
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
      runBy: runByLabel,
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
