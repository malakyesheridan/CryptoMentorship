import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveNotificationPreferences, shouldSendInAppNotification } from '@/lib/notification-preferences'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const windowMinutes = parseInt(searchParams.get('window') || '5')
    const dryRun = searchParams.get('dryRun') === 'true'
    
    const now = new Date()
    const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000)
    
    console.log(`ðŸ”” Processing lesson releases between ${windowStart.toISOString()} and ${now.toISOString()}`)
    
    // Find lesson releases that are due
    const dueReleases = await prisma.lessonRelease.findMany({
      where: {
        releaseAt: {
          gte: windowStart,
          lte: now,
        },
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            slug: true,
            publishedAt: true,
            track: {
              select: {
                id: true,
                slug: true,
                title: true,
              },
            },
          },
        },
        cohort: {
          select: {
            id: true,
            title: true,
            slug: true,
            enrollments: {
              select: {
                userId: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    notificationPreference: true,
                  },
                },
              },
            },
          },
        },
      },
    })
    
    console.log(`ðŸ“… Found ${dueReleases.length} due releases`)
    
    if (dryRun) {
      return NextResponse.json({
        success: true,
        message: `Dry run: Would process ${dueReleases.length} releases`,
        releases: dueReleases.map(release => ({
          lessonTitle: release.lesson.title,
          cohortTitle: release.cohort.title,
          releaseAt: release.releaseAt,
          enrolledMembers: release.cohort.enrollments.length,
        })),
      })
    }
    
    let notificationsCreated = 0
    let errors = 0
    
    // Process each release
    for (const release of dueReleases) {
      try {
        // Skip if lesson is not published
        if (!release.lesson.publishedAt) {
          console.log(`âš ï¸ Skipping unpublished lesson: ${release.lesson.title}`)
          continue
        }
        
        // Create notifications for all enrolled members
        for (const enrollment of release.cohort.enrollments) {
          try {
            // Check if notification already exists (idempotent)
            const existingNotification = await prisma.notification.findFirst({
              where: {
                userId: enrollment.userId,
                type: 'announcement',
                title: 'New Lesson Available',
              },
            })
            
            if (existingNotification) {
              console.log(`ðŸ“§ Notification already exists for user ${enrollment.user.email}`)
              continue
            }

            const prefs = resolveNotificationPreferences(enrollment.user.notificationPreference ?? null)
            if (!shouldSendInAppNotification('announcement', prefs)) {
              continue
            }

            // Create notification
            await prisma.notification.create({
              data: {
                userId: enrollment.userId,
                type: 'announcement',
                title: 'New Lesson Available',
                body: `A new lesson "${release.lesson.title}" is now available in ${release.cohort.title}.`,
                url: `/learn/tracks/${release.lesson.track.slug}/lessons/${release.lesson.slug}`,
                channel: 'inapp',
              },
            })

            notificationsCreated++
            console.log(`ðŸ“§ Created notification for ${enrollment.user.email}`)
          } catch (error) {
            console.error(`âŒ Error creating notification for user ${enrollment.user.email}:`, error)
            errors++
          }
        }
      } catch (error) {
        console.error(`âŒ Error processing release for lesson ${release.lesson.title}:`, error)
        errors++
      }
    }
    
    console.log(`âœ… Processed ${dueReleases.length} releases: ${notificationsCreated} notifications created, ${errors} errors`)
    
    return NextResponse.json({
      success: true,
      message: `Processed ${dueReleases.length} releases`,
      stats: {
        releasesProcessed: dueReleases.length,
        notificationsCreated,
        errors,
      },
    })
  } catch (error) {
    console.error('âŒ Error in cohort releases cron:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process lesson releases',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Manual trigger for development/testing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fastForwardMinutes } = body
    
    if (!fastForwardMinutes || typeof fastForwardMinutes !== 'number') {
      return NextResponse.json(
        { success: false, error: 'fastForwardMinutes is required' },
        { status: 400 }
      )
    }
    
    console.log(`â° Fast-forwarding ${fastForwardMinutes} minutes for testing`)
    
    // Simulate time advancement by adjusting the window
    const now = new Date()
    const simulatedTime = new Date(now.getTime() + fastForwardMinutes * 60 * 1000)
    
    // Find releases that would be due at the simulated time
    const dueReleases = await prisma.lessonRelease.findMany({
      where: {
        releaseAt: {
          lte: simulatedTime,
        },
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            slug: true,
            publishedAt: true,
            track: {
              select: {
                id: true,
                slug: true,
                title: true,
              },
            },
          },
        },
        cohort: {
          select: {
            id: true,
            title: true,
            slug: true,
            enrollments: {
              select: {
                userId: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    notificationPreference: true,
                  },
                },
              },
            },
          },
        },
      },
    })
    
    let notificationsCreated = 0
    
    // Process releases
    for (const release of dueReleases) {
      if (!release.lesson.publishedAt) continue
      
      for (const enrollment of release.cohort.enrollments) {
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: enrollment.userId,
            type: 'announcement',
            title: 'New Lesson Available',
          },
        })
        
        if (!existingNotification) {
          const prefs = resolveNotificationPreferences(enrollment.user.notificationPreference ?? null)
          if (!shouldSendInAppNotification('announcement', prefs)) {
            continue
          }

          await prisma.notification.create({
            data: {
              userId: enrollment.userId,
              type: 'announcement',
              title: 'New Lesson Available',
              body: `A new lesson "${release.lesson.title}" is now available in ${release.cohort.title}.`,
              url: `/learn/tracks/${release.lesson.track.slug}/lessons/${release.lesson.slug}`,
              channel: 'inapp',
            },
          })
          notificationsCreated++
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Fast-forwarded ${fastForwardMinutes} minutes`,
      stats: {
        releasesProcessed: dueReleases.length,
        notificationsCreated,
      },
    })
  } catch (error) {
    console.error('âŒ Error in fast-forward cron:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fast-forward',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}



