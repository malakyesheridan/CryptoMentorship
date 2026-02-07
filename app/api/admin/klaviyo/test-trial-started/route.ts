import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sendTrialStartedToKlaviyo } from '@/lib/klaviyo/events'

const payloadSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const { email } = payloadSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    })

    const membership = user
      ? await prisma.membership.findUnique({
          where: { userId: user.id },
          select: {
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            tier: true,
          },
        })
      : null

    const fallbackMembership = {
      status: 'trial',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      tier: 'T2',
    }

    const result = await sendTrialStartedToKlaviyo(
      user || { id: 'test-user', email, name: null },
      membership || fallbackMembership
    )

    if (!result.ok) {
      return NextResponse.json({
        ok: false,
        error: result.error || 'Failed to send test event',
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    if (error instanceof Response) {
      return error
    }

    logger.error(
      'Failed to send Klaviyo test trial event',
      error instanceof Error ? error : new Error(String(error))
    )

    return NextResponse.json(
      { ok: false, error: 'Failed to send test event' },
      { status: 500 }
    )
  }
}
