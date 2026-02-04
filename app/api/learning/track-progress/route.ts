import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { isDynamicServerUsageError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const url = new URL(req.url)
    const trackId = url.searchParams.get('trackId')

    if (!trackId) {
      return NextResponse.json(
        { error: 'trackId is required' },
        { status: 400 }
      )
    }

    // Get total published lessons in track
    const totalLessons = await prisma.lesson.count({
      where: {
        trackId,
        publishedAt: { not: null },
      },
    })

    // Get completed published lessons for this user
    const completedLessons = await prisma.lessonProgress.count({
      where: {
        userId: session.user.id,
        lesson: {
          trackId,
          publishedAt: { not: null },
        },
        completedAt: { not: null },
      },
    })

    const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

    // Get enrollment to check streak and other data
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_trackId: {
          userId: session.user.id,
          trackId,
        },
      },
    })

    // Calculate streak (consecutive days with completed lessons in this track)
    const completedDates = await prisma.lessonProgress.findMany({
      where: {
        userId: session.user.id,
        lesson: {
          trackId,
          publishedAt: { not: null },
        },
        completedAt: { not: null },
      },
      select: {
        completedAt: true,
      },
      orderBy: {
        completedAt: 'desc',
      },
    })

    // Calculate streak
    let streak = 0
    if (completedDates.length > 0) {
      const dates = completedDates
        .map(p => p.completedAt?.toDateString())
        .filter(Boolean)
        .sort()
        .reverse()
      
      let currentDate = new Date()
      for (let i = 0; i < 30; i++) {
        const dateStr = currentDate.toDateString()
        if (dates.includes(dateStr)) {
          streak++
          currentDate.setDate(currentDate.getDate() - 1)
        } else {
          break
        }
      }
    }

    // Calculate total time spent in this track
    const timeSpentData = await prisma.lessonProgress.aggregate({
      where: {
        userId: session.user.id,
        lesson: {
          trackId,
          publishedAt: { not: null },
        },
      },
      _sum: {
        timeSpentMs: true,
      },
    })

    const timeSpentMs = timeSpentData._sum.timeSpentMs || 0

    return NextResponse.json({
      progressPct,
      completedLessons,
      totalLessons,
      streak,
      timeSpentMs,
      enrollment: enrollment ? {
        startedAt: enrollment.startedAt,
        completedAt: enrollment.completedAt,
      } : null,
    })
  } catch (error) {
    if (!isDynamicServerUsageError(error)) {
      console.error('Error fetching track progress:', error)
    }
    return NextResponse.json(
      { error: 'Failed to fetch track progress' },
      { status: 500 }
    )
  }
}

