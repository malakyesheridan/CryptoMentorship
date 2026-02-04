import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { RISK_ONBOARDING_WIZARD_KEY } from '@/lib/riskOnboarding/questions'

const saveSchema = z.object({
  wizardKey: z.string().optional(),
  partialAnswers: z.record(z.any()),
  stepId: z.string().optional(),
})

function mergeAnswers(
  existing: Record<string, unknown> | null | undefined,
  partial: Record<string, unknown>
) {
  const next: Record<string, unknown> = { ...(existing || {}) }
  for (const [key, value] of Object.entries(partial)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof next[key] === 'object' &&
      next[key] !== null
    ) {
      next[key] = { ...(next[key] as Record<string, unknown>), ...(value as Record<string, unknown>) }
    } else {
      next[key] = value
    }
  }
  return next
}

export async function POST(request: NextRequest) {
  const user = await requireUser()
  const body = await request.json()
  const parsed = saveSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const wizardKey = parsed.data.wizardKey || RISK_ONBOARDING_WIZARD_KEY
  const now = new Date()

  const existing = await prisma.userOnboardingResponse.findUnique({
    where: {
      userId_wizardKey: {
        userId: user.id,
        wizardKey,
      },
    },
  })

  const mergedAnswers = mergeAnswers(
    existing?.answers as Record<string, unknown> | null,
    parsed.data.partialAnswers
  )

  const updated = existing
    ? await prisma.userOnboardingResponse.update({
        where: { id: existing.id },
        data: {
          answers: mergedAnswers,
          status: 'IN_PROGRESS',
          startedAt: existing.startedAt || now,
          completedAt: null,
          updatedAt: now,
        },
      })
    : await prisma.userOnboardingResponse.create({
        data: {
          userId: user.id,
          wizardKey,
          answers: mergedAnswers,
          status: 'IN_PROGRESS',
          startedAt: now,
          updatedAt: now,
        },
      })

  return NextResponse.json({
    status: updated.status === 'COMPLETED' ? 'completed' : 'in_progress',
    updatedAt: updated.updatedAt,
  })
}

