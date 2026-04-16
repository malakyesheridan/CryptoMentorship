import { Card, CardContent } from "@/components/ui/card";
import type { DhrsStats } from "@/types/dashboard-snapshot";
import { formatNumber, formatPct, pnlColor } from "@/lib/systems-format";

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--bg-panel)",
      }}
    >
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </div>
      <div
        className="mt-1 text-lg font-semibold tabular-nums"
        style={{ color: color ?? "var(--text-strong)" }}
      >
        {value}
      </div>
    </div>
  );
}

export function DhrsStatsGrid({ stats }: { stats: DhrsStats }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-3 md:grid-cols-5 lg:grid-cols-9">
          <Stat
            label="Net Profit"
            value={formatPct(stats.net_profit_pct, 1)}
            color={pnlColor(stats.net_profit_pct)}
          />
          <Stat
            label="CAGR"
            value={formatPct(stats.cagr, 2)}
            color={pnlColor(stats.cagr)}
          />
          <Stat
            label="Max DD"
            value={`-${stats.max_dd_pct.toFixed(2)}%`}
            color="var(--danger)"
          />
          <Stat label="Sharpe" value={formatNumber(stats.sharpe, 2)} />
          <Stat label="Sortino" value={formatNumber(stats.sortino, 2)} />
          <Stat label="Calmar" value={formatNumber(stats.calmar, 2)} />
          <Stat label="Omega" value={formatNumber(stats.omega, 2)} />
          <Stat label="Rotations" value={stats.n_rotations.toString()} />
          <Stat label="Years" value={formatNumber(stats.years_elapsed, 2)} />
        </div>
      </CardContent>
    </Card>
  );
}
