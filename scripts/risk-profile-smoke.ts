import { prisma } from '../src/lib/prisma'
import { computeRiskProfile, RiskOnboardingAnswers } from '../src/lib/riskOnboarding/score'
import { RISK_ONBOARDING_WIZARD_KEY, RISK_ONBOARDING_VERSION } from '../src/lib/riskOnboarding/questions'

async function run() {
  const user = await prisma.user.findFirst({
    select: { id: true, email: true },
    orderBy: { createdAt: 'asc' },
  })

  if (!user) {
    console.log('No users found. Create a user before running this script.')
    return
  }

  const answers: RiskOnboardingAnswers = {
    goal: 'wealth_growth',
    time_horizon: 'y3_plus',
    drawdown_reaction: 'hold',
    risk_statements: {
      understand_volatility: 'agree',
      accept_loss: 'agree',
      hold_through_downturns: 'agree',
      prefer_stability: 'neutral',
    },
    activity_level: 'moderate_monthly',
    own_crypto: 'yes',
    confidence_level: 'intermediate',
    need_within_12m: 'no',
  }

  const result = computeRiskProfile(answers)

  await prisma.userOnboardingResponse.upsert({
    where: {
      userId_wizardKey: {
        userId: user.id,
        wizardKey: RISK_ONBOARDING_WIZARD_KEY,
      },
    },
    create: {
      userId: user.id,
      wizardKey: RISK_ONBOARDING_WIZARD_KEY,
      answers,
      status: 'COMPLETED',
      startedAt: new Date(),
      completedAt: new Date(),
      updatedAt: new Date(),
    },
    update: {
      answers,
      status: 'COMPLETED',
      completedAt: new Date(),
      updatedAt: new Date(),
    },
  })

  await prisma.userRiskProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      recommendedProfile: result.recommendedProfile,
      score: result.score,
      drivers: result.drivers,
      version: RISK_ONBOARDING_VERSION,
      completedAt: new Date(),
      updatedAt: new Date(),
    },
    update: {
      recommendedProfile: result.recommendedProfile,
      score: result.score,
      drivers: result.drivers,
      version: RISK_ONBOARDING_VERSION,
      completedAt: new Date(),
      updatedAt: new Date(),
    },
  })

  console.log('Base profile:', { email: user.email, ...result })

  const sellMost = computeRiskProfile({
    ...answers,
    drawdown_reaction: 'sell_most',
  })
  if (sellMost.recommendedProfile !== 'CONSERVATIVE') {
    throw new Error('sell_most cap failed')
  }

  const needFunds = computeRiskProfile({
    ...answers,
    need_within_12m: 'yes',
  })
  if (needFunds.recommendedProfile !== 'CONSERVATIVE') {
    throw new Error('need_within_12m cap failed')
  }

  console.log('Cap checks passed')
}

run()
  .catch((error) => {
    console.error('Risk profile smoke script failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

