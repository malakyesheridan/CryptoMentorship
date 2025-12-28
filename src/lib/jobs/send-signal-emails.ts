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
    console.log('[sendSignalEmails] About to fetch users from database')
    logger.info('Fetching users for email sending', { signalId })
    
    let allUsers
    try {
      allUsers = await prisma.user.findMany({
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
      console.log('[sendSignalEmails] Users fetched:', allUsers.length)
      logger.info('Users fetched', { signalId, userCount: allUsers.length })
    } catch (error) {
      console.error('[sendSignalEmails] Error fetching users:', error)
      logger.error('Error fetching users', error instanceof Error ? error : new Error(String(error)), { signalId })
      throw error
    }

    // Filter users by email preferences (we'll check tier access when sending)
    // If user doesn't have preferences, use defaults (email: true, onSignal: true)
    console.log('[sendSignalEmails] Filtering eligible users')
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

    console.log('[sendSignalEmails] Eligible users filtered:', eligibleUsers.length)
    logger.info('Email sending preparation', {
      signalId,
      tier: createdSignal.tier,
      category: createdSignal.category,
      publishedAt: createdSignal.publishedAt.toISOString(),
      totalUsers: allUsers.length,
      eligibleUsers: eligibleUsers.length,
    })
    console.log('[sendSignalEmails] Email sending preparation:', {
      signalId,
      tier: createdSignal.tier,
      category: createdSignal.category,
      totalUsers: allUsers.length,
      eligibleUsers: eligibleUsers.length,
    })

    if (eligibleUsers.length === 0) {
      console.log('[sendSignalEmails] No eligible users - exiting early')
      logger.info('No eligible users for update email', { 
        signalId, 
        tier: createdSignal.tier,
        category: createdSignal.category,
        totalUsers: allUsers.length,
        reason: 'No users with email preferences enabled or active memberships'
      })
      return
    }

    console.log('[sendSignalEmails] Processing eligible users:', eligibleUsers.length)
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
        // Safety check - should never happen due to filter, but be defensive
        if (!user.memberships || user.memberships.length === 0) {
          logger.warn('User has no memberships despite being in eligibleUsers', { userId: user.id })
          continue
        }
        
        const membership = user.memberships[0]
        if (!membership) {
          logger.warn('User membership is null/undefined', { userId: user.id })
          continue
        }
        
        const rawUserTier = membership.tier as 'T1' | 'T2' | 'T3'
        
        // Map old tiers to new tiers:
        // Old T1 → removed (no access)
        // Old T2 without category → new T1 (Growth)
        // Old T2 with category → new T2 (Elite)
        // Old T3 → new T2 (Elite)
        // Current system: T1 = Growth, T2 = Elite
        if (rawUserTier === 'T3') {
          userTier = 'T2' // Old T3 → new T2 (Elite)
        } else if (rawUserTier === 'T2') {
          // T2 users in the current system are Elite
          userTier = 'T2' // T2 = Elite
        } else if (rawUserTier === 'T1') {
          userTier = 'T1' // T1 = Growth
        }

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

        // For T2 users, prepare signals array (may include both majors and memecoins)
        // Always put majors (market rotation) first, then memecoins
        let signalsForEmail: DailySignal[] = [signalToSend]
        let shouldSkipEmail = false
        
        if (userTier === 'T2' && signalTier === 'T2') {
          // Get the date of the created signal (start of day)
          const signalDate = new Date(createdSignal.publishedAt)
          signalDate.setHours(0, 0, 0, 0)
          const endOfDay = new Date(signalDate)
          endOfDay.setHours(23, 59, 59, 999)
          
          if (createdSignal.category === 'majors') {
            // If this is a majors signal, also fetch memecoins signal for the same day
            const memecoinsSignal = await prisma.portfolioDailySignal.findFirst({
              where: {
                tier: 'T2',
                category: 'memecoins',
                publishedAt: {
                  gte: signalDate,
                  lte: endOfDay,
                },
              },
              orderBy: { publishedAt: 'desc' },
            })
            
            if (memecoinsSignal) {
              // Both signals exist - include both in email
              signalsForEmail = [createdSignal as DailySignal, memecoinsSignal as DailySignal]
              logger.info('Found memecoins signal for same day - will include in email', {
                userId: user.id,
                majorsSignalId: createdSignal.id,
                memecoinsSignalId: memecoinsSignal.id,
              })
            } else {
              // Only majors exists - skip email (will be sent when memecoins is created)
              shouldSkipEmail = true
              logger.info('Skipping email for T2 majors signal - memecoins signal not yet created for same day', {
                userId: user.id,
                majorsSignalId: createdSignal.id,
                signalDate: signalDate.toISOString(),
              })
            }
          } else if (createdSignal.category === 'memecoins') {
            // If this is a memecoins signal, also fetch majors signal for the same day (put it first)
            const majorsSignal = await prisma.portfolioDailySignal.findFirst({
              where: {
                tier: 'T2',
                category: 'majors',
                publishedAt: {
                  gte: signalDate,
                  lte: endOfDay,
                },
              },
              orderBy: { publishedAt: 'desc' },
            })
            
            if (majorsSignal) {
              // Both signals exist - include both in email
              signalsForEmail = [majorsSignal as DailySignal, createdSignal as DailySignal]
              logger.info('Found majors signal for same day - will include in email', {
                userId: user.id,
                memecoinsSignalId: createdSignal.id,
                majorsSignalId: majorsSignal.id,
              })
            } else {
              // Only memecoins exists - skip email (will be sent when majors is created)
              shouldSkipEmail = true
              logger.info('Skipping email for T2 memecoins signal - majors signal not yet created for same day', {
                userId: user.id,
                memecoinsSignalId: createdSignal.id,
                signalDate: signalDate.toISOString(),
              })
            }
          }
        }
        
        // Skip email if we determined we should wait for the other signal
        if (shouldSkipEmail) {
          logger.info('Skipping email - will be sent when both signals are available', {
            userId: user.id,
            signalId: createdSignal.id,
            category: createdSignal.category,
          })
          continue
        }

        // Send email with the signals (may be one or two for T2 users)
        logger.info('About to send email', {
          userId: user.id,
          userEmail: user.email,
          userTier,
          signalId: signalToSend.id,
          signalTier,
          signalCategory: signalToSend.category,
          signalsCount: signalsForEmail.length,
        })
        console.log('[sendSignalEmails] About to send email to:', user.email, {
          userId: user.id,
          signalId: signalToSend.id,
          tier: signalTier,
          category: signalToSend.category,
          signalsCount: signalsForEmail.length,
        })
        
        await sendDailySignalEmail({
          to: user.email!,
          userName: user.name,
          signals: signalsForEmail, // Send all relevant signals (may include both majors and memecoins for T2)
          portfolioUrl,
          preferencesUrl,
        })
        
        logger.info('Email sent successfully', {
          userId: user.id,
          userEmail: user.email,
          signalId: signalToSend.id,
          signalsCount: signalsForEmail.length,
        })
        console.log('[sendSignalEmails] Email sent successfully to:', user.email, {
          signalsCount: signalsForEmail.length,
        })

        // Create notification record for each signal sent
        for (const signal of signalsForEmail) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'signal_published',
              entityType: 'content',
              entityId: signal.id,
              title: 'Daily Portfolio Update',
              body: `New portfolio update for ${tierLabels[signalTier]}${signal.category === 'majors' ? ' Market Rotation' : signal.category === 'memecoins' ? ' Memecoins' : ''}`,
              url: portfolioUrl,
              channel: 'email',
              sentAt: new Date(),
            },
          })
        }

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
    console.error('[sendSignalEmails] ERROR in sendSignalEmails:', error)
    logger.error('Error in sendSignalEmails', error instanceof Error ? error : new Error(String(error)), {
      signalId,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    })
    // Don't throw - this is fire-and-forget
  }
}

const tierLabels: Record<'T1' | 'T2', string> = {
  T1: 'Growth',
  T2: 'Elite',
}

