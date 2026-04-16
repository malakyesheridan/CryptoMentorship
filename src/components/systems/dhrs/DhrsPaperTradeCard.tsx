import { Card, CardContent } from "@/components/ui/card";
import type { DhrsPaper } from "@/types/dashboard-snapshot";
import { formatPct, pnlColor } from "@/lib/systems-format";

function daysBetween(start: string, end: string) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
}

export function DhrsPaperTradeCard({ paper }: { paper: DhrsPaper }) {
  const now = Date.now();
  const start = new Date(paper.start_date).getTime();
  const end = new Date(paper.end_date).getTime();
  const total = Math.max(1, end - start);
  const elapsed = Math.max(0, Math.min(total, now - start));
  const progress = (elapsed / total) * 100;
  const totalDays = daysBetween(paper.start_date, paper.end_date);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Paper Trade · {paper.current_asset}
            </div>
            <div
              className="mt-2 text-3xl font-bold tabular-nums"
              style={{ color: pnlColor(paper.pnl_pct) }}
            >
              {formatPct(paper.pnl_pct, 2)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[var(--text-muted)]">Trades</div>
            <div className="text-lg font-semibold text-[var(--text-strong)]">
              {paper.trades}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div
            className="h-2 overflow-hidden rounded-full"
            style={{ background: "var(--bg-panel)" }}
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${progress}%`,
                background: "var(--gold-solid)",
              }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-[var(--text-muted)]">
            <span>{paper.start_date}</span>
            <span>{totalDays}d window</span>
            <span>{paper.end_date}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
