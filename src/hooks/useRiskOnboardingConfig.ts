'use client'

import useSWR from 'swr'
import type { RiskOnboardingScoringConfig } from '@/lib/riskOnboarding/config'

export type RiskOnboardingConfigResponse = {
  version: number
  scoreMeaning: string
  scoreRanges: RiskOnboardingScoringConfig['scoreRanges']
  questions: RiskOnboardingScoringConfig['questions']
  maxScore: number
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch risk onboarding config')
  }
  return response.json() as Promise<RiskOnboardingConfigResponse>
}

export function useRiskOnboardingConfig() {
  const { data, error, isLoading, mutate } = useSWR('/api/me/risk-onboarding/config', fetcher, {
    revalidateOnFocus: false,
  })

  return { data, error, isLoading, mutate }
}
