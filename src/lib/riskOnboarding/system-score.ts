import type { RiskOnboardingAnswers, RiskProfile } from './score'
import {
  SYSTEM_AWARE_OPTION_WEIGHTS,
  SYSTEM_AWARE_QUESTION_IDS,
  type SystemAwareQuestionId,
} from './questions'
import { getActiveSystems, type SystemDefinition } from '@/lib/system-registry'
import { brandName } from '@/lib/brand'

export const SYSTEM_FIT_VERSION = 1

export type SystemFit = {
  slug: string
  shortName: string
  fullName: string
  color: string
  score: number
  label: SystemFitLabel
  recommended: boolean
  reasons: string[]
}

export type SystemFitLabel =
  | 'Strong Fit'
  | 'Good Fit'
  | 'Moderate Fit'
  | 'Not Recommended'

export type SystemFitResult = {
  systems: SystemFit[]
  version: number
}

// Max possible raw points across the 5 system-aware questions = 30+25+20+20+25.
const MAX_RAW_PER_SYSTEM = 120

const PROFILE_BONUS: Record<RiskProfile, Record<string, number>> = {
  CONSERVATIVE: { dhrs: -10, mrs: -5, mars: -10, tars: -15, tfars: -15, sdca: 15 },
  SEMI:         { dhrs: 5,   mrs: 10, mars: 10,  tars: 5,   tfars: 5,   sdca: 5 },
  AGGRESSIVE:   { dhrs: 15,  mrs: 10, mars: 10,  tars: 15,  tfars: 15,  sdca: -5 },
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max)
}

function labelForScore(score: number): { label: SystemFitLabel; recommended: boolean } {
  if (score >= 75) return { label: 'Strong Fit', recommended: true }
  if (score >= 55) return { label: 'Good Fit', recommended: true }
  if (score >= 35) return { label: 'Moderate Fit', recommended: false }
  return { label: 'Not Recommended', recommended: false }
}

function readAnswer(
  answers: RiskOnboardingAnswers,
  questionId: SystemAwareQuestionId
): string | undefined {
  return (answers as Record<string, string | undefined>)[questionId]
}

// Track which (question, option, system) contributed how many points so we
// can pick the strongest reasons per system.
type Contribution = {
  questionId: SystemAwareQuestionId
  optionId: string
  systemSlug: string
  points: number
}

function collectContributions(answers: RiskOnboardingAnswers): Contribution[] {
  const out: Contribution[] = []
  for (const questionId of SYSTEM_AWARE_QUESTION_IDS) {
    const optionId = readAnswer(answers, questionId)
    if (!optionId) continue
    const weights = SYSTEM_AWARE_OPTION_WEIGHTS[questionId]?.[optionId]
    if (!weights) continue
    for (const [systemSlug, points] of Object.entries(weights)) {
      if (points > 0) {
        out.push({ questionId, optionId, systemSlug, points })
      }
    }
  }
  return out
}

