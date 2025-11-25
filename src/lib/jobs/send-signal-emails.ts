import { prisma } from '@/lib/prisma'
import { sendDailySignalEmail } from '@/lib/email-templates'
import { logger } from '@/lib/logger'

interface DailySignal {
  id: string
  tier: 'T1' | 'T2' | 'T3'
  category?: 'majors' | 'memecoins' | null
  signal: string
  executiveSummary?: string | null
  associatedData?: string | null
  publishedAt: Date
}

/**
 * Send email notifications for daily portfolio signals
 * Users receive emails for their highest accessible tier only
 * T3 users receive both majors and memecoins signals in one email
 */
export async function sendSignalEmails(signalId: string): Promise<void> {
  try {
    // Get the signal that was just created
    const createdSignal = await prisma.portfolioDailySignal.findUnique({
      where: { id: signalId },
    })

    if (!createdSignal) {
      logger.warn('Signal not found for email sending', { signalId })
      return
    }

    // Get all signals for all tiers published today
    // This ensures users get their tier's signal regardless of which tier was just created

    // Get all users with active/trial memberships
    const allUsers = await prisma.user.findMany({
      where: {
        role: { in: ['member', 'editor', 'admin'] },
        email: { isNot: null },
      },
      include: {
        memberships: {
          where: {
            status: { in: ['active', 'trial'] },
            currentPeriodEnd: { gte: new Date() }, // Not expired
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        notificationPreference: true,
      },
    })

    // Get all signals for all tiers (to send appropriate tier to each user)
    const allTierSignals = await prisma.portfolioDailySignal.findMany({
      where: {
        publishedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)), // Today
        },
      },
      orderBy: { publishedAt: 'desc' },
    })

    // Group signals by tier
    const signalsByTier = {
      T1: allTierSignals.filter(s => s.tier === 'T1' && !s.category),
      T2: allTierSignals.filter(s => s.tier === 'T2' && !s.category),
      T3: allTierSignals.filter(s => s.tier === 'T3'),
    }

    // Filter users by email preferences (we'll check tier access when sending)
    const eligibleUsers = allUsers.filter(user => {
      // Must have active subscription
      if (user.memberships.length === 0) return false

      // Check email preferences
      const prefs = user.notificationPreference
      if (!prefs) return false
      if (!prefs.email) return false
      if (!prefs.onSignal) return false

      return true
    })

    if (eligibleUsers.length === 0) {
      logger.info('No eligible users for signal email', { 
        signalId, 
        tier: createdSignal.tier 
      })
      return
    }

    // Group users by tier and send emails
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const user of eligibleUsers) {
      try {
        const membership = user.memberships[0]
        const userTier = membership.tier as 'T1' | 'T2' | 'T3'

        // Get signals for this user's tier (their highest accessible tier)
        let signalsToSend: DailySignal[] = []

        if (userTier === 'T3') {
          // T3 users get both majors and memecoins signals
          const t3Signals = signalsByTier.T3
          const majorsSignal = t3Signals.find(s => s.category === 'majors')
          const memecoinsSignal = t3Signals.find(s => s.category === 'memecoins')
          
          if (majorsSignal) signalsToSend.push(majorsSignal as DailySignal)
          if (memecoinsSignal) signalsToSend.push(memecoinsSignal as DailySignal)
        } else if (userTier === 'T2') {
          // T2 users get T2 signal only
          const t2Signals = signalsByTier.T2
          if (t2Signals.length > 0) {
            signalsToSend.push(t2Signals[0] as DailySignal) // Most recent
          }
        } else if (userTier === 'T1') {
          // T1 users get T1 signal only
          const t1Signals = signalsByTier.T1
          if (t1Signals.length > 0) {
            signalsToSend.push(t1Signals[0] as DailySignal) // Most recent
          }
        }

        if (signalsToSend.length === 0) {
          logger.debug('No signals found for user tier', { 
            userId: user.id, 
            userTier,
            signalId 
          })
          continue
        }

        // Check if we already sent an email notification for these signals today
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const existingNotifications = await prisma.notification.findMany({
          where: {
            userId: user.id,
            type: 'signal_published',
            channel: 'email',
            entityId: { in: signalsToSend.map(s => s.id) },
            sentAt: { gte: today },
          },
        })

        const sentSignalIds = new Set(existingNotifications.map(n => n.entityId))
        const unsentSignals = signalsToSend.filter(s => !sentSignalIds.has(s.id))

        // Only send email if there are new signals
        if (unsentSignals.length === 0) {
          logger.debug('All signals already sent to user', { 
            userId: user.id, 
            userTier 
          })
          continue
        }

        // Build URLs
        let baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
        // Ensure URL has protocol
        if (baseUrl && !baseUrl.startsWith('http')) {
          baseUrl = `https://${baseUrl}`
        }
        const portfolioUrl = `${baseUrl}/portfolio`
        const preferencesUrl = `${baseUrl}/account`

        // Send email with all signals (including ones we've already sent, for context)
        // But only create notifications for new ones
        await sendDailySignalEmail({
          to: user.email!,
          userName: user.name,
          signals: signalsToSend, // Send all signals in the email
          portfolioUrl,
          preferencesUrl,
        })

        // Create notification records only for signals we haven't sent yet
        for (const signal of unsentSignals) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'signal_published',
              entityType: 'content',
              entityId: signal.id,
              title: 'Daily Portfolio Update',
              body: `New portfolio signal for ${tierLabels[signal.tier]}${signal.category === 'majors' ? ' Market Rotation' : signal.category === 'memecoins' ? ' Memecoins' : ''}`,
              url: portfolioUrl,
              channel: 'email',
              sentAt: new Date(),
            },
          })
        }

        results.sent++
        logger.info('Signal email sent', { 
          userId: user.id, 
          userTier,
          signalCount: signalsToSend.length 
        })
      } catch (error) {
        results.failed++
        const errorMsg = error instanceof Error ? error.message : String(error)
        results.errors.push(`User ${user.id}: ${errorMsg}`)
        logger.error('Failed to send signal email', error instanceof Error ? error : new Error(String(error)), {
          userId: user.id,
          signalId,
        })
      }
    }

    logger.info('Signal email sending completed', {
      signalId,
      tier: createdSignal.tier,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
    })
  } catch (error) {
    logger.error('Error in sendSignalEmails', error instanceof Error ? error : new Error(String(error)), {
      signalId,
    })
    // Don't throw - this is fire-and-forget
  }
}

const tierLabels: Record<'T1' | 'T2' | 'T3', string> = {
  T1: 'T1 - Basic Tier',
  T2: 'T2 - Premium Tier',
  T3: 'T3 - Elite Tier',
}

