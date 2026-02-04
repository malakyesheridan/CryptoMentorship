import { LikertOption } from './questions'

export type RiskProfile = 'CONSERVATIVE' | 'SEMI' | 'AGGRESSIVE'

export type RiskOnboardingAnswers = {
  goal?: string
  goal_other_text?: string
  time_horizon?: 'lt_6m' | 'm6_12' | 'y1_3' | 'y3_plus'
  drawdown_reaction?: 'sell_most' | 'sell_some' | 'hold' | 'buy_more'
  risk_statements?: {
    understand_volatility?: LikertOption
    accept_loss?: LikertOption
    hold_through_downturns?: LikertOption
    prefer_stability?: LikertOption
  }
  activity_level?: 'active_weekly' | 'moderate_monthly' | 'passive_buy_hold'
  own_crypto?: 'yes' | 'no'
  holdings_text?: string
  confidence_level?: 'beginner' | 'intermediate' | 'advanced'
  learn_more_text?: string
  budget_range?: 'lt_1k' | '1k_10k' | '10k_50k' | '50k_plus'
  need_within_12m?: 'yes' | 'no'
}

export type ComputeRiskProfileResult = {
  score: number
  recommendedProfile: RiskProfile
  drivers: string[]
  cappedByRule?: string | null
}

const LIKERT_POINTS: Record<LikertOption, number> = {
  strongly_agree: 10,
  agree: 7,
  neutral: 5,
  disagree: 2,
  strongly_disagree: 0,
}

const PREFER_STABILITY_POINTS: Record<LikertOption, number> = {
  strongly_agree: 0,
  agree: 2,
  neutral: 5,
  disagree: 7,
  strongly_disagree: 10,
}

const DRAW_DOWN_POINTS: Record<NonNullable<RiskOnboardingAnswers['drawdown_reaction']>, number> = {
  sell_most: 0,
  sell_some: 10,
  hold: 20,
  buy_more: 30,
}

const TIME_HORIZON_POINTS: Record<NonNullable<RiskOnboardingAnswers['time_horizon']>, number> = {
  lt_6m: 0,
  m6_12: 5,
  y1_3: 10,
  y3_plus: 15,
}

const ACTIVITY_POINTS: Record<NonNullable<RiskOnboardingAnswers['activity_level']>, number> = {
  passive_buy_hold: 4,
  moderate_monthly: 3,
  active_weekly: 2,
}

const CONFIDENCE_POINTS: Record<NonNullable<RiskOnboardingAnswers['confidence_level']>, number> = {
  beginner: 1,
  intermediate: 3,
  advanced: 5,
}

const OWN_CRYPTO_POINTS: Record<NonNullable<RiskOnboardingAnswers['own_crypto']>, number> = {
  no: 1,
  yes: 5,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function baseProfileFromScore(score: number): RiskProfile {
  if (score <= 39) return 'CONSERVATIVE'
  if (score <= 69) return 'SEMI'
  return 'AGGRESSIVE'
}

function buildDrivers(answers: RiskOnboardingAnswers, cappedReasons: string[], score: number): string[] {
  const drivers: string[] = []

  if (cappedReasons.includes('need_within_12m')) {
    drivers.push('You may need funds within 12 months (we recommend caution)')
  }
  if (cappedReasons.includes('sell_most')) {
    drivers.push('You would sell most holdings after a 30% drop (we recommend caution)')
  }
  if (cappedReasons.includes('hold_through_downturns')) {
    drivers.push('Discomfort with holding through downturns (we recommend balance)')
  }

  if (answers.time_horizon === 'y3_plus') {
    drivers.push('Long time horizon (3+ years)')
  } else if (answers.time_horizon === 'y1_3') {
    drivers.push('Time horizon of 1-3 years')
  }

  if (answers.drawdown_reaction === 'buy_more') {
    drivers.push('Would add during a 30% drawdown')
  } else if (answers.drawdown_reaction === 'hold') {
    drivers.push('Would hold during a 30% drawdown')
  }

  if (answers.risk_statements?.accept_loss === 'strongly_agree' || answers.risk_statements?.accept_loss === 'agree') {
    drivers.push('Comfortable accepting short-term losses')
  }

  if (answers.risk_statements?.hold_through_downturns === 'strongly_agree' || answers.risk_statements?.hold_through_downturns === 'agree') {
    drivers.push('Comfortable holding through downturns')
  }

  if (answers.risk_statements?.prefer_stability === 'disagree' || answers.risk_statements?.prefer_stability === 'strongly_disagree') {
    drivers.push('Less preference for stability over growth')
  }

  if (answers.own_crypto === 'yes') {
    drivers.push('Already invests in crypto')
  }

  if (answers.confidence_level === 'advanced') {
    drivers.push('High confidence in crypto experience')
  }

  if (drivers.length < 2) {
    if (score <= 39) {
      drivers.push('Overall responses indicate lower risk tolerance')
    } else if (score <= 69) {
      drivers.push('Overall responses indicate balanced risk tolerance')
    } else {
      drivers.push('Overall responses indicate higher risk tolerance')
    }
  }

  return drivers.slice(0, 3)
}

export function computeRiskProfile(answers: RiskOnboardingAnswers): ComputeRiskProfileResult {
  const drawdownScore = answers.drawdown_reaction ? DRAW_DOWN_POINTS[answers.drawdown_reaction] : 0

  const riskStatements = answers.risk_statements || {}
  const riskStatementScore =
    (riskStatements.understand_volatility ? LIKERT_POINTS[riskStatements.understand_volatility] : 0) +
    (riskStatements.accept_loss ? LIKERT_POINTS[riskStatements.accept_loss] : 0) +
    (riskStatements.hold_through_downturns ? LIKERT_POINTS[riskStatements.hold_through_downturns] : 0) +
    (riskStatements.prefer_stability ? PREFER_STABILITY_POINTS[riskStatements.prefer_stability] : 0)

  const timeHorizonScore = answers.time_horizon ? TIME_HORIZON_POINTS[answers.time_horizon] : 0
  const activityScore = answers.activity_level ? ACTIVITY_POINTS[answers.activity_level] : 0
  const confidenceScore = answers.confidence_level ? CONFIDENCE_POINTS[answers.confidence_level] : 0
  const ownCryptoScore = answers.own_crypto ? OWN_CRYPTO_POINTS[answers.own_crypto] : 0

  const rawScore = drawdownScore + riskStatementScore + timeHorizonScore + activityScore + confidenceScore + ownCryptoScore
  const score = clamp(rawScore, 0, 100)

  let recommendedProfile = baseProfileFromScore(score)
  const cappedReasons: string[] = []

  if (answers.drawdown_reaction === 'sell_most') {
    recommendedProfile = 'CONSERVATIVE'
    cappedReasons.push('sell_most')
  }

  if (answers.need_within_12m === 'yes') {
    recommendedProfile = 'CONSERVATIVE'
    cappedReasons.push('need_within_12m')
  }

  if (
    (answers.risk_statements?.hold_through_downturns === 'disagree' ||
      answers.risk_statements?.hold_through_downturns === 'strongly_disagree') &&
    recommendedProfile === 'AGGRESSIVE'
  ) {
    recommendedProfile = 'SEMI'
    cappedReasons.push('hold_through_downturns')
  }

  const drivers = buildDrivers(answers, cappedReasons, score)

  return {
    score,
    recommendedProfile,
    drivers,
    cappedByRule: cappedReasons.length ? cappedReasons[0] : null,
  }
}

