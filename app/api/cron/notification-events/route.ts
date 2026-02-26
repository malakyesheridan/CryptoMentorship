import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { emitStrict } from '@/lib/events/notifications'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const appEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('research_published'),
    contentId: z.string().min(1),
  }),
  z.object({
    type: z.literal('signal_published'),
    contentId: z.string().min(1),
  }),
  z.object({
    type: z.literal('episode_published'),
    episodeId: z.string().min(1),
  }),
  z.object({
    type: z.literal('learning_hub_published'),
    subjectType: z.enum(['track', 'lesson', 'resource']),
    subjectId: z.string().min(1),
    title: z.string().min(1),
    url: z.string().min(1),
    minTier: z.enum(['T1', 'T2']).nullable().optional(),
  }),
  z.object({
    type: z.literal('mention'),
    messageId: z.string().min(1),
    mentionedUserIds: z.array(z.string().min(1)).max(50),
  }),
  z.object({
    type: z.literal('reply'),
    messageId: z.string().min(1),
    parentAuthorId: z.string().min(1),
  }),
  z.object({
    type: z.literal('announcement'),
    title: z.string().min(1),
    body: z.string().optional(),
    url: z.string().optional(),
  }),
  z.object({
    type: z.literal('question_answered'),
    questionId: z.string().min(1),
    questionAuthorId: z.string().min(1),
  }),
])

function isAuthorized(request: NextRequest): { ok: boolean; isProduction: boolean; cronConfigured: boolean } {
  const cronSecret = process.env.VERCEL_CRON_SECRET
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
  const providedSecret = request.nextUrl.searchParams.get('secret')
  const internalDispatchSecret = process.env.INTERNAL_DISPATCH_SECRET || process.env.NEXTAUTH_SECRET
  const providedInternalToken = request.headers.get('x-internal-job-token')
  const hasValidInternalToken = !!internalDispatchSecret && providedInternalToken === internalDispatchSecret
  const authorized = isVercelCron
    || (!!cronSecret && providedSecret === cronSecret)
    || hasValidInternalToken
    || (!isProduction && !cronSecret)

  return {
    ok: authorized,
    isProduction,
    cronConfigured: !!cronSecret,
  }
}

export async function POST(request: NextRequest) {
  const auth = isAuthorized(request)
  if (!auth.ok) {
    if (auth.isProduction && !auth.cronConfigured) {
      logger.error('Notification event cron secret missing in production')
      return NextResponse.json(
        { error: 'Cron secret missing in production' },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'Unauthorized: Invalid cron secret' },
      { status: 401 }
    )
  }

  let parsedEvent: z.infer<typeof appEventSchema>
  try {
    const body = await request.json()
    parsedEvent = appEventSchema.parse(body)
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Invalid notification event payload',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    )
  }

  try {
    await emitStrict(parsedEvent)
    return NextResponse.json({ success: true, type: parsedEvent.type })
  } catch (error) {
    logger.error(
      'Notification event processing failed',
      error instanceof Error ? error : new Error(String(error)),
      { type: parsedEvent.type }
    )
    return NextResponse.json(
      {
        error: 'Failed to process notification event',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
