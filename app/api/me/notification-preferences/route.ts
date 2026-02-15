import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { resolveNotificationPrefs } from '@/lib/notifications/preferences'

const canonicalPreferencesSchema = z.object({
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  portfolioUpdatesEmail: z.boolean(),
  cryptoCompassEmail: z.boolean(),
  learningHubEmail: z.boolean(),
  communityMentionsEmail: z.boolean(),
  communityRepliesEmail: z.boolean(),
  digestEnabled: z.boolean(),
  digestFreq: z.enum(['daily', 'weekly']),
  digestHourUTC: z.number().min(0).max(23),
})

const legacyPreferencesSchema = z.object({
  inApp: z.boolean(),
  email: z.boolean(),
  onResearch: z.boolean(),
  onEpisode: z.boolean(),
  onSignal: z.boolean(),
  onMention: z.boolean(),
  onReply: z.boolean(),
  digestEnabled: z.boolean(),
  digestFreq: z.enum(['daily', 'weekly']),
  digestHourUTC: z.number().min(0).max(23),
})

function normalizeRequestBody(input: unknown) {
  const canonical = canonicalPreferencesSchema.safeParse(input)
  if (canonical.success) {
    return canonical.data
  }

  const legacy = legacyPreferencesSchema.parse(input)
  return {
    inAppEnabled: legacy.inApp,
    emailEnabled: legacy.email,
    portfolioUpdatesEmail: legacy.onSignal,
    cryptoCompassEmail: legacy.onEpisode,
    learningHubEmail: legacy.onResearch,
    communityMentionsEmail: legacy.onMention,
    communityRepliesEmail: legacy.onReply,
    digestEnabled: legacy.digestEnabled,
    digestFreq: legacy.digestFreq,
    digestHourUTC: legacy.digestHourUTC,
  }
}

function toDbPayload(input: ReturnType<typeof normalizeRequestBody>) {
  return {
    inAppEnabled: input.inAppEnabled,
    emailEnabled: input.emailEnabled,
    portfolioUpdatesEmail: input.portfolioUpdatesEmail,
    cryptoCompassEmail: input.cryptoCompassEmail,
    learningHubEmail: input.learningHubEmail,
    communityMentionsEmail: input.communityMentionsEmail,
    communityRepliesEmail: input.communityRepliesEmail,
    // Keep legacy columns in sync until all call sites are migrated.
    inApp: input.inAppEnabled,
    email: input.emailEnabled,
    onSignal: input.portfolioUpdatesEmail,
    onEpisode: input.cryptoCompassEmail,
    onResearch: input.learningHubEmail,
    onMention: input.communityMentionsEmail,
    onReply: input.communityRepliesEmail,
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
  inApp?: boolean
  email?: boolean
  onResearch?: boolean
  onEpisode?: boolean
  onSignal?: boolean
  onMention?: boolean
  onReply?: boolean
  inAppEnabled?: boolean
  emailEnabled?: boolean
  portfolioUpdatesEmail?: boolean
  cryptoCompassEmail?: boolean
  learningHubEmail?: boolean
  communityMentionsEmail?: boolean
  communityRepliesEmail?: boolean
}) {
  const resolved = resolveNotificationPrefs(preference)
  const digestFreq = preference.digestFreq === 'daily' ? 'daily' : 'weekly'

  return {
    userId: preference.userId,
    inAppEnabled: resolved.inAppEnabled,
    emailEnabled: resolved.emailEnabled,
    portfolioUpdatesEmail: resolved.portfolioUpdatesEmail,
    cryptoCompassEmail: resolved.cryptoCompassEmail,
    learningHubEmail: resolved.learningHubEmail,
    communityMentionsEmail: resolved.communityMentionsEmail,
    communityRepliesEmail: resolved.communityRepliesEmail,
    digestEnabled: preference.digestEnabled,
    digestFreq,
    digestHourUTC: preference.digestHourUTC,
    // Legacy aliases for backward compatibility with older clients.
    inApp: resolved.inAppEnabled,
    email: resolved.emailEnabled,
    onSignal: resolved.portfolioUpdatesEmail,
    onEpisode: resolved.cryptoCompassEmail,
    onResearch: resolved.learningHubEmail,
    onMention: resolved.communityMentionsEmail,
    onReply: resolved.communityRepliesEmail,
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
          inAppEnabled: true,
          emailEnabled: true,
          portfolioUpdatesEmail: true,
          cryptoCompassEmail: true,
          learningHubEmail: true,
          communityMentionsEmail: true,
          communityRepliesEmail: true,
          inApp: true,
          email: true,
          onSignal: true,
          onEpisode: true,
          onResearch: true,
          onMention: true,
          onReply: true,
          digestEnabled: false,
          digestFreq: 'weekly',
          digestHourUTC: 9,
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
    const normalized = normalizeRequestBody(body)

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: session.user.id },
      update: toDbPayload(normalized),
      create: {
        userId: session.user.id,
        ...toDbPayload(normalized),
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
