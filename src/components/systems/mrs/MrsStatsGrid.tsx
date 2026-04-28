import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MrsStats } from "@/types/dashboard-snapshot";
import { formatNumber } from "@/lib/systems-format";

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--bg-panel)",
      }}
    >
      <div className="truncate text-[10px] uppercase tracking-wider text-[var(--text-muted)]" title={label}>
        {label}
      </div>
      <div className="mt-1 tabular-nums text-sm font-semibold text-[var(--text-strong)]">
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-[var(--text-muted)]">
          {sub}
        </div>
      )}
    </div>
  );
}

export function MrsStatsGrid({ stats }: { stats: MrsStats }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk-Adjusted Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Sharpe" value={formatNumber(stats.sharpe, 2)} sub="Risk-adj return" />
          <Stat label="Sortino" value={formatNumber(stats.sortino, 2)} sub="Downside-adj" />
          <Stat label="Calmar" value={formatNumber(stats.calmar, 2)} sub="Return / Max DD" />
          <Stat label="Omega" value={formatNumber(stats.omega, 2)} sub="Gain / Loss" />
          <Stat label="Rotations" value={stats.n_rotations.toString()} sub="Total count" />
          <Stat label="Years" value={formatNumber(stats.years_elapsed, 2)} sub="Sample size" />
        </div>
      </CardContent>
    </Card>
  );
}
