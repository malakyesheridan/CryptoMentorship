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
  logger.info('sendSignalEmails called', { signalId })
  console.log('[sendSignalEmails] Function called with signalId:', signalId)
  try {
    // Get the update that was just created
    const createdSignal = await prisma.portfolioDailySignal.findUnique({
      where: { id: signalId },
    })

    if (!createdSignal) {
      logger.warn('Update not found for email sending', { signalId })
      console.warn('[sendSignalEmails] Signal not found:', signalId)
      return
    }

    logger.info('Signal found for email sending', {
      signalId: createdSignal.id,
      tier: createdSignal.tier,
      category: createdSignal.category,
      publishedAt: createdSignal.publishedAt.toISOString(),
    })
    console.log('[sendSignalEmails] Signal found:', {
      id: createdSignal.id,
      tier: createdSignal.tier,
      category: createdSignal.category,
    })

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
        category: createdSignal.category,
        totalUsers: allUsers.length,
        reason: 'No users with email preferences enabled or active memberships'
      })
      return
    }

    logger.info('Processing eligible users', {
      signalId,
      tier: createdSignal.tier,
      category: createdSignal.category,
      eligibleUsersCount: eligibleUsers.length,
    })

    // Group users by tier and send emails
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
      t1UsersProcessed: 0,
      t2UsersProcessed: 0,
      t1EmailsSent: 0,
      t2EmailsSent: 0,
      t1EmailsFailed: 0,
      t2EmailsFailed: 0,
    }

    for (const user of eligibleUsers) {
      // Declare userTier outside try block so it's accessible in catch block
      let userTier: 'T1' | 'T2' = 'T1'
      try {
        const membership = user.memberships[0]
        const rawUserTier = membership.tier as 'T1' | 'T2' | 'T3'
        
        // Map old tiers to new tiers:
        // Old T1 → removed (no access)
        // Old T2 → new T1 (Growth)
        // Old T3 → new T2 (Elite)
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
        const hasCategory = createdSignal.category !== null && createdSignal.category !== undefined && 
                           (createdSignal.category === 'majors' || createdSignal.category === 'memecoins')
        
        if (createdSignal.tier === 'T3') {
          signalTier = 'T2' // Old T3 → new T2 (Elite)
        } else if (createdSignal.tier === 'T2' && hasCategory) {
          signalTier = 'T2' // T2 with category → T2 (Elite)
        } else if (createdSignal.tier === 'T2' && !hasCategory) {
          signalTier = 'T1' // T2 without category → T1 (Growth)
        } else if (createdSignal.tier === 'T1') {
          signalTier = 'T1' // T1 → T1 (Growth)
        }

        logger.info('Tier matching check', {
          userId: user.id,
          userTier,
          signalTier,
          signalId: createdSignal.id,
          signalTierRaw: createdSignal.tier,
          signalCategory: createdSignal.category,
          hasCategory,
        })

        if (userTier === 'T2') {
          results.t2UsersProcessed++
          // T2 (Elite) users get T2 signals (with category) or old T3 signals
          if (signalTier === 'T2') {
            shouldSend = true
            signalToSend = createdSignal as DailySignal
            logger.info('T2 user matched with T2 signal - WILL SEND EMAIL', {
              userId: user.id,
              userEmail: user.email,
              signalId: createdSignal.id,
              category: createdSignal.category,
              signalTierRaw: createdSignal.tier,
            })
          } else {
            logger.info('T2 user did NOT match signal - skipping', {
              userId: user.id,
              userTier,
              signalTier,
              signalId: createdSignal.id,
              signalTierRaw: createdSignal.tier,
              signalCategory: createdSignal.category,
            })
          }
        } else if (userTier === 'T1') {
          results.t1UsersProcessed++
          // T1 (Growth) users get T1 signals (or T2 without category)
          if (signalTier === 'T1') {
            shouldSend = true
            signalToSend = createdSignal as DailySignal
            logger.info('T1 user matched with T1 signal - WILL SEND EMAIL', {
              userId: user.id,
              userEmail: user.email,
              signalId: createdSignal.id,
            })
          } else {
            logger.info('T1 user did NOT match signal - skipping', {
              userId: user.id,
              userTier,
              signalTier,
              signalId: createdSignal.id,
              signalTierRaw: createdSignal.tier,
            })
          }
        }

        if (!shouldSend || !signalToSend) {
          logger.info('User tier does not match signal tier - skipping email', {
            userId: user.id,
            userTier,
            signalTier,
            signalId: createdSignal.id,
            signalTierRaw: createdSignal.tier,
            signalCategory: createdSignal.category,
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
        logger.info('About to send email', {
          userId: user.id,
          userEmail: user.email,
          userTier,
          signalId: signalToSend.id,
          signalTier,
          signalCategory: signalToSend.category,
        })
        console.log('[sendSignalEmails] About to send email to:', user.email, {
          userId: user.id,
          signalId: signalToSend.id,
          tier: signalTier,
          category: signalToSend.category,
        })
        
        await sendDailySignalEmail({
          to: user.email!,
          userName: user.name,
          signals: [signalToSend], // Send only this exact signal
          portfolioUrl,
          preferencesUrl,
        })
        
        logger.info('Email sent successfully', {
          userId: user.id,
          userEmail: user.email,
          signalId: signalToSend.id,
        })
        console.log('[sendSignalEmails] Email sent successfully to:', user.email)

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
        if (userTier === 'T1') {
          results.t1EmailsSent++
        } else if (userTier === 'T2') {
          results.t2EmailsSent++
        }
        logger.info('Update email sent', { 
          userId: user.id, 
          userTier,
          signalId: signalToSend.id,
          signalTier,
          signalDate: signalToSend.publishedAt.toISOString(),
        })
      } catch (error) {
        results.failed++
        if (userTier === 'T1') {
          results.t1EmailsFailed++
        } else if (userTier === 'T2') {
          results.t2EmailsFailed++
        }
        const errorMsg = error instanceof Error ? error.message : String(error)
        results.errors.push(`User ${user.id}: ${errorMsg}`)
        logger.error('Failed to send update email', error instanceof Error ? error : new Error(String(error)), {
          userId: user.id,
          signalId,
          userTier,
        })
      }
    }

    logger.info('Update email sending completed - SUMMARY', {
      signalId,
      signalTierRaw: createdSignal.tier,
      signalCategory: createdSignal.category,
      totalEligibleUsers: eligibleUsers.length,
      t1UsersProcessed: results.t1UsersProcessed,
      t2UsersProcessed: results.t2UsersProcessed,
      t1EmailsSent: results.t1EmailsSent,
      t2EmailsSent: results.t2EmailsSent,
      t1EmailsFailed: results.t1EmailsFailed,
      t2EmailsFailed: results.t2EmailsFailed,
      totalSent: results.sent,
      totalFailed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
    })
    console.log('[sendSignalEmails] SUMMARY:', {
      signalId,
      tier: createdSignal.tier,
      category: createdSignal.category,
      t1Users: results.t1UsersProcessed,
      t2Users: results.t2UsersProcessed,
      t1Sent: results.t1EmailsSent,
      t2Sent: results.t2EmailsSent,
      totalSent: results.sent,
      totalFailed: results.failed,
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

