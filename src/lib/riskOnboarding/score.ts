import { LikertOption } from './questions'
import {
  DEFAULT_RISK_ONBOARDING_CONFIG,
  computeMaxScore,
  getProfileForScore,
  type RiskOnboardingScoringConfig,
} from './config'

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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function buildDrivers(
  answers: RiskOnboardingAnswers,
  cappedReasons: string[],
  score: number,
  config: RiskOnboardingScoringConfig
): string[] {
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
    const profile = getProfileForScore(score, config)
    if (profile === 'CONSERVATIVE') {
      drivers.push('Overall responses indicate lower risk tolerance')
    } else if (profile === 'SEMI') {
      drivers.push('Overall responses indicate balanced risk tolerance')
    } else {
      drivers.push('Overall responses indicate higher risk tolerance')
    }
  }

  return drivers.slice(0, 3)
}

export function computeRiskProfile(
  answers: RiskOnboardingAnswers,
  config: RiskOnboardingScoringConfig = DEFAULT_RISK_ONBOARDING_CONFIG
): ComputeRiskProfileResult {
  const rawScore = config.questions.reduce((total, question) => {
    if (question.type === 'single') {
      const answer = (answers as Record<string, string | undefined>)[question.id]
      const optionScore = answer
        ? config.scoring.options[question.id]?.[answer] ?? 0
        : 0
      return total + optionScore
    }

    if (question.type === 'likert-group') {
      const statementScores = question.statements?.reduce((sum, statement) => {
        const answer = answers.risk_statements?.[statement.id as keyof RiskOnboardingAnswers['risk_statements']]
        if (!answer) return sum
        const mapping = config.scoring.likertStatements[statement.id] || {}
        return sum + (mapping[answer as LikertOption] ?? 0)
      }, 0) ?? 0
      return total + statementScores
    }

    return total
  }, 0)

  const maxScore = computeMaxScore(config)
  const normalizedScore = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0
  const score = clamp(normalizedScore, 0, 100)

  let recommendedProfile = getProfileForScore(score, config)
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

  const drivers = buildDrivers(answers, cappedReasons, score, config)

  return {
    score,
    recommendedProfile,
    drivers,
    cappedByRule: cappedReasons.length ? cappedReasons[0] : null,
  }
}

