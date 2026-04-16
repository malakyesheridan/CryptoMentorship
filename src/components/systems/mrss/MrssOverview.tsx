import { Card, CardContent } from "@/components/ui/card";
import { formatPct, pnlColor } from "@/lib/systems-format";

export function MrssOverview({
  regime,
  lastCycle,
  totalPnl,
}: {
  regime: boolean;
  lastCycle: string;
  totalPnl: number;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              BTC Regime
            </div>
            <div
              className="mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold"
              style={{
                borderColor: regime ? "var(--success)" : "var(--border-subtle)",
                color: regime ? "var(--success)" : "var(--text-muted)",
                background: regime
                  ? "rgba(34, 197, 94, 0.1)"
                  : "var(--bg-panel)",
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background: regime ? "var(--success)" : "var(--text-muted)",
                }}
              />
              {regime ? "Active" : "Off"}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Last Cycle
            </div>
            <div className="mt-2 text-lg font-semibold text-[var(--text-strong)]">
              {lastCycle}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Total Paper PnL
            </div>
            <div
              className="mt-2 text-2xl font-bold tabular-nums"
              style={{ color: pnlColor(totalPnl) }}
            >
              {formatPct(totalPnl, 2)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
