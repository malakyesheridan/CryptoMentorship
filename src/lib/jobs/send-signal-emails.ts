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

    // Get all updates for all tiers published today
    // This ensures users get their tier's update regardless of which tier was just created

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

    // Get all updates for all tiers (to send appropriate tier to each user)
    const allTierSignals = await prisma.portfolioDailySignal.findMany({
      where: {
        publishedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)), // Today
        },
      },
      orderBy: { publishedAt: 'desc' },
    })

    // Get the most recent T1 (Growth) signal (even if not from today)
    // This ensures T1 users get updates even if signal was created on a previous day
    const t1Signal = await prisma.portfolioDailySignal.findFirst({
      where: {
        OR: [
          { tier: 'T1', category: null },
          { tier: 'T2', category: null }
        ]
      },
      orderBy: { publishedAt: 'desc' },
    })
    
    // For T2 (Elite), also get the most recent memecoin and majors signals (even if from different days)
    // This ensures T2 users always get both updates when available
    const t2MajorsSignal = await prisma.portfolioDailySignal.findFirst({
      where: {
        tier: 'T2',
        category: 'majors',
      },
      orderBy: { publishedAt: 'desc' },
    })
    
    const t2MemecoinsSignal = await prisma.portfolioDailySignal.findFirst({
      where: {
        tier: 'T2',
        category: 'memecoins',
      },
      orderBy: { publishedAt: 'desc' },
    })

    // Group updates by tier
    // Note: Old T2 (without category) becomes T1, old T3 becomes T2
    // T1 (Growth): tier === 'T1' OR (tier === 'T2' && category === null)
    // T2 (Elite): (tier === 'T2' && category !== null) OR tier === 'T3'
    const signalsByTier = {
      T1: allTierSignals.filter(s => 
        s.tier === 'T1' || (s.tier === 'T2' && !s.category)
      ),
      T2: allTierSignals.filter(s => 
        (s.tier === 'T2' && s.category !== null) || s.tier === 'T3'
      ),
    }
    
    // Add the most recent T1 (Growth) signal if it exists (even if not from today)
    // This ensures T1 users get updates even if signal was created on a previous day
    if (t1Signal && !signalsByTier.T1.find(s => s.id === t1Signal.id)) {
      signalsByTier.T1.push(t1Signal)
    }
    
    // Add the most recent T2 (Elite) signals if they exist (even if not from today)
    // This ensures T2 users get both majors and memecoins in one email
    if (t2MajorsSignal && !signalsByTier.T2.find(s => s.id === t2MajorsSignal.id)) {
      signalsByTier.T2.push(t2MajorsSignal)
    }
    if (t2MemecoinsSignal && !signalsByTier.T2.find(s => s.id === t2MemecoinsSignal.id)) {
      signalsByTier.T2.push(t2MemecoinsSignal)
    }
    
    // Also check for old T3 signals and map them to T2
    const oldT3MajorsSignal = await prisma.portfolioDailySignal.findFirst({
      where: {
        tier: 'T3',
        category: 'majors',
      },
      orderBy: { publishedAt: 'desc' },
    })
    
    const oldT3MemecoinsSignal = await prisma.portfolioDailySignal.findFirst({
      where: {
        tier: 'T3',
        category: 'memecoins',
      },
      orderBy: { publishedAt: 'desc' },
    })
    
    if (oldT3MajorsSignal && !signalsByTier.T2.find(s => s.id === oldT3MajorsSignal.id)) {
      signalsByTier.T2.push(oldT3MajorsSignal)
    }
    if (oldT3MemecoinsSignal && !signalsByTier.T2.find(s => s.id === oldT3MemecoinsSignal.id)) {
      signalsByTier.T2.push(oldT3MemecoinsSignal)
    }

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
      totalUsers: allUsers.length,
      eligibleUsers: eligibleUsers.length,
      t1SignalsCount: signalsByTier.T1.length,
      t2SignalsCount: signalsByTier.T2.length,
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

        // Get updates for this user's tier (their highest accessible tier)
        let signalsToSend: DailySignal[] = []

        if (userTier === 'T2') {
          // T2 (Elite) users get both majors and memecoins updates
          const t2Signals = signalsByTier.T2
          const majorsSignal = t2Signals.find(s => s.category === 'majors')
          const memecoinsSignal = t2Signals.find(s => s.category === 'memecoins')
          
          // Always add majors first (Market Rotation), then memecoins
          // This ensures proper ordering in the email: Market Rotation on top, Memecoins below
          if (majorsSignal) {
            signalsToSend.push(majorsSignal as DailySignal)
          }
          if (memecoinsSignal) {
            signalsToSend.push(memecoinsSignal as DailySignal)
          }
          
          // Log for debugging
          if (signalsToSend.length > 0) {
            logger.info('T2 (Elite) signals prepared for email', {
              userId: user.id,
              majorsFound: !!majorsSignal,
              memecoinsFound: !!memecoinsSignal,
              signalsToSendCount: signalsToSend.length,
              signalCategories: signalsToSend.map(s => s.category || 'none')
            })
          }
        } else if (userTier === 'T1') {
          // T1 (Growth) users get T1 update only
          const t1Signals = signalsByTier.T1
          if (t1Signals.length > 0) {
            signalsToSend.push(t1Signals[0] as DailySignal) // Most recent
            logger.info('T1 (Growth) signal prepared for email', {
              userId: user.id,
              signalId: t1Signals[0].id,
              signalTier: t1Signals[0].tier,
            })
          } else {
            logger.debug('No T1 signals found for user', {
              userId: user.id,
              userTier,
              t1SignalsCount: signalsByTier.T1.length,
            })
          }
        }

        if (signalsToSend.length === 0) {
          logger.debug('No updates found for user tier', { 
            userId: user.id, 
            userTier,
            signalId 
          })
          continue
        }

        // Check if we already sent an email notification for these updates today
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

        // Only send email if there are new updates
        if (unsentSignals.length === 0) {
          logger.debug('All updates already sent to user', { 
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

        // Send email with all updates (including ones we've already sent, for context)
        // But only create notifications for new ones
        await sendDailySignalEmail({
          to: user.email!,
          userName: user.name,
          signals: signalsToSend, // Send all updates in the email
          portfolioUrl,
          preferencesUrl,
        })

        // Create notification records only for updates we haven't sent yet
        for (const signal of unsentSignals) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'signal_published',
              entityType: 'content',
              entityId: signal.id,
              title: 'Daily Portfolio Update',
              body: `New portfolio update for ${tierLabels[signal.tier]}${signal.category === 'majors' ? ' Market Rotation' : signal.category === 'memecoins' ? ' Memecoins' : ''}`,
              url: portfolioUrl,
              channel: 'email',
              sentAt: new Date(),
            },
          })
        }

        results.sent++
        logger.info('Update email sent', { 
          userId: user.id, 
          userTier,
          signalCount: signalsToSend.length 
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

