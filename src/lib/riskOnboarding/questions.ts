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
] as const

