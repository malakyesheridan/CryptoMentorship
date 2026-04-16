import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SdcaPerformance, SdcaCyclePerformance } from "@/types/dashboard-snapshot";
import { formatNumber, formatPct, pnlColor } from "@/lib/systems-format";

const COLS = [
  { key: "label", label: "Cycle" },
  { key: "return_pct", label: "Return" },
  { key: "cagr", label: "CAGR" },
  { key: "max_dd", label: "Max DD" },
  { key: "sharpe", label: "Sharpe" },
  { key: "sortino", label: "Sortino" },
  { key: "calmar", label: "Calmar" },
  { key: "sell_quality_pct", label: "Sell Quality" },
] as const;

function Cell({ value, fmt }: { value: number | null; fmt: "pct" | "num" }) {
  if (value === null) return <span className="text-[var(--text-muted)]">—</span>;
  const text = fmt === "pct" ? formatPct(value, 2) : formatNumber(value, 2);
  return <span style={{ color: pnlColor(value) }}>{text}</span>;
}

function Row({
  row,
  highlight,
}: {
  row: SdcaCyclePerformance;
  highlight?: boolean;
}) {
  return (
    <tr
      className={highlight ? "border-l-2" : ""}
      style={
        highlight
          ? { borderLeftColor: "var(--gold-solid)", background: "rgba(201, 162, 39, 0.05)" }
          : undefined
      }
    >
      <td className="px-3 py-2.5 text-sm font-medium text-[var(--text-strong)]">
        {row.label}
      </td>
      <td className="px-3 py-2.5 text-right text-sm tabular-nums">
        <Cell value={row.return_pct} fmt="pct" />
      </td>
      <td className="px-3 py-2.5 text-right text-sm tabular-nums">
        <Cell value={row.cagr} fmt="pct" />
      </td>
      <td className="px-3 py-2.5 text-right text-sm tabular-nums">
        <Cell value={row.max_dd} fmt="pct" />
      </td>
      <td className="px-3 py-2.5 text-right text-sm tabular-nums">
        {formatNumber(row.sharpe, 3)}
      </td>
      <td className="px-3 py-2.5 text-right text-sm tabular-nums">
        {formatNumber(row.sortino, 3)}
      </td>
      <td className="px-3 py-2.5 text-right text-sm tabular-nums">
        {formatNumber(row.calmar, 3)}
      </td>
      <td className="px-3 py-2.5 text-right text-sm tabular-nums">
        {row.sell_quality_pct === null ? (
          <span className="text-[var(--text-muted)]">—</span>
        ) : (
          `${row.sell_quality_pct.toFixed(2)}%`
        )}
      </td>
    </tr>
  );
}

export function SdcaPerformanceTable({ performance }: { performance: SdcaPerformance }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cycle Performance</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="min-w-full">
          <thead>
            <tr
              className="border-b"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              {COLS.map((c) => (
                <th
                  key={c.key}
                  className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                  style={{ textAlign: c.key === "label" ? "left" : "right" }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            className="divide-y"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            {performance.concluded.map((r) => (
              <Row key={r.label} row={r} />
            ))}
            <Row row={performance.live} highlight />
            <tr
              className="border-t-2"
              style={{ borderTopColor: "var(--border-subtle)", background: "var(--bg-panel)" }}
            >
              <td className="px-3 py-2.5 text-sm font-semibold text-[var(--text-muted)]">
                Average
              </td>
              <td className="px-3 py-2.5 text-right text-sm tabular-nums text-[var(--text-muted)]">
                —
              </td>
              <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                <Cell value={performance.avg_cagr} fmt="pct" />
              </td>
              <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                <Cell value={performance.avg_max_dd} fmt="pct" />
              </td>
              <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                {formatNumber(performance.avg_sharpe, 3)}
              </td>
              <td className="px-3 py-2.5 text-right text-sm tabular-nums text-[var(--text-muted)]">
                —
              </td>
              <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                {formatNumber(performance.avg_calmar, 3)}
              </td>
              <td className="px-3 py-2.5 text-right text-sm tabular-nums text-[var(--text-muted)]">
                —
              </td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
