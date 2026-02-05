import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

const updateSchema = z.object({
  amountCents: z.number().int().min(1).optional(),
  currency: z.string().min(1).optional(),
  scheduledFor: z.string().datetime().optional(),
  frequency: z.string().optional().nullable(),
  reminderEnabled: z.boolean().optional(),
  notes: z.string().optional().nullable(),
})

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  await requireRole(['admin'])
  const body = await request.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const scheduledFor = parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : undefined
  const nextRunAt = parsed.data.frequency ? scheduledFor ?? undefined : null

  const updated = await prisma.affiliateManualPayout.update({
    where: { id: params.id },
    data: {
      amountCents: parsed.data.amountCents,
      currency: parsed.data.currency,
      scheduledFor,
      frequency: parsed.data.frequency ?? undefined,
      reminderEnabled: parsed.data.reminderEnabled,
      notes: parsed.data.notes ?? undefined,
      nextRunAt,
    },
    include: {
      referrer: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({
    payout: {
      id: updated.id,
      referrer: updated.referrer,
      amountCents: updated.amountCents,
      currency: updated.currency,
      scheduledFor: updated.scheduledFor,
      frequency: updated.frequency,
      reminderEnabled: updated.reminderEnabled,
      nextRunAt: updated.nextRunAt,
      lastSentAt: updated.lastSentAt,
      notes: updated.notes,
      createdAt: updated.createdAt,
    },
  })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  await requireRole(['admin'])
  await prisma.affiliateManualPayout.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
