import 'server-only'

import { prisma } from '@/lib/prisma'
import {
  DEFAULT_RISK_ONBOARDING_CONFIG,
  RISK_ONBOARDING_CONFIG_ID,
  type RiskOnboardingScoringConfig,
} from './config'
import { RISK_ONBOARDING_WIZARD_KEY } from './questions'

export async function getRiskOnboardingConfig(): Promise<RiskOnboardingScoringConfig> {
  const record = await prisma.riskOnboardingConfig.findUnique({
    where: { id: RISK_ONBOARDING_CONFIG_ID },
  })

  if (!record) {
    return DEFAULT_RISK_ONBOARDING_CONFIG
  }

  const config = record.config as RiskOnboardingScoringConfig
  return {
    ...DEFAULT_RISK_ONBOARDING_CONFIG,
    ...config,
    version: record.version || config.version || DEFAULT_RISK_ONBOARDING_CONFIG.version,
    questions: config.questions || DEFAULT_RISK_ONBOARDING_CONFIG.questions,
    scoring: config.scoring || DEFAULT_RISK_ONBOARDING_CONFIG.scoring,
    scoreRanges: config.scoreRanges || DEFAULT_RISK_ONBOARDING_CONFIG.scoreRanges,
    scoreMeaning: config.scoreMeaning || DEFAULT_RISK_ONBOARDING_CONFIG.scoreMeaning,
  }
}

export async function saveRiskOnboardingConfig(
  config: Omit<RiskOnboardingScoringConfig, 'version'>,
  userId: string
) {
  const existing = await prisma.riskOnboardingConfig.findUnique({
    where: { id: RISK_ONBOARDING_CONFIG_ID },
  })
  const nextVersion = (existing?.version ?? DEFAULT_RISK_ONBOARDING_CONFIG.version) + 1

  return prisma.riskOnboardingConfig.upsert({
    where: { id: RISK_ONBOARDING_CONFIG_ID },
    create: {
      id: RISK_ONBOARDING_CONFIG_ID,
      wizardKey: RISK_ONBOARDING_WIZARD_KEY,
      version: nextVersion,
      config,
      updatedByUserId: userId,
    },
    update: {
      wizardKey: RISK_ONBOARDING_WIZARD_KEY,
      version: nextVersion,
      config,
      updatedByUserId: userId,
    },
  })
}
