import { prisma } from '@/lib/prisma'
import { sendDailySignalEmail } from '@/lib/email-templates'
import { logger } from '@/lib/logger'

interface DailySignal {
  id: string
  tier: 'T1' | 'T2'
  category?: 'majors' | 'memecoins' | null
  signal: string
  executiveSummary?: string | null
  associatedData?: string | null
  publishedAt: Date
}

/**
 * Send email notifications for daily portfolio updates
 * Users receive emails for their highest accessible tier only
 * T2 (Elite) users receive both majors and memecoins updates in one email
 */
export async function sendSignalEmails(signalId: string): Promise<void> {
  try {
    // Get the update that was just created
    const createdSignal = await prisma.portfolioDailySignal.findUnique({
      where: { id: signalId },
    })

    if (!createdSignal) {
      logger.warn('Update not found for email sending', { signalId })
      return
    }

    // Get all users with active/trial memberships
    // Note: email is required in User model, so no need to filter for null
    const allUsers = await prisma.user.findMany({
      where: {
        role: { in: ['member', 'editor', 'admin'] },
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

    // Filter users by email preferences (we'll check tier access when sending)
    // If user doesn't have preferences, use defaults (email: true, onSignal: true)
    const eligibleUsers = allUsers.filter(user => {
      // Must have active subscription
      if (user.memberships.length === 0) return false

      // Check email preferences
      const prefs = user.notificationPreference
      
      // If no preferences exist, use defaults (email enabled for signals by default)
      // This matches the behavior in /api/me/notification-preferences
      if (!prefs) {
        // Default: email enabled, onSignal enabled
        return true
      }
      
      // If preferences exist, check if email and onSignal are enabled
      if (!prefs.email) return false
      if (!prefs.onSignal) return false

      return true
    })

    logger.info('Email sending preparation', {
      signalId,
      tier: createdSignal.tier,
      category: createdSignal.category,
      publishedAt: createdSignal.publishedAt.toISOString(),
      totalUsers: allUsers.length,
      eligibleUsers: eligibleUsers.length,
    })

    if (eligibleUsers.length === 0) {
      logger.info('No eligible users for update email', { 
        signalId, 
        tier: createdSignal.tier,
        totalUsers: allUsers.length,
        reason: 'No users with email preferences enabled or active memberships'
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
        const rawUserTier = membership.tier as 'T1' | 'T2' | 'T3'
        
        // Map old tiers to new tiers:
        // Old T1 → removed (no access)
        // Old T2 → new T1 (Growth)
        // Old T3 → new T2 (Elite)
        let userTier: 'T1' | 'T2' = 'T1'
        if (rawUserTier === 'T3') {
          userTier = 'T2' // Old T3 → new T2 (Elite)
        } else if (rawUserTier === 'T2') {
          userTier = 'T2' // T2 is now Elite (no mapping needed in new system)
        } else if (rawUserTier === 'T1') {
          userTier = 'T1' // T1 is now Growth (no mapping needed in new system)
        }
        // Old T1 users get no access (filtered out earlier)

        // Determine if this user should receive this signal based on their tier
        let shouldSend = false
        let signalToSend: DailySignal | null = null

        // Map the created signal's tier for comparison
        let signalTier: 'T1' | 'T2' = 'T1'
        if (createdSignal.tier === 'T3') {
          signalTier = 'T2' // Old T3 → new T2 (Elite)
        } else if (createdSignal.tier === 'T2' && createdSignal.category) {
          signalTier = 'T2' // T2 with category → T2 (Elite)
        } else if (createdSignal.tier === 'T2' && !createdSignal.category) {
          signalTier = 'T1' // T2 without category → T1 (Growth)
        } else if (createdSignal.tier === 'T1') {
          signalTier = 'T1' // T1 → T1 (Growth)
        }

        if (userTier === 'T2') {
          // T2 (Elite) users get T2 signals (with category) or old T3 signals
          if (signalTier === 'T2') {
            shouldSend = true
            signalToSend = createdSignal as DailySignal
          }
        } else if (userTier === 'T1') {
          // T1 (Growth) users get T1 signals (or T2 without category)
          if (signalTier === 'T1') {
            shouldSend = true
            signalToSend = createdSignal as DailySignal
          }
        }

        if (!shouldSend || !signalToSend) {
          logger.debug('User tier does not match signal tier', {
            userId: user.id,
            userTier,
            signalTier,
            signalId: createdSignal.id,
          })
          continue
        }

        // Always send email when signal is created or updated
        // No deduplication - user wants email on every create/update

        // Build URLs
        let baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
        // Ensure URL has protocol
        if (baseUrl && !baseUrl.startsWith('http')) {
          baseUrl = `https://${baseUrl}`
        }
        const portfolioUrl = `${baseUrl}/portfolio`
        const preferencesUrl = `${baseUrl}/account`

        // Send email with the exact signal that was just created/updated
        await sendDailySignalEmail({
          to: user.email!,
          userName: user.name,
          signals: [signalToSend], // Send only this exact signal
          portfolioUrl,
          preferencesUrl,
        })

        // Create notification record
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'signal_published',
            entityType: 'content',
            entityId: signalToSend.id,
            title: 'Daily Portfolio Update',
            body: `New portfolio update for ${tierLabels[signalTier]}${signalToSend.category === 'majors' ? ' Market Rotation' : signalToSend.category === 'memecoins' ? ' Memecoins' : ''}`,
            url: portfolioUrl,
            channel: 'email',
            sentAt: new Date(),
          },
        })

        results.sent++
        logger.info('Update email sent', { 
          userId: user.id, 
          userTier,
          signalId: signalToSend.id,
          signalTier,
          signalDate: signalToSend.publishedAt.toISOString(),
        })
      } catch (error) {
        results.failed++
        const errorMsg = error instanceof Error ? error.message : String(error)
        results.errors.push(`User ${user.id}: ${errorMsg}`)
        logger.error('Failed to send update email', error instanceof Error ? error : new Error(String(error)), {
          userId: user.id,
          signalId,
        })
      }
    }

    logger.info('Update email sending completed', {
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

const tierLabels: Record<'T1' | 'T2', string> = {
  T1: 'Growth',
  T2: 'Elite',
}

