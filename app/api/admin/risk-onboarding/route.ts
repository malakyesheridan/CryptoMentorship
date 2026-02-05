import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth-server'
import {
  DEFAULT_RISK_ONBOARDING_CONFIG,
  computeMaxScore,
  type RiskOnboardingScoringConfig,
} from '@/lib/riskOnboarding/config'
import { getRiskOnboardingConfig, saveRiskOnboardingConfig } from '@/lib/riskOnboarding/config-store'
import { type LikertOption } from '@/lib/riskOnboarding/questions'

const likertOptions: LikertOption[] = [
  'strongly_agree',
  'agree',
  'neutral',
  'disagree',
  'strongly_disagree',
]

const rangeSchema = z.object({
  profile: z.enum(['CONSERVATIVE', 'SEMI', 'AGGRESSIVE']),
  min: z.number().int().min(0).max(100),
  max: z.number().int().min(0).max(100),
  label: z.string().min(1),
  description: z.string().min(1),
})

const questionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.enum(['single', 'likert-group', 'text']),
  optional: z.boolean().optional(),
  options: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) })).optional(),
  statements: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) })).optional(),
})

const configSchema = z.object({
  scoreMeaning: z.string().min(1),
  scoreRanges: z.array(rangeSchema).length(3),
  questions: z.array(questionSchema).min(1),
  scoring: z.object({
    options: z.record(z.string(), z.record(z.string(), z.number())),
    likertStatements: z.record(
      z.string(),
      z.record(z.enum(likertOptions as [LikertOption, ...LikertOption[]]), z.number())
    ),
  }),
})

function validateRanges(ranges: RiskOnboardingScoringConfig['scoreRanges']) {
  const errors: string[] = []
  const sorted = [...ranges].sort((a, b) => a.min - b.min)
  const profiles = new Set(sorted.map((range) => range.profile))
  if (profiles.size !== 3) {
    errors.push('Each score range must map to a unique profile.')
  }
  if (sorted[0]?.min !== 0) {
    errors.push('Score ranges must start at 0.')
  }
  if (sorted[sorted.length - 1]?.max !== 100) {
    errors.push('Score ranges must end at 100.')
  }
  for (let i = 0; i < sorted.length; i += 1) {
    const range = sorted[i]
    if (range.min > range.max) {
      errors.push(`Range for ${range.label} has min greater than max.`)
    }
    if (i > 0) {
      const prev = sorted[i - 1]
      if (range.min !== prev.max + 1) {
        errors.push('Score ranges must be continuous with no gaps.')
      }
    }
  }
  return errors
}

function validateScoring(config: RiskOnboardingScoringConfig) {
  const errors: string[] = []

  for (const question of config.questions) {
    if (question.type === 'single') {
      if (!question.options?.length) {
        errors.push(`Question "${question.id}" must have options.`)
        continue
      }
      const optionScores = config.scoring.options[question.id]
      if (!optionScores) {
        errors.push(`Missing scoring map for question "${question.id}".`)
        continue
      }
      for (const option of question.options) {
        const score = optionScores[option.id]
        if (typeof score !== 'number' || Number.isNaN(score)) {
          errors.push(`Missing score for option "${question.id}.${option.id}".`)
          continue
        }
        if (score < 0 || score > 100) {
          errors.push(`Score for "${question.id}.${option.id}" must be between 0 and 100.`)
        }
      }
    }

    if (question.type === 'likert-group') {
      if (!question.statements?.length) {
        errors.push(`Question "${question.id}" must have statements.`)
        continue
      }
      for (const statement of question.statements) {
        const mapping = config.scoring.likertStatements[statement.id]
        if (!mapping) {
          errors.push(`Missing likert scoring for "${statement.id}".`)
          continue
        }
        for (const option of likertOptions) {
          const score = mapping[option]
          if (typeof score !== 'number' || Number.isNaN(score)) {
            errors.push(`Missing score for "${statement.id}.${option}".`)
            continue
          }
          if (score < 0 || score > 100) {
            errors.push(`Score for "${statement.id}.${option}" must be between 0 and 100.`)
          }
        }
      }
    }
  }

  const maxScore = computeMaxScore(config)
  if (maxScore <= 0) {
    errors.push('Total maximum score must be greater than 0.')
  }

  return { errors, maxScore }
}

export async function GET() {
  await requireRole(['admin'])
  const config = await getRiskOnboardingConfig()
  return NextResponse.json({
    ...config,
    maxScore: computeMaxScore(config),
  })
}

export async function POST(request: NextRequest) {
  const user = await requireRole(['admin'])
  const body = await request.json()
  const parsed = configSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
  }

  const normalizedQuestions = parsed.data.questions.map((question) => ({
    ...question,
    description: question.description ?? undefined,
  }))

  const config: RiskOnboardingScoringConfig = {
    ...DEFAULT_RISK_ONBOARDING_CONFIG,
    ...parsed.data,
    questions: normalizedQuestions,
    version: DEFAULT_RISK_ONBOARDING_CONFIG.version,
  }

  const rangeErrors = validateRanges(config.scoreRanges)
  const { errors: scoringErrors, maxScore } = validateScoring(config)
  const errors = [...rangeErrors, ...scoringErrors]

  if (errors.length > 0) {
    return NextResponse.json({ error: 'Invalid configuration', details: errors }, { status: 400 })
  }

  const saved = await saveRiskOnboardingConfig(parsed.data, user.id)
  const savedConfig = saved.config as RiskOnboardingScoringConfig

  return NextResponse.json({
    ...savedConfig,
    version: saved.version,
    maxScore,
  })
}
