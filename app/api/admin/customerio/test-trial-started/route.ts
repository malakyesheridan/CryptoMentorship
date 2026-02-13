import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sendTrialStartedToCustomerIo } from '@/lib/customerio/events'

const payloadSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const { email } = payloadSchema.parse(body)

    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    })

    if (!user && process.env.NODE_ENV === 'development') {
      user = await prisma.user.create({
        data: {
          email,
          name: 'Customer.io Test User',
        },
        select: { id: true, email: true, name: true },
      })
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'User not found for email' },
        { status: 404 }
      )
    }

    const membership = await prisma.membership.findUnique({
      where: { userId: user.id },
      select: {
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        tier: true,
      },
    })

    const fallbackMembership = {
      status: 'trial',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      tier: 'T2',
    }

    const customerIoResult = await sendTrialStartedToCustomerIo(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      membership || fallbackMembership
    )

    return NextResponse.json({
      ok: customerIoResult.ok,
      customerio: {
        identify: customerIoResult.identify,
        event: customerIoResult.event,
      },
      error: customerIoResult.error,
    })
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
      'Failed to send Customer.io test trial event',
      error instanceof Error ? error : new Error(String(error))
    )

    return NextResponse.json(
      { ok: false, error: 'Failed to send test event' },
      { status: 500 }
    )
  }
}