// Reason copy keyed by (systemSlug, questionId, optionId).
// Falls back to a generic line if a specific entry isn't defined.
const REASON_TEMPLATES: Record<string, Record<string, string>> = {
  dhrs: {
    'investment_style:active_rotation': 'You prefer active, momentum-based strategies',
    'investment_style:mixed':           'You’re open to active strategies as part of a mix',
    'asset_universe:broad_alts':        'You’re comfortable with a wide range of crypto assets',
    'monitoring_pref:daily':            'You want to monitor and act on signals frequently',
    'monitoring_pref:weekly':           'Weekly check-ins still suit Stewart & Co Broad’s rotation cadence',
    'dd_tolerance:dd_30':               'Your drawdown tolerance aligns with Stewart & Co Broad’s regime-protected style',
    'dd_tolerance:dd_50':               'You can stomach the larger drawdowns Stewart & Co Broad occasionally accepts for upside',
    'time_commitment:significant':      'You enjoy actively following markets',
    'time_commitment:moderate':         'Moderate weekly time commitment fits Stewart & Co Broad',
  },
  mrs: {
    'investment_style:major_rotation':  'You prefer rotating between established, major assets',
    'investment_style:active_rotation': 'You’re comfortable with rotation strategies',
    'investment_style:mixed':           'You like blending approaches — Stewart & Co Majors sits in the middle',
    'asset_universe:majors_only':       'You want exposure limited to top-tier assets',
    'asset_universe:broad_alts':        'You’re open to majors as a core sleeve',
    'monitoring_pref:weekly':           'Weekly monitoring aligns with Stewart & Co Majors’ rotation cadence',
    'monitoring_pref:daily':            'You can act quickly when Stewart & Co Majors rotates',
    'dd_tolerance:dd_10':               'Stewart & Co Majors’ narrower universe offers tighter risk management',
    'dd_tolerance:dd_30':               'Your drawdown tolerance suits Stewart & Co Majors’ majors-only rotation',
    'time_commitment:moderate':         'A weekly time commitment matches Stewart & Co Majors’ cadence',
    'time_commitment:significant':      'You enjoy following markets — useful when Stewart & Co Majors rotates',
  },
  sdca: {
    'investment_style:passive_dca':     'You prefer systematic, rules-based accumulation',
    'investment_style:mixed':           'Stewart & Co Cycle can anchor a mixed strategy',
    'asset_universe:btc_only':          'Your Bitcoin focus aligns perfectly with Stewart & Co Cycle',
    'asset_universe:majors_only':       'Stewart & Co Cycle’s BTC focus complements a majors-only mindset',
    'monitoring_pref:monthly':          'Stewart & Co Cycle’s low-frequency signals suit your set-and-forget preference',
    'monitoring_pref:weekly':           'A weekly check-in is more than enough for Stewart & Co Cycle',
    'dd_tolerance:dd_50':               'Stewart & Co Cycle accumulates through deep drawdowns — your tolerance fits',
    'dd_tolerance:dd_30':               'Moderate drawdown tolerance pairs well with Stewart & Co Cycle’s long horizon',
    'time_commitment:minimal':          'Stewart & Co Cycle requires minimal time — trades happen a few times per year',
    'time_commitment:moderate':         'A modest time budget is plenty for Stewart & Co Cycle',
  },
  mars: {
    'investment_style:active_rotation': 'You like active rotation — Stewart & Co Core runs ~17 rotations a year across the deepest majors',
    'investment_style:major_rotation':  'You prefer rotating between majors — Stewart & Co Core extends that across six core assets',
    'investment_style:mixed':           'Stewart & Co Core anchors a mixed portfolio with a major-coin growth tilt',
    'asset_universe:majors_only':       'Stewart & Co Core stays inside the majors universe (BTC, ETH, SOL, SUI, XRP, BNB)',
    'asset_universe:broad_alts':        'Stewart & Co Core is a curated step toward a wider universe without exotic alts',
    'monitoring_pref:weekly':           'Weekly check-ins fit Stewart & Co Core’s rotation cadence',
    'monitoring_pref:daily':            'You can act quickly when Stewart & Co Core rotates',
    'dd_tolerance:dd_30':               'Stewart & Co Core targets a ~30% drawdown ceiling — your tolerance fits',
    'dd_tolerance:dd_50':               'You can stomach the moderate drawdowns Stewart & Co Core occasionally accepts for upside',
    'time_commitment:moderate':         'A moderate weekly time budget matches Stewart & Co Core’s cadence',
    'time_commitment:significant':      'Active engagement helps you act on Stewart & Co Core rotations',
  },
  tars: {
    'investment_style:active_rotation': 'You prefer active rotation — Stewart & Co Select is calibrated for the highest risk-adjusted return in the suite',
    'investment_style:major_rotation':  'You like majors-style rotation — Stewart & Co Select extends to ten sector leaders',
    'investment_style:mixed':           'Stewart & Co Select can power the active sleeve of a mixed portfolio',
    'asset_universe:broad_alts':        'You’re comfortable beyond the top six — Stewart & Co Select adds LINK, DOGE, TRX, and HYPE',
    'asset_universe:majors_only':       'Stewart & Co Select sits just beyond majors-only — extended majors with on-chain Gold defensive',
    'monitoring_pref:daily':            'Daily engagement fits Stewart & Co Select’s active cadence',
    'monitoring_pref:weekly':           'Weekly check-ins still suit Stewart & Co Select if you act on rotations promptly',
    'dd_tolerance:dd_30':               'Stewart & Co Select targets a ~25–30% drawdown — your tolerance lines up',
    'dd_tolerance:dd_50':               'You can stomach the drawdowns Stewart & Co Select occasionally accepts for upside',
    'time_commitment:significant':      'Active engagement matches Stewart & Co Select — including comfort with multi-venue execution (HYPE on Hyperliquid)',
    'time_commitment:moderate':         'A moderate weekly time budget works for Stewart & Co Select if you’re ready to handle HYPE on Hyperliquid',
  },
  tfars: {
    'investment_style:active_rotation': 'You prefer active rotation — Stewart & Co Extended is the apex Calmar of the rotation suite, with ~38 rotations a year',
    'investment_style:major_rotation':  'You like majors-style rotation — Stewart & Co Extended widens it to a 25-asset deep-history universe',
    'investment_style:mixed':           'Stewart & Co Extended adds a high-conviction active sleeve to a mixed portfolio',
    'asset_universe:broad_alts':        'You’re comfortable with a wider universe — Stewart & Co Extended rotates across 25 deep-history assets',
    'asset_universe:majors_only':       'Stewart & Co Extended sits beyond majors-only — extended sector leaders with regime-gated drawdown protection',
    'monitoring_pref:daily':            'Daily engagement fits Stewart & Co Extended’s ~38-rotation-a-year cadence',
    'monitoring_pref:weekly':           'Weekly check-ins still work for Stewart & Co Extended if you act on rotations promptly',
    'dd_tolerance:dd_30':               'Stewart & Co Extended targets a ~32% drawdown ceiling — your tolerance lines up',
    'dd_tolerance:dd_50':               'You can stomach the drawdowns Stewart & Co Extended occasionally accepts for its apex Calmar',
    'time_commitment:significant':      'Active engagement matches Stewart & Co Extended — the most active rotation system after Broad',
    'time_commitment:moderate':         'A moderate weekly time budget works for Stewart & Co Extended if you’re ready to act on rotations promptly',
  },
}

