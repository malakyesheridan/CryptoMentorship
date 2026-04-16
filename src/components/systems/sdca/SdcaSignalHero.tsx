import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { SdcaSystem } from "@/types/dashboard-snapshot";
import { formatNumber, formatPct, formatUSD, pnlColor } from "@/lib/systems-format";

function actionStyle(action: string) {
  switch (action.toUpperCase()) {
    case "BUY":
      return { bg: "rgba(34, 197, 94, 0.15)", fg: "var(--success)", border: "var(--success)" };
    case "SELL":
      return { bg: "rgba(239, 68, 68, 0.15)", fg: "var(--danger)", border: "var(--danger)" };
    default:
      return { bg: "rgba(201, 162, 39, 0.15)", fg: "var(--gold-solid)", border: "var(--gold-solid)" };
  }
}

export function SdcaSignalHero({ data }: { data: SdcaSystem }) {
  const style = actionStyle(data.action);
  const rocPct = data.roc_7d * 100;
  const RocIcon = rocPct > 0 ? ArrowUp : rocPct < 0 ? ArrowDown : Minus;

  return (
    <Card
      className="border-l-4"
      style={{ borderLeftColor: style.border }}
    >
      <CardContent className="p-6">
        <div className="grid gap-6 md:grid-cols-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Zone
            </div>
            <div className="mt-2 heading-lg text-[var(--text-strong)]">
              {data.zone}
            </div>
            <div
              className="mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: style.bg, color: style.fg }}
            >
              {data.action}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Composite Z
            </div>
            <div className="mt-2 heading-lg tabular-nums text-[var(--text-strong)]">
              {formatNumber(data.composite_z, 2)}
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              Buy ≤ {data.buy_threshold} · Sell ≥ {data.sell_threshold}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              BTC Price
            </div>
            <div className="mt-2 heading-lg tabular-nums text-[var(--text-strong)]">
              {formatUSD(data.btc_price)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              ROC 7d
            </div>
            <div
              className="mt-2 flex items-center gap-1 heading-lg tabular-nums"
              style={{ color: pnlColor(rocPct) }}
            >
              <RocIcon className="h-5 w-5" />
              {formatPct(rocPct, 2)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
