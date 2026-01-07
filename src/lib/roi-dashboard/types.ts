export type SeriesType = 'MODEL' | 'BTC' | 'ETH'

export interface PerformancePoint {
  date: string
  value: number
}

export interface AllocationItem {
  asset: string
  weight: number
}

export interface AllocationSnapshot {
  asOfDate: string
  items: AllocationItem[]
  cashWeight: number
}

export interface ChangeLogEvent {
  id: string
  date: string
  title: string
  summary: string
  linkUrl?: string | null
}

export interface DashboardSettings {
  inceptionDate: string
  disclaimerText: string
  showBtcBenchmark: boolean
  showEthBenchmark: boolean
  showSimulator: boolean
  showChangeLog: boolean
  showAllocation: boolean
}

export interface RoiDerivedMetrics {
  roiSinceInceptionPct: number
  roiLast30DaysPct: number
  maxDrawdownPct: number
  investedPct: number
  cashPct: number
  lastUpdatedAt: string | null
  asOfDate: string | null
}

export interface ValidationSummary {
  errors: string[]
  warnings: string[]
}

export interface RoiDashboardPayload {
  settings: DashboardSettings
  series: {
    model: PerformancePoint[]
    btc: PerformancePoint[]
    eth: PerformancePoint[]
  }
  allocation: AllocationSnapshot | null
  changeLogEvents: ChangeLogEvent[]
  metrics: RoiDerivedMetrics
  validation: ValidationSummary
}

export interface SimulatorInput {
  startingCapital: number
  startDate: string
  includeMonthlyContributions: boolean
  monthlyContribution: number
}

export interface SimulatorResult {
  series: Array<{ date: string; balance: number }>
  finalBalance: number
  totalContributed: number
  profit: number
  roiPct: number
  maxDrawdownPct: number
  maxDrawdownAmount: number
}
