export const RISK_ONBOARDING_WIZARD_KEY = 'RISK_ONBOARDING_V1'
export const RISK_ONBOARDING_VERSION = 1

export type LikertOption =
  | 'strongly_agree'
  | 'agree'
  | 'neutral'
  | 'disagree'
  | 'strongly_disagree'

export type RiskQuestionOption = {
  id: string
  label: string
  description?: string
}

export type RiskStatement = {
  id: string
  label: string
}

export type RiskQuestion = {
  id: string
  title: string
  description?: string
  type: 'single' | 'likert-group' | 'text'
  options?: RiskQuestionOption[]
  statements?: RiskStatement[]
  optional?: boolean
}

export const RISK_STATEMENT_IDS = [
  'understand_volatility',
  'accept_loss',
  'hold_through_downturns',
  'prefer_stability',
] as const

// Per-system fit weights for the new "system-aware" questions (Q10–Q14).
// These are NOT part of the admin-editable risk-profile config — they live in
// code so the system-recommendation engine has a stable contract. Keys must
// match systemSlug values in src/lib/system-registry.ts.
export type SystemFitWeights = Record<string, number>

export type SystemAwareOption = RiskQuestionOption & {
  systemFit?: SystemFitWeights
}

export type SystemAwareQuestion = RiskQuestion & {
  options?: SystemAwareOption[]
}

export const SYSTEM_AWARE_QUESTION_IDS = [
  'investment_style',
  'asset_universe',
  'monitoring_pref',
  'dd_tolerance',
  'time_commitment',
] as const

export type SystemAwareQuestionId = (typeof SYSTEM_AWARE_QUESTION_IDS)[number]

// Per-question, per-option, per-system point map. Sum across the five
// system-aware questions yields a raw fit score per system; max possible is
// 30 + 25 + 20 + 20 + 25 = 120 — see src/lib/riskOnboarding/system-score.ts.
export const SYSTEM_AWARE_OPTION_WEIGHTS: Record<
  SystemAwareQuestionId,
  Record<string, SystemFitWeights>
> = {
  investment_style: {
    active_rotation: { dhrs: 30, mrs: 25, mars: 28, tars: 30, sdca: 5 },
    major_rotation:  { dhrs: 15, mrs: 30, mars: 28, tars: 22, sdca: 10 },
    passive_dca:     { dhrs: 5,  mrs: 5,  mars: 5,  tars: 5,  sdca: 30 },
    mixed:           { dhrs: 20, mrs: 20, mars: 20, tars: 18, sdca: 20 },
  },
  asset_universe: {
    broad_alts:  { dhrs: 25, mrs: 5,  mars: 18, tars: 25, sdca: 0 },
    majors_only: { dhrs: 10, mrs: 25, mars: 25, tars: 20, sdca: 10 },
    btc_only:    { dhrs: 0,  mrs: 5,  mars: 5,  tars: 0,  sdca: 25 },
  },
  monitoring_pref: {
    daily:   { dhrs: 20, mrs: 15, mars: 18, tars: 25, sdca: 5 },
    weekly:  { dhrs: 10, mrs: 20, mars: 25, tars: 20, sdca: 10 },
    monthly: { dhrs: 0,  mrs: 5,  mars: 5,  tars: 0,  sdca: 25 },
  },
  dd_tolerance: {
    dd_10: { dhrs: 10, mrs: 15, mars: 10, tars: 5,  sdca: 5 },
    dd_30: { dhrs: 20, mrs: 20, mars: 25, tars: 25, sdca: 15 },
    dd_50: { dhrs: 15, mrs: 10, mars: 15, tars: 18, sdca: 25 },
  },
  time_commitment: {
    minimal:     { dhrs: 5,  mrs: 10, mars: 5,  tars: 5,  sdca: 25 },
    moderate:    { dhrs: 15, mrs: 20, mars: 25, tars: 20, sdca: 15 },
    significant: { dhrs: 25, mrs: 15, mars: 22, tars: 25, sdca: 5 },
  },
}

