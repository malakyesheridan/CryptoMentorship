import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { computeRiskProfile } from '@/lib/riskOnboarding/score'
import { Prisma } from '@prisma/client'
import {
  RISK_ONBOARDING_WIZARD_KEY,
  RISK_ONBOARDING_VERSION,
  RISK_STATEMENT_IDS,
} from '@/lib/riskOnboarding/questions'

const completeSchema = z.object({
  wizardKey: z.string().optional(),
})

function findMissingAnswers(answers: Record<string, unknown> | null) {
  const missing: string[] = []
  if (!answers) return ['answers']

  const requiredFields = [
    'goal',
    'time_horizon',
    'drawdown_reaction',
    'activity_level',
    'own_crypto',
    'confidence_level',
    'need_within_12m',
  ]

  for (const field of requiredFields) {
    if (!answers[field]) missing.push(field)
  }

  const riskStatements = answers.risk_statements as Record<string, unknown> | undefined
  if (!riskStatements) {
    missing.push('risk_statements')
  } else {
    for (const statementId of RISK_STATEMENT_IDS) {
      if (!riskStatements[statementId]) {
        missing.push(`risk_statements.${statementId}`)
      }
    }
  }

  return missing
}

export async function POST(request: NextRequest) {
  const user = await requireUser()
  const body = await request.json()
  const parsed = completeSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const wizardKey = parsed.data.wizardKey || RISK_ONBOARDING_WIZARD_KEY

  const onboarding = await prisma.userOnboardingResponse.findUnique({
    where: {
      userId_wizardKey: {
        userId: user.id,
        wizardKey,
      },
    },
  })

  const answers = onboarding?.answers as Record<string, unknown> | null
  const missing = findMissingAnswers(answers)

  if (missing.length > 0) {
    return NextResponse.json(
      { error: 'Missing required answers', missing },
      { status: 400 }
    )
  }

  const result = computeRiskProfile(answers as any)
  const now = new Date()
  const answersJson = (answers ?? {}) as Prisma.InputJsonValue

  await prisma.$transaction(async (tx) => {
    if (onboarding) {
      await tx.userOnboardingResponse.update({
        where: { id: onboarding.id },
        data: {
          status: 'COMPLETED',
          completedAt: now,
          updatedAt: now,
        },
      })
    } else {
      await tx.userOnboardingResponse.create({
        data: {
          userId: user.id,
          wizardKey,
          answers: answersJson,
          status: 'COMPLETED',
          startedAt: now,
          completedAt: now,
          updatedAt: now,
        },
      })
    }

    await tx.userRiskProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        recommendedProfile: result.recommendedProfile,
        score: result.score,
        drivers: result.drivers,
        version: RISK_ONBOARDING_VERSION,
        completedAt: now,
        updatedAt: now,
      },
      update: {
        recommendedProfile: result.recommendedProfile,
        score: result.score,
        drivers: result.drivers,
        version: RISK_ONBOARDING_VERSION,
        completedAt: now,
        updatedAt: now,
      },
    })
  })

  return NextResponse.json({
    recommendedProfile: result.recommendedProfile,
    score: result.score,
    drivers: result.drivers,
    completedAt: now,
  })
}

