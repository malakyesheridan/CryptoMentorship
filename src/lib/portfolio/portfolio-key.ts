export function buildPortfolioKey(params: {
  tier: string
  category?: string | null
  riskProfile: string
}): string {
  const tier = params.tier.trim().toLowerCase()
  const category = (params.category ?? 'majors').trim().toLowerCase()
  const riskProfile = params.riskProfile.trim().toLowerCase()
  return `${tier}_${category}_${riskProfile}`
}
