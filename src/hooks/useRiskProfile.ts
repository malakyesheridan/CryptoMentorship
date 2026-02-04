import useSWR from 'swr'

export type RiskProfileResponse = {
  wizardKey: string
  status: 'not_started' | 'in_progress' | 'completed'
  answers: Record<string, unknown> | null
  recommendedProfile: 'CONSERVATIVE' | 'SEMI' | 'AGGRESSIVE' | null
  score: number | null
  drivers: string[]
  completedAt: string | null
  version: number | null
  overriddenByAdmin: boolean
  adminOverrideProfile: 'CONSERVATIVE' | 'SEMI' | 'AGGRESSIVE' | null
  adminOverrideReason: string | null
  defaultRiskProfile: 'CONSERVATIVE' | 'SEMI' | 'AGGRESSIVE' | null
  selectedRiskProfile: 'CONSERVATIVE' | 'SEMI' | 'AGGRESSIVE' | null
  effectiveProfile: 'CONSERVATIVE' | 'SEMI' | 'AGGRESSIVE' | null
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch risk profile')
  }
  return response.json() as Promise<RiskProfileResponse>
}

export function useRiskProfile(options?: { includeAnswers?: boolean; includeFreeText?: boolean }) {
  const params = new URLSearchParams()
  if (options?.includeAnswers) {
    params.set('includeAnswers', '1')
  }
  if (options?.includeFreeText) {
    params.set('includeFreeText', '1')
  }
  const key = params.toString()
    ? `/api/me/risk-profile?${params.toString()}`
    : '/api/me/risk-profile'

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
  })

  return {
    data,
    error,
    isLoading,
    mutate,
  }
}

