// Dashboard snapshot types — matches schema_version 1.0
// Source: Vercel Blob snapshot written by Coen's api_snapshot.py
// Updated: daily full @ 00:27 UTC, SDCA patch every 5 min

export type SdcaZone =
  | "MAX FEAR"
  | "FEAR"
  | "NEUTRAL"
  | "GREED"
  | "MAX GREED"
  | (string & {});

export type SdcaAction = "BUY" | "HOLD" | "SELL" | (string & {});

export interface SdcaIndicator {
  z: number;
  weight: number;
}

export interface SdcaCyclePerformance {
  label: string;
  return_pct: number;
  cagr: number;
  max_dd: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  sell_quality_pct: number | null;
}

export interface SdcaPerformance {
  concluded: SdcaCyclePerformance[];
  live: SdcaCyclePerformance;
  avg_cagr: number;
  avg_max_dd: number;
  avg_sharpe: number;
  avg_calmar: number;
}

export interface SdcaChartPoint {
  date: string; // ISO date YYYY-MM-DD
  z: number;
  btc: number;
}

export interface SdcaSystem {
  composite_z: number;
  zone: SdcaZone;
  action: SdcaAction;
  btc_price: number;
  buy_threshold: number;
  sell_threshold: number;
  roc_7d: number;
  indicators: Record<string, SdcaIndicator>;
  performance: SdcaPerformance;
  chart: SdcaChartPoint[];
}

export interface DhrsStats {
  net_profit_pct: number;
  cagr: number;
  max_dd_pct: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  omega: number;
  n_rotations: number;
  years_elapsed: number;
}

export interface DhrsRotation {
  date: string;
  from: string;
  to: string;
  return_pct: number;
}

export interface DhrsSystem {
  regime: boolean;
  dominant: string;
  stats: DhrsStats;
  time_in: Record<string, number>;
  recent_rotations: DhrsRotation[];
}

// MRS (Majors Rotation) currently mirrors the DHRS shape, but is defined
// separately so the two can diverge as Coen extends his pipeline.
export interface MrsStats {
  net_profit_pct: number;
  cagr: number;
  max_dd_pct: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  omega: number;
  n_rotations: number;
  years_elapsed: number;
}

export interface MrsRotation {
  date: string;
  from: string;
  to: string;
  return_pct: number;
}

export interface MrsSystem {
  regime: boolean;
  dominant: string;
  stats: MrsStats;
  time_in: Record<string, number>;
  recent_rotations: MrsRotation[];
}

// Stewart Core (mars) and Stewart Select (tars) share the rotation snapshot
// shape used by DHRS / MRS. They're typed as separate aliases so the two can
// diverge in future without cascading edits.
export type MarsSystem = MrsSystem;
export type TarsSystem = MrsSystem;

export interface DashboardSnapshot {
  timestamp: string;
  schema_version: string;
  sdca: SdcaSystem;
  dhrs: DhrsSystem;
  mrs?: MrsSystem;
  mars?: MarsSystem;
  tars?: TarsSystem;
}
