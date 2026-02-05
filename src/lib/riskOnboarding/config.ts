import type { RiskProfile } from './score'
import {
  RISK_ONBOARDING_QUESTIONS,
  RISK_STATEMENT_IDS,
  type LikertOption,
  type RiskQuestion,
} from './questions'

export const RISK_ONBOARDING_CONFIG_ID = 'risk_onboarding_config'

export type RiskScoreRange = {
  profile: RiskProfile
  min: number
  max: number
  label: string
  description: string
}

export type RiskOnboardingScoringConfig = {
  version: number
  scoreMeaning: string
  scoreRanges: RiskScoreRange[]
  questions: RiskQuestion[]
  scoring: {
    options: Record<string, Record<string, number>>
    likertStatements: Record<string, Record<LikertOption, number>>
  }
}

const LIKERT_POINTS: Record<LikertOption, number> = {
  strongly_agree: 10,
  agree: 7,
  neutral: 5,
  disagree: 2,
  strongly_disagree: 0,
}

const LIKERT_POINTS_REVERSED: Record<LikertOption, number> = {
  strongly_agree: 0,
  agree: 2,
  neutral: 5,
  disagree: 7,
  strongly_disagree: 10,
}

export const DEFAULT_RISK_ONBOARDING_CONFIG: RiskOnboardingScoringConfig = {
  version: 1,
  scoreMeaning:
    'Scores are normalized to a 0–100 scale based on your answers. Higher scores indicate higher tolerance for volatility and longer time horizons.',
  scoreRanges: [
    {
      profile: 'CONSERVATIVE',
      min: 0,
      max: 49,
      label: 'Conservative',
      description: 'Prioritizes stability and lower volatility exposure.',
    },
    {
      profile: 'SEMI',
      min: 50,
      max: 79,
      label: 'Semi-aggressive',
      description: 'Balances growth with measured drawdown risk.',
    },
    {
      profile: 'AGGRESSIVE',
      min: 80,
      max: 100,
      label: 'Aggressive',
      description: 'Comfortable with volatility in pursuit of higher growth.',
    },
  ],
  questions: RISK_ONBOARDING_QUESTIONS,
  scoring: {
    options: {
      goal: {
        wealth_growth: 0,
        diversification: 0,
        learning_confidence: 0,
        inflation_hedge: 0,
        other: 0,
      },
      time_horizon: {
        lt_6m: 0,
        m6_12: 5,
        y1_3: 10,
        y3_plus: 15,
      },
      drawdown_reaction: {
        sell_most: 0,
        sell_some: 10,
        hold: 20,
        buy_more: 30,
      },
      activity_level: {
        active_weekly: 2,
        moderate_monthly: 3,
        passive_buy_hold: 4,
      },
      own_crypto: {
        no: 1,
        yes: 5,
      },
      confidence_level: {
        beginner: 1,
        intermediate: 3,
        advanced: 5,
      },
      budget_range: {
        lt_1k: 0,
        '1k_10k': 0,
        '10k_50k': 0,
        '50k_plus': 0,
      },
      need_within_12m: {
        yes: 0,
        no: 0,
      },
    },
    likertStatements: RISK_STATEMENT_IDS.reduce((acc, id) => {
      acc[id] = id === 'prefer_stability' ? LIKERT_POINTS_REVERSED : LIKERT_POINTS
      return acc
    }, {} as Record<string, Record<LikertOption, number>>),
  },
}

export function computeMaxScore(config: RiskOnboardingScoringConfig): number {
  let total = 0

  for (const question of config.questions) {
    if (question.type === 'single' && question.options?.length) {
      const optionScores = config.scoring.options[question.id] || {}
      const max = Math.max(
        0,
        ...question.options.map((option) => optionScores[option.id] ?? 0)
      )
      total += max
    }

    if (question.type === 'likert-group' && question.statements?.length) {
      for (const statement of question.statements) {
        const mapping = config.scoring.likertStatements[statement.id] || {}
        const max = Math.max(0, ...Object.values(mapping))
        total += max
      }
    }
  }

  return total
}

export function getProfileForScore(score: number, config: RiskOnboardingScoringConfig): RiskProfile {
  const range = config.scoreRanges.find((candidate) => score >= candidate.min && score <= candidate.max)
  return range?.profile ?? 'SEMI'
}
