import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SdcaIndicator } from "@/types/dashboard-snapshot";
import { formatNumber, humaniseIndicator, zScoreTint } from "@/lib/systems-format";

export function SdcaIndicatorGrid({
  indicators,
}: {
  indicators: Record<string, SdcaIndicator>;
}) {
  const entries = Object.entries(indicators).sort(
    ([, a], [, b]) => b.weight - a.weight,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Indicators</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {entries.map(([key, ind]) => (
            <div
              key={key}
              className="rounded-lg border p-3 transition-transform hover:scale-[1.02]"
              style={{
                borderColor: "var(--border-subtle)",
                background: zScoreTint(ind.z),
              }}
            >
              <div
                className="truncate text-[10px] uppercase tracking-wider text-[var(--text-muted)]"
                title={humaniseIndicator(key)}
              >
                {humaniseIndicator(key)}
              </div>
              <div className="mt-1 tabular-nums text-sm font-semibold text-[var(--text-strong)]">
                {formatNumber(ind.z, 2)}
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                w {ind.weight.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
