import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { resolveNotificationPreferences, shouldSendInAppNotification } from '@/lib/notification-preferences'

const createNotificationSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(1000).optional(),
  url: z.string().url().optional().or(z.literal('')),
  type: z.enum(['announcement', 'portfolio_update', 'crypto_compass', 'learning_hub', 'community_mention', 'community_reply']).default('announcement'),
  userIds: z.array(z.string()).optional(), // If not provided, send to all users
})

// POST /api/admin/notifications - Create custom notification (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or editor
    if (session.user.role !== 'admin' && session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = createNotificationSchema.parse(body)

    // If userIds is provided, send to specific users
    // Otherwise, send to all active users
    let targetUserIds: string[] = []

    if (data.userIds && data.userIds.length > 0) {
      // Validate that all user IDs exist
      const users = await prisma.user.findMany({
        where: { id: { in: data.userIds } },
        select: { id: true },
      })
      targetUserIds = users.map(u => u.id)
    } else {
      // Get all active users (members, editors, admins)
      const allUsers = await prisma.user.findMany({
        where: {
          role: { in: ['member', 'editor', 'admin'] },
        },
        select: { id: true },
      })
      targetUserIds = allUsers.map(u => u.id)
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({ error: 'No users found to send notification to' }, { status: 400 })
    }

    const preferences = await prisma.notificationPreference.findMany({
      where: {
        userId: { in: targetUserIds }
      }
    })
    const preferenceMap = new Map(preferences.map((pref) => [pref.userId, pref]))
    const eligibleUserIds = targetUserIds.filter((userId) => {
      const prefs = resolveNotificationPreferences(preferenceMap.get(userId) ?? null)
      return shouldSendInAppNotification(data.type, prefs)
    })

    if (eligibleUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'No users eligible based on notification preferences'
      })
    }

    // Create notifications for eligible users
    const notifications = await prisma.notification.createMany({
      data: eligibleUserIds.map(userId => ({
        userId,
        type: data.type,
        title: data.title,
        body: data.body || null,
        url: data.url || null,
        channel: 'inapp', // Always in-app only
        sentAt: new Date(),
      })),
    })

    return NextResponse.json({
      success: true,
      count: notifications.count,
      message: `Notification sent to ${notifications.count} user(s)`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

