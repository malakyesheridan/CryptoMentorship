import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

const createSchema = z.object({
  referrerId: z.string().min(1),
  amountCents: z.number().int().min(1),
  currency: z.string().min(1).default('usd'),
  scheduledFor: z.string().datetime(),
  frequency: z.string().optional().nullable(),
  reminderEnabled: z.boolean().optional().default(true),
  notes: z.string().optional().nullable(),
})

export async function GET() {
  await requireRole(['admin'])

  const payouts = await prisma.affiliateManualPayout.findMany({
    orderBy: { scheduledFor: 'desc' },
    include: {
      referrer: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({
    payouts: payouts.map((payout) => ({
      id: payout.id,
      referrer: payout.referrer,
      amountCents: payout.amountCents,
      currency: payout.currency,
      scheduledFor: payout.scheduledFor,
      frequency: payout.frequency,
      reminderEnabled: payout.reminderEnabled,
      nextRunAt: payout.nextRunAt,
      lastSentAt: payout.lastSentAt,
      notes: payout.notes,
      createdAt: payout.createdAt,
    })),
  })
}

export async function POST(request: NextRequest) {
  const user = await requireRole(['admin'])
  const body = await request.json()
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const data = parsed.data
  const scheduledFor = new Date(data.scheduledFor)
  const nextRunAt = data.frequency ? scheduledFor : null

  const payout = await prisma.affiliateManualPayout.create({
    data: {
      referrerId: data.referrerId,
      amountCents: data.amountCents,
      currency: data.currency,
      scheduledFor,
      frequency: data.frequency ?? null,
      reminderEnabled: data.reminderEnabled ?? true,
      nextRunAt,
      notes: data.notes ?? null,
    },
    include: {
      referrer: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({
    payout: {
      id: payout.id,
      referrer: payout.referrer,
      amountCents: payout.amountCents,
      currency: payout.currency,
      scheduledFor: payout.scheduledFor,
      frequency: payout.frequency,
      reminderEnabled: payout.reminderEnabled,
      nextRunAt: payout.nextRunAt,
      lastSentAt: payout.lastSentAt,
      notes: payout.notes,
      createdAt: payout.createdAt,
      createdBy: user.id,
    },
  })
}
