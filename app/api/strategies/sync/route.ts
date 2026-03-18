import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { enqueueEmail } from '@/lib/email-outbox'
import { EmailType } from '@prisma/client'

// POST /api/strategies/sync - Webhook from Python worker
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    const syncToken = request.headers.get('x-sync-token')
    const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET

    const isAuthorized =
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (cronSecret && syncToken === cronSecret)

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Revalidate strategy pages
    revalidatePath('/strategies')
    revalidatePath('/strategies/[slug]', 'page')

    // Check for new StrategyUpdate rows with notify=true that haven't been processed
    const pendingUpdates = await prisma.strategyUpdate.findMany({
      where: { notify: true },
      include: { strategy: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    let emailsQueued = 0

    if (pendingUpdates.length > 0) {
      // Find users who want portfolio update emails
      const subscribedUsers = await prisma.notificationPreference.findMany({
        where: { portfolioUpdatesEmail: true },
        select: {
          userId: true,
        },
      })

      const userIds = subscribedUsers.map((u) => u.userId)

      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, name: true },
      })

      for (const update of pendingUpdates) {
        for (const user of users) {
          await enqueueEmail({
            type: EmailType.NOTIFICATION_PORTFOLIO_UPDATE,
            toEmail: user.email,
            userId: user.id,
            payload: {
              templateKey: 'portfolio_update',
              subject: `Strategy Update: ${update.strategy.name}`,
              variables: {
                userName: user.name,
                strategyName: update.strategy.name,
                updateType: update.updateType,
                commentaryText: update.commentaryText,
                strategyUrl: `/strategies/${update.strategy.slug}`,
              },
            },
            idempotencyKey: `strategy-update-${update.id}-${user.id}`,
          })
          emailsQueued++
        }

        // Mark update as processed by clearing notify flag
        await prisma.strategyUpdate.update({
          where: { id: update.id },
          data: { notify: false },
        })
      }
    }

    return NextResponse.json({
      success: true,
      revalidated: true,
      pendingUpdates: pendingUpdates.length,
      emailsQueued,
    })
  } catch (error) {
    console.error('Error in strategies sync:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