function reasonFor(systemSlug: string, questionId: string, optionId: string): string | null {
  const key = `${questionId}:${optionId}`
  return REASON_TEMPLATES[systemSlug]?.[key] ?? null
}

function profileReason(systemSlug: string, profile: RiskProfile): string | null {
  if (systemSlug === 'dhrs' && profile === 'AGGRESSIVE') {
    return 'Your overall risk profile suits active rotation'
  }
  if (systemSlug === 'mrs' && profile === 'SEMI') {
    return 'Your balanced risk profile matches Stewart & Co Majors’ approach'
  }
  if (systemSlug === 'mars' && (profile === 'SEMI' || profile === 'AGGRESSIVE')) {
    return 'Your risk profile suits Stewart & Co Core’s majors-plus growth tilt'
  }
  if (systemSlug === 'tars' && profile === 'AGGRESSIVE') {
    return 'Your aggressive profile matches Stewart & Co Select’s extended-majors lineup'
  }
  if (systemSlug === 'tfars' && profile === 'AGGRESSIVE') {
    return 'Your aggressive profile matches Stewart & Co Extended’s 25-asset deep-history rotation'
  }
  if (systemSlug === 'tfars' && profile === 'SEMI') {
    return 'Your balanced profile is a good fit for Stewart & Co Extended’s regime-gated rotation'
  }
  if (systemSlug === 'tfars' && profile === 'CONSERVATIVE') {
    return 'Stewart & Co Extended’s active 25-asset rotation runs hotter than a conservative profile prefers'
  }
  if (systemSlug === 'sdca' && profile === 'CONSERVATIVE') {
    return 'Your conservative profile matches Stewart & Co Cycle’s longer-term approach'
  }
  return null
}

function buildReasons(
  systemSlug: string,
  profile: RiskProfile,
  contributions: Contribution[]
): string[] {
  const own = contributions
    .filter((c) => c.systemSlug === systemSlug)
    .sort((a, b) => b.points - a.points)

  const reasons: string[] = []
  for (const c of own) {
    const text = reasonFor(systemSlug, c.questionId, c.optionId)
    if (text && !reasons.includes(text)) {
      reasons.push(text)
    }
    if (reasons.length >= 3) break
  }

  if (reasons.length < 3) {
    const profileLine = profileReason(systemSlug, profile)
    if (profileLine && !reasons.includes(profileLine)) {
      reasons.push(profileLine)
    }
  }

  return reasons.slice(0, 3)
}

/**
 * Compute per-system fit scores from the user's quiz answers + their generic
 * risk profile. Returns one entry per active system in the registry, sorted
 * by score descending.
 */
export function computeSystemFit(
  answers: RiskOnboardingAnswers,
  profile: RiskProfile
): SystemFitResult {
  const activeSystems = getActiveSystems()
  const contributions = collectContributions(answers)

  // Sum raw points per system from the system-aware questions.
  const rawByslug: Record<string, number> = {}
  for (const c of contributions) {
    rawByslug[c.systemSlug] = (rawByslug[c.systemSlug] ?? 0) + c.points
  }

  const systems: SystemFit[] = activeSystems.map((sys: SystemDefinition) => {
    const raw = rawByslug[sys.slug] ?? 0
    const normalized = Math.round((raw / MAX_RAW_PER_SYSTEM) * 100)
    const bonus = PROFILE_BONUS[profile]?.[sys.slug] ?? 0
    const score = clamp(normalized + bonus, 0, 100)
    const { label, recommended } = labelForScore(score)
    const reasons = buildReasons(sys.slug, profile, contributions)
    return {
      slug: sys.slug,
      shortName: brandName(sys.slug),
      fullName: sys.description,
      color: sys.color,
      score,
      label,
      recommended,
      reasons,
    }
  })

  systems.sort((a, b) => b.score - a.score)
  return { systems, version: SYSTEM_FIT_VERSION }
}
