import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { computeRiskProfile } from '@/lib/riskOnboarding/score'
import { getRiskOnboardingConfig } from '@/lib/riskOnboarding/config-store'
import { Prisma } from '@prisma/client'
import {
  RISK_ONBOARDING_WIZARD_KEY,
  RISK_STATEMENT_IDS,
} from '@/lib/riskOnboarding/questions'

const completeSchema = z.object({
  wizardKey: z.string().optional(),
})

function findMissingAnswers(
  answers: Record<string, unknown> | null,
  questions: Array<{ id: string; optional?: boolean; type: string; statements?: Array<{ id: string }> }>
) {
  const missing: string[] = []
  if (!answers) return ['answers']

  for (const question of questions) {
    if (question.optional) continue
    if (question.type === 'likert-group') {
      const riskStatements = answers.risk_statements as Record<string, unknown> | undefined
      if (!riskStatements) {
        missing.push('risk_statements')
        continue
      }
      const statements = question.statements?.length
        ? question.statements.map((statement) => statement.id)
        : RISK_STATEMENT_IDS
      for (const statementId of statements) {
        if (!riskStatements[statementId]) {
          missing.push(`risk_statements.${statementId}`)
        }
      }
      continue
    }

    if (!answers[question.id]) {
      missing.push(question.id)
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
  const config = await getRiskOnboardingConfig()
  const missing = findMissingAnswers(answers, config.questions)

  if (missing.length > 0) {
    return NextResponse.json(
      { error: 'Missing required answers', missing },
      { status: 400 }
    )
  }

  const result = computeRiskProfile(answers as any, config)
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
        version: config.version,
        completedAt: now,
        updatedAt: now,
      },
      update: {
        recommendedProfile: result.recommendedProfile,
        score: result.score,
        drivers: result.drivers,
        version: config.version,
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

