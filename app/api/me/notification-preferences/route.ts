import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { resolveNotificationPrefs } from '@/lib/notifications/preferences'

const preferencesSchema = z.object({
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  // per-type email
  portfolioUpdatesEmail: z.boolean(),
  cryptoCompassEmail: z.boolean(),
  learningHubEmail: z.boolean(),
  communityMentionsEmail: z.boolean(),
  communityRepliesEmail: z.boolean(),
  // per-type in-app
  portfolioUpdatesInApp: z.boolean(),
  cryptoCompassInApp: z.boolean(),
  learningHubInApp: z.boolean(),
  communityMentionsInApp: z.boolean(),
  communityRepliesInApp: z.boolean(),
  announcementsInApp: z.boolean(),
  eventRemindersInApp: z.boolean(),
  // digest
  digestEnabled: z.boolean(),
  digestFreq: z.enum(['daily', 'weekly']),
  digestHourUTC: z.number().min(0).max(23),
})

function toDbPayload(input: z.infer<typeof preferencesSchema>) {
  return {
    inAppEnabled: input.inAppEnabled,
    emailEnabled: input.emailEnabled,
    portfolioUpdatesEmail: input.portfolioUpdatesEmail,
    cryptoCompassEmail: input.cryptoCompassEmail,
    learningHubEmail: input.learningHubEmail,
    communityMentionsEmail: input.communityMentionsEmail,
    communityRepliesEmail: input.communityRepliesEmail,
    portfolioUpdatesInApp: input.portfolioUpdatesInApp,
    cryptoCompassInApp: input.cryptoCompassInApp,
    learningHubInApp: input.learningHubInApp,
    communityMentionsInApp: input.communityMentionsInApp,
    communityRepliesInApp: input.communityRepliesInApp,
    announcementsInApp: input.announcementsInApp,
    eventRemindersInApp: input.eventRemindersInApp,
    digestEnabled: input.digestEnabled,
    digestFreq: input.digestFreq,
    digestHourUTC: input.digestHourUTC,
  }
}

function serializeResponse(preference: {
  userId: string
  digestEnabled: boolean
  digestFreq: string
  digestHourUTC: number
  inAppEnabled?: boolean
  emailEnabled?: boolean
  portfolioUpdatesEmail?: boolean
  cryptoCompassEmail?: boolean
  learningHubEmail?: boolean
  communityMentionsEmail?: boolean
  communityRepliesEmail?: boolean
  portfolioUpdatesInApp?: boolean
  cryptoCompassInApp?: boolean
  learningHubInApp?: boolean
  communityMentionsInApp?: boolean
  communityRepliesInApp?: boolean
  announcementsInApp?: boolean
  eventRemindersInApp?: boolean
}) {
  const resolved = resolveNotificationPrefs(preference)
  const digestFreq = preference.digestFreq === 'daily' ? 'daily' : 'weekly'

  return {
    userId: preference.userId,
    ...resolved,
    digestEnabled: preference.digestEnabled,
    digestFreq,
    digestHourUTC: preference.digestHourUTC,
  }
}

// GET /api/me/notification-preferences - Get user's notification preferences
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId: session.user.id },
    })

    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId: session.user.id,
        },
      })
    }

    return NextResponse.json(serializeResponse(preferences))
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/me/notification-preferences - Update user's notification preferences
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = preferencesSchema.parse(body)

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: session.user.id },
      update: toDbPayload(validated),
      create: {
        userId: session.user.id,
        ...toDbPayload(validated),
      },
    })

    return NextResponse.json(serializeResponse(preferences))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }
    console.error('Error updating notification preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
