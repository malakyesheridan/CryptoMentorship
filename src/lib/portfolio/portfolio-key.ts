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

export function parsePortfolioKey(portfolioKey: string): {
  tier: 'T1' | 'T2'
  category: string
  riskProfile: string
} | null {
  const [tierRaw, categoryRaw, riskRaw] = portfolioKey.split('_')
  if (!tierRaw || !categoryRaw || !riskRaw) return null
  const tier = tierRaw.trim().toLowerCase()
  if (tier !== 't1' && tier !== 't2') return null
  return {
    tier: tier === 't1' ? 'T1' : 'T2',
    category: categoryRaw.trim().toLowerCase(),
    riskProfile: riskRaw.trim().toUpperCase()
  }
}
