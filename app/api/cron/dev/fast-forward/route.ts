import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveNotificationPreferences, shouldSendInAppNotification } from '@/lib/notification-preferences'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const minutes = parseInt(searchParams.get('minutes') || '60')
    
    console.log(`⏰ Fast-forwarding ${minutes} minutes for testing`)
    
    // Simulate time advancement by adjusting the window
    const now = new Date()
    const simulatedTime = new Date(now.getTime() + minutes * 60 * 1000)
    
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
      message: `Fast-forwarded ${minutes} minutes`,
      stats: {
        releasesProcessed: dueReleases.length,
        notificationsCreated,
      },
      releases: dueReleases.map(release => ({
        lessonTitle: release.lesson.title,
        cohortTitle: release.cohort.title,
        releaseAt: release.releaseAt,
        enrolledMembers: release.cohort.enrollments.length,
      })),
    })
  } catch (error) {
    console.error('❌ Error in fast-forward cron:', error)
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
