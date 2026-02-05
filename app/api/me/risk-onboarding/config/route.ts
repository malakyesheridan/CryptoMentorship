import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { getRiskOnboardingConfig } from '@/lib/riskOnboarding/config-store'
import { computeMaxScore } from '@/lib/riskOnboarding/config'

export async function GET() {
  await requireUser()
  const config = await getRiskOnboardingConfig()

  return NextResponse.json({
    version: config.version,
    scoreMeaning: config.scoreMeaning,
    scoreRanges: config.scoreRanges,
    questions: config.questions,
    maxScore: computeMaxScore(config),
  })
}
