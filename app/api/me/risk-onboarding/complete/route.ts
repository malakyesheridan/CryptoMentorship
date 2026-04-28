import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { computeRiskProfile, type RiskOnboardingAnswers } from '@/lib/riskOnboarding/score'
import { getRiskOnboardingConfig } from '@/lib/riskOnboarding/config-store'
import { computeSystemFit, SYSTEM_FIT_VERSION } from '@/lib/riskOnboarding/system-score'
import { logger } from '@/lib/logger'
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
  const fit = computeSystemFit(answers as RiskOnboardingAnswers, result.recommendedProfile)
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

    // Upsert one UserSystemRecommendation per active system. Preserve any
    // pre-existing accepted/declined choice so a retake doesn't silently
    // wipe a user's prior decision.
    for (const sys of fit.systems) {
      await tx.userSystemRecommendation.upsert({
        where: {
          userId_systemSlug: {
            userId: user.id,
            systemSlug: sys.slug,
          },
        },
        create: {
          userId: user.id,
          systemSlug: sys.slug,
          fitScore: sys.score,
          fitLabel: sys.label,
          reasons: sys.reasons,
          recommended: sys.recommended,
          accepted: sys.recommended, // first-time default: recommended → accepted
          declined: false,
          version: SYSTEM_FIT_VERSION,
          quizVersion: config.version,
          updatedAt: now,
        },
        update: {
          fitScore: sys.score,
          fitLabel: sys.label,
          reasons: sys.reasons,
          recommended: sys.recommended,
          version: SYSTEM_FIT_VERSION,
          quizVersion: config.version,
          updatedAt: now,
          // accepted/declined NOT updated — user controls these via the
          // result screen toggles.
        },
      })
    }
  })

  // Bridge to Phase B: ensure recommended systems have a UserSystemAssignment.
  // (Non-recommended systems are NOT removed here — that requires explicit
  // user action via the toggles on the result screen.)
  for (const sys of fit.systems) {
    if (!sys.recommended) continue
    try {
      await prisma.userSystemAssignment.upsert({
        where: {
          userId_systemSlug: {
            userId: user.id,
            systemSlug: sys.slug,
          },
        },
        create: {
          userId: user.id,
          systemSlug: sys.slug,
          isActive: true,
          assignedBy: null, // null = automatic, not admin-assigned
        },
        update: {
          isActive: true,
        },
      })
    } catch (error) {
      logger.warn('Auto-assign on quiz completion failed', {
        userId: user.id,
        systemSlug: sys.slug,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return NextResponse.json({
    recommendedProfile: result.recommendedProfile,
    score: result.score,
    drivers: result.drivers,
    systems: fit.systems,
    systemFitVersion: fit.version,
    quizVersion: config.version,
    completedAt: now,
  })
}

