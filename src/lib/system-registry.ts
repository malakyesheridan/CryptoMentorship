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
    name: 'Dynamic Hedging Rotation System',
    shortName: 'DHRS',
    description:
      'Momentum-driven rotation across 60+ crypto assets with regime-based drawdown protection.',
    type: 'rotation',
    signalFormat: 'rotation',
    isActive: true,
    sortOrder: 10,
    color: '#C9A84C',
    emailSubjectPrefix: 'DHRS Signal',
  },
  {
    slug: 'mrs',
    name: 'Majors Rotation System',
    shortName: 'MRS',
    description:
      'Systematic rotation across major crypto assets with regime-based drawdown protection.',
    type: 'rotation',
    signalFormat: 'rotation',
    isActive: true,
    sortOrder: 20,
    color: '#5B8DEF',
    emailSubjectPrefix: 'MRS Signal',
  },
  {
    slug: 'sdca',
    name: 'Strategic Dollar Cost Averaging',
    shortName: 'SDCA',
    description:
      'Rules-based Bitcoin accumulation and distribution across 4-year cycles using 18 on-chain indicators.',
    type: 'buy_system',
    signalFormat: 'zone_action',
    isActive: true,
    sortOrder: 30,
    color: '#10B981',
    emailSubjectPrefix: 'SDCA Signal',
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
