import { Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DhrsStats } from "@/types/dashboard-snapshot";
import { formatPct, formatPctCompact, pnlColor } from "@/lib/systems-format";
import { getAssetDisplayLabel } from "@/lib/portfolio-assets";

function regimeStyle(active: boolean) {
  return active
    ? { bg: "rgba(34, 197, 94, 0.15)", fg: "var(--success)", border: "var(--success)" }
    : { bg: "rgba(138, 125, 107, 0.1)", fg: "var(--text-muted)", border: "var(--border-subtle)" };
}

export function DhrsSignalHero({
  dominant,
  regime,
  stats,
}: {
  dominant: string;
  regime: boolean;
  stats: DhrsStats;
}) {
  const style = regimeStyle(regime);
  const netProfitColor = pnlColor(stats.net_profit_pct);
  const cagrColor = pnlColor(stats.cagr);

  return (
    <Card className="border-l-4" style={{ borderLeftColor: style.border }}>
      <CardContent className="p-6">
        <div className="grid gap-6 md:grid-cols-4">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Currently Holding
            </div>
            <div className="mt-2 heading-lg truncate text-[var(--text-strong)]" title={getAssetDisplayLabel(dominant)}>
              {getAssetDisplayLabel(dominant)}
            </div>
            <div
              className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: style.bg, color: style.fg }}
            >
              <Activity className="h-3 w-3" />
              {regime ? "Regime Active" : "Regime Off"}
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Net Profit
            </div>
            <div
              className="mt-2 truncate text-2xl font-bold tabular-nums lg:text-3xl"
              style={{ color: netProfitColor }}
              title={formatPct(stats.net_profit_pct, 1)}
            >
              {formatPctCompact(stats.net_profit_pct, 1)}
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              Over {stats.years_elapsed.toFixed(1)} years
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              CAGR
            </div>
            <div
              className="mt-2 truncate text-2xl font-bold tabular-nums lg:text-3xl"
              style={{ color: cagrColor }}
              title={formatPct(stats.cagr, 2)}
            >
              {formatPctCompact(stats.cagr, 2)}
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              Annualised return
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Max Drawdown
            </div>
            <div
              className="mt-2 truncate text-2xl font-bold tabular-nums lg:text-3xl"
              style={{ color: "var(--danger)" }}
              title={`-${stats.max_dd_pct.toFixed(2)}%`}
            >
              −{stats.max_dd_pct.toFixed(2)}%
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              Peak to trough
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
