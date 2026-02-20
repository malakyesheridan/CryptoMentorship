import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth-server'
import { RISK_ONBOARDING_WIZARD_KEY } from '@/lib/riskOnboarding/questions'
import { getRiskOnboardingConfig } from '@/lib/riskOnboarding/config-store'
import { normalizeScoreToProfileRange } from '@/lib/riskOnboarding/config'

function sanitizeAnswers(answers: Record<string, unknown> | null | undefined, includeFreeText: boolean) {
  if (!answers) return null
  if (includeFreeText) return answers
  const sanitized = { ...answers }
  delete (sanitized as Record<string, unknown>).goal_other_text
  delete (sanitized as Record<string, unknown>).holdings_text
  delete (sanitized as Record<string, unknown>).learn_more_text
  return sanitized
}

export async function GET(request: NextRequest) {
  const user = await requireUser()
  const { searchParams } = new URL(request.url)
  const includeAnswers = searchParams.get('includeAnswers') === '1' || searchParams.get('includeAnswers') === 'true'
  const includeFreeText = searchParams.get('includeFreeText') === '1' || searchParams.get('includeFreeText') === 'true'

  const [onboarding, profile, userRecord, config] = await Promise.all([
    prisma.userOnboardingResponse.findUnique({
      where: {
        userId_wizardKey: {
          userId: user.id,
          wizardKey: RISK_ONBOARDING_WIZARD_KEY,
        },
      },
    }),
    prisma.userRiskProfile.findUnique({
      where: { userId: user.id },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        defaultRiskProfile: true,
        selectedRiskProfile: true,
      },
    }),
    getRiskOnboardingConfig(),
  ])

  let status: 'not_started' | 'in_progress' | 'completed' = 'not_started'
  if (onboarding?.status === 'COMPLETED' || profile?.completedAt) {
    status = 'completed'
  } else if (onboarding) {
    status = 'in_progress'
  }

  const recommendedProfile = profile?.recommendedProfile ?? null
  const overriddenByAdmin = profile?.overriddenByAdmin ?? false
  const adminOverrideProfile = profile?.adminOverrideProfile ?? null
  const defaultRiskProfile = userRecord?.defaultRiskProfile ?? null
  const selectedRiskProfile = userRecord?.selectedRiskProfile ?? null

  const effectiveProfile =
    defaultRiskProfile ||
    (overriddenByAdmin ? adminOverrideProfile : null) ||
    recommendedProfile

  const normalizedScore =
    profile && recommendedProfile
      ? normalizeScoreToProfileRange(profile.score, recommendedProfile, config)
      : profile?.score ?? null

  return NextResponse.json({
    wizardKey: RISK_ONBOARDING_WIZARD_KEY,
    status,
    answers: includeAnswers
      ? sanitizeAnswers(onboarding?.answers as Record<string, unknown> | null, includeFreeText)
      : null,
    recommendedProfile,
    score: normalizedScore,
    drivers: (profile?.drivers as string[] | null) ?? [],
    completedAt: profile?.completedAt ?? null,
    version: profile?.version ?? null,
    overriddenByAdmin,
    adminOverrideProfile,
    adminOverrideReason: profile?.adminOverrideReason ?? null,
    defaultRiskProfile,
    selectedRiskProfile,
    effectiveProfile,
  })
}
