// Shared formatters for the /systems dashboard.

export function formatPct(value: number, digits = 2): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

/**
 * Compact percentage formatter for hero stats. Net profit on multi-year
 * backtests can hit millions of percent, which blows out the grid column.
 * Abbreviates above 10,000% so the value stays inside its card.
 *
 *   24,146,537.6  -> "+24.1M%"
 *      241,000    -> "+241K%"
 *       24,146    -> "+24,146%"
 *           42.5  -> "+42.50%"
 */
export function formatPctCompact(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)}M%`;
  }
  if (abs >= 100_000) {
    return `${sign}${Math.round(abs / 1_000)}K%`;
  }
  if (abs >= 10_000) {
    return `${sign}${Math.round(abs).toLocaleString("en-US")}%`;
  }
  return `${sign}${abs.toFixed(digits)}%`;
}

export function formatNumber(value: number, digits = 2): string {
  return value.toFixed(digits);
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function humaniseIndicator(key: string): string {
  const overrides: Record<string, string> = {
    mvrv_z: "MVRV Z-Score",
    puell: "Puell Multiple",
    rp_dist: "Realised Price Dist.",
    dist_2yr_ma: "2-Year MA Dist.",
    nupl: "NUPL",
    reserve_risk: "Reserve Risk",
    lth_nupl: "LTH NUPL",
    lth_cost_dist: "LTH Cost Basis Dist.",
    lth_mvrv: "LTH MVRV",
    mvrv: "MVRV",
    sth_nupl: "STH NUPL",
    sth_mvrv: "STH MVRV",
    roc_365: "ROC 365d",
    dxy: "DXY",
    thermocap: "Thermocap",
    lth_sopr: "LTH SOPR",
    hash_ribbon: "Hash Ribbon",
    vdd_multiple: "VDD Multiple",
  };
  return (
    overrides[key] ??
    key
      .split("_")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ")
  );
}

/**
 * Returns a heat-tint background style for a z-score.
 * Negative → red, positive → green, near zero → neutral.
 */
export function zScoreTint(z: number): string {
  const clamped = Math.max(-3, Math.min(3, z));
  const intensity = Math.abs(clamped) / 3;
  const alpha = (intensity * 0.18).toFixed(3);
  if (clamped < -0.2) return `rgba(239, 68, 68, ${alpha})`; // red-500
  if (clamped > 0.2) return `rgba(34, 197, 94, ${alpha})`; // green-500
  return "transparent";
}

/**
 * Colour for a return/PnL value.
 */
export function pnlColor(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "var(--text-muted)";
  }
  if (value > 0) return "var(--success)";
  if (value < 0) return "var(--danger)";
  return "var(--text-muted)";
}
