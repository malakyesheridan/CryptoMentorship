// Single source of truth for trading systems exposed on the platform.
// UI, ingest validation, and email delivery should all reference this list.
// Adding a new system is a registry edit, not a code change scattered across
// components.

export type SystemSignalFormat = 'rotation' | 'zone_action'

export interface SystemDefinition {
  slug: string
  name: string
  shortName: string
  description: string
  type: 'rotation' | 'buy_system' | 'combined'
  signalFormat: SystemSignalFormat
  isActive: boolean
  sortOrder: number
  color: string
  emailSubjectPrefix: string
}

export const SYSTEMS: SystemDefinition[] = [
  {
    slug: 'dhrs',
    name: 'Stewart & Co Broad',
    shortName: 'Stewart & Co Broad',
    description:
      'Momentum-driven rotation across 60+ crypto assets with regime-based drawdown protection.',
    type: 'rotation',
    signalFormat: 'rotation',
    isActive: true,
    sortOrder: 10,
    color: '#C9A84C',
    emailSubjectPrefix: 'Stewart & Co Broad Signal',
  },
  {
    slug: 'mrs',
    name: 'Stewart & Co Majors',
    shortName: 'Stewart & Co Majors',
    description:
      'Systematic rotation across BTC, ETH, and SOL with Gold as the defensive sleeve.',
    type: 'rotation',
    signalFormat: 'rotation',
    isActive: true,
    sortOrder: 20,
    color: '#5B8DEF',
    emailSubjectPrefix: 'Stewart & Co Majors Signal',
  },
  {
    slug: 'mars',
    name: 'Stewart & Co Core',
    shortName: 'Stewart & Co Core',
    description:
      'Six-asset rotation across BTC, ETH, SOL, SUI, XRP, and BNB with Gold defensive.',
    type: 'rotation',
    signalFormat: 'rotation',
    isActive: true,
    sortOrder: 22,
    color: '#A78BFA',
    emailSubjectPrefix: 'Stewart & Co Core Signal',
  },
  {
    slug: 'tars',
    name: 'Stewart & Co Select',
    shortName: 'Stewart & Co Select',
    description:
      'Ten-asset rotation across BTC, ETH, SOL, SUI, XRP, BNB, LINK, DOGE, TRX, and HYPE with Gold defensive.',
    type: 'rotation',
    signalFormat: 'rotation',
    isActive: true,
    sortOrder: 24,
    color: '#F472B6',
    emailSubjectPrefix: 'Stewart & Co Select Signal',
  },
  {
    slug: 'tfars',
    name: 'Stewart & Co Extended',
    shortName: 'Stewart & Co Extended',
    description:
      '25-asset deep-history rotation across the established crypto universe with Gold defensive escape.',
    type: 'rotation',
    signalFormat: 'rotation',
    isActive: true,
    sortOrder: 26,
    color: '#FB923C',
    emailSubjectPrefix: 'Stewart & Co Extended Signal',
  },
  {
    slug: 'sdca',
    name: 'Stewart & Co Cycle',
    shortName: 'Stewart & Co Cycle',
    description:
      'Rules-based Bitcoin accumulation and distribution across 4-year cycles using 18 on-chain indicators.',
    type: 'buy_system',
    signalFormat: 'zone_action',
    isActive: true,
    sortOrder: 30,
    color: '#10B981',
    emailSubjectPrefix: 'Stewart & Co Cycle Signal',
  },
]

export function getSystem(slug: string): SystemDefinition | undefined {
  return SYSTEMS.find((s) => s.slug === slug)
}

export function getActiveSystems(): SystemDefinition[] {
  return SYSTEMS.filter((s) => s.isActive).sort(
    (a, b) => a.sortOrder - b.sortOrder
  )
}

export function getRotationSystems(): SystemDefinition[] {
  return getActiveSystems().filter((s) => s.signalFormat === 'rotation')
}

export function isValidSystemSlug(slug: string): boolean {
  return SYSTEMS.some((s) => s.slug === slug)
}