export const RISK_ONBOARDING_QUESTIONS: RiskQuestion[] = [
  {
    id: 'goal',
    title: 'What is your primary goal for investing in crypto?',
    type: 'single',
    options: [
      { id: 'wealth_growth', label: 'Long-term wealth growth' },
      { id: 'diversification', label: 'Diversification' },
      { id: 'learning_confidence', label: 'Learning and confidence building' },
      { id: 'inflation_hedge', label: 'Inflation hedge' },
      { id: 'other', label: 'Other' },
    ],
  },
  {
    id: 'time_horizon',
    title: 'How long do you plan to keep these investments?',
    type: 'single',
    options: [
      { id: 'lt_6m', label: 'Less than 6 months' },
      { id: 'm6_12', label: '6 to 12 months' },
      { id: 'y1_3', label: '1 to 3 years' },
      { id: 'y3_plus', label: '3+ years' },
    ],
  },
  {
    id: 'drawdown_reaction',
    title: 'If your crypto portfolio dropped 30%, what would you do?',
    type: 'single',
    options: [
      { id: 'sell_most', label: 'Sell most to reduce losses' },
      { id: 'sell_some', label: 'Sell some and wait' },
      { id: 'hold', label: 'Hold and wait it out' },
      { id: 'buy_more', label: 'Buy more at lower prices' },
    ],
  },
  {
    id: 'risk_statements',
    title: 'How strongly do you agree with each statement?',
    type: 'likert-group',
    statements: [
      { id: 'understand_volatility', label: 'I understand crypto volatility' },
      { id: 'accept_loss', label: 'I can accept short-term losses for long-term gains' },
      { id: 'hold_through_downturns', label: 'I can hold through market downturns' },
      { id: 'prefer_stability', label: 'I prefer stability over growth' },
    ],
  },
  {
    id: 'activity_level',
    title: 'How actively do you plan to monitor your portfolio?',
    type: 'single',
    options: [
      { id: 'active_weekly', label: 'Weekly or more' },
      { id: 'moderate_monthly', label: 'Monthly' },
      { id: 'passive_buy_hold', label: 'Buy and hold' },
    ],
  },
  {
    id: 'own_crypto',
    title: 'Do you already own crypto?',
    type: 'single',
    options: [
      { id: 'yes', label: 'Yes' },
      { id: 'no', label: 'No' },
    ],
  },
  {
    id: 'confidence_level',
    title: 'How would you describe your crypto experience?',
    type: 'single',
    options: [
      { id: 'beginner', label: 'Beginner' },
      { id: 'intermediate', label: 'Intermediate' },
      { id: 'advanced', label: 'Advanced' },
    ],
  },
  {
    id: 'budget_range',
    title: 'Optional: What is your approximate crypto budget range?',
    type: 'single',
    optional: true,
    options: [
      { id: 'lt_1k', label: 'Less than $1k' },
      { id: '1k_10k', label: '$1k to $10k' },
      { id: '10k_50k', label: '$10k to $50k' },
      { id: '50k_plus', label: '$50k+' },
    ],
  },
  {
    id: 'need_within_12m',
    title: 'Do you expect to need this money within 12 months?',
    type: 'single',
    options: [
      { id: 'yes', label: 'Yes' },
      { id: 'no', label: 'No' },
    ],
  },
  // ── System-aware questions (Q10–Q14) ────────────────────────────────────
  // These feed UserSystemRecommendation per-system fit scores. The generic
  // risk profile (CONSERVATIVE/SEMI/AGGRESSIVE) does NOT consume these
  // questions — see config.ts scoring map.
  {
    id: 'investment_style',
    title: 'Which approach best describes your ideal crypto strategy?',
    type: 'single',
    options: [
      { id: 'active_rotation', label: 'Active — rotate between assets based on momentum and market conditions' },
      { id: 'major_rotation',  label: 'Selective — rotate between major assets (BTC, ETH, SOL) with downside protection' },
      { id: 'passive_dca',     label: 'Passive — systematic buy/sell based on long-term cycle indicators' },
      { id: 'mixed',           label: 'A mix of active and passive' },
    ],
  },
  {
    id: 'asset_universe',
    title: 'What range of crypto assets are you comfortable with?',
    type: 'single',
    options: [
      { id: 'broad_alts',  label: 'Wide range — including mid/small cap altcoins, DeFi tokens, emerging L1s' },
      { id: 'majors_only', label: 'Majors only — BTC, ETH, SOL, and top 10–20 by market cap' },
      { id: 'btc_only',    label: 'Bitcoin focused — primarily or exclusively BTC' },
    ],
  },
  {
    id: 'monitoring_pref',
    title: 'How often do you want to check and act on signals?',
    type: 'single',
    options: [
      { id: 'daily',   label: 'Daily — I want to know every rotation and act quickly' },
      { id: 'weekly',  label: "Weekly — I'll check in once a week" },
      { id: 'monthly', label: 'Monthly or less — set and forget, notify me only on major changes' },
    ],
  },
  {
    id: 'dd_tolerance',
    title: "What's the maximum portfolio drawdown you'd be comfortable seeing before wanting to exit?",
    type: 'single',
    options: [
      { id: 'dd_10', label: '10% — I want tight risk management' },
      { id: 'dd_30', label: '30% — I can handle moderate drawdowns if the system has a plan' },
      { id: 'dd_50', label: '50% — I understand crypto is volatile and can stomach large drawdowns for larger upside' },
    ],
  },
  {
    id: 'time_commitment',
    title: 'How much time do you want to spend managing your crypto portfolio?',
    type: 'single',
    options: [
      { id: 'minimal',     label: 'Minimal — a few minutes per month' },
      { id: 'moderate',    label: 'Moderate — 30 minutes per week' },
      { id: 'significant', label: 'Significant — I enjoy actively following markets' },
    ],
  },
]

export const RISK_ONBOARDING_REQUIRED_IDS = [
  'goal',
  'time_horizon',
  'drawdown_reaction',
  'risk_statements',
  'activity_level',
  'own_crypto',
  'confidence_level',
  'need_within_12m',
  'investment_style',
  'asset_universe',
  'monitoring_pref',
  'dd_tolerance',
  'time_commitment',
] as const

