export const RISK_PROFILE_LABELS: Record<'CONSERVATIVE' | 'SEMI' | 'AGGRESSIVE', string> = {
  CONSERVATIVE: 'Conservative',
  SEMI: 'Semi-aggressive',
  AGGRESSIVE: 'Aggressive',
}

export function formatRiskProfileLabel(profile: 'CONSERVATIVE' | 'SEMI' | 'AGGRESSIVE' | null | undefined) {
  if (!profile) return 'Unknown'
  return RISK_PROFILE_LABELS[profile]
}

