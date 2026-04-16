"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SdcaChartPoint } from "@/types/dashboard-snapshot";
import { formatNumber, formatUSD } from "@/lib/systems-format";

type RangeKey = "30D" | "90D" | "180D" | "1Y" | "ALL";

const RANGES: { key: RangeKey; days: number | null }[] = [
  { key: "30D", days: 30 },
  { key: "90D", days: 90 },
  { key: "180D", days: 180 },
  { key: "1Y", days: 365 },
  { key: "ALL", days: null },
];

export function SdcaChart({
  chart,
  buyThreshold,
  sellThreshold,
}: {
  chart: SdcaChartPoint[];
  buyThreshold: number;
  sellThreshold: number;
}) {
  const [range, setRange] = useState<RangeKey>("1Y");
  const [showBtc, setShowBtc] = useState(true);
  const [showZ, setShowZ] = useState(true);
  const [showThresholds, setShowThresholds] = useState(true);

  const filtered = useMemo(() => {
    const cfg = RANGES.find((r) => r.key === range);
    if (!cfg || cfg.days === null) return chart;
    return chart.slice(-cfg.days);
  }, [chart, range]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Signal History</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex rounded-lg border p-0.5"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className="rounded px-2 py-1 text-xs font-medium transition-colors"
                style={{
                  background:
                    range === r.key ? "var(--gold-solid)" : "transparent",
                  color: range === r.key ? "#000" : "var(--text-muted)",
                }}
              >
                {r.key}
              </button>
            ))}
          </div>
          <Toggle label="BTC" active={showBtc} onToggle={() => setShowBtc((v) => !v)} />
          <Toggle label="Z" active={showZ} onToggle={() => setShowZ((v) => !v)} />
          <Toggle
            label="Thresholds"
            active={showThresholds}
            onToggle={() => setShowThresholds((v) => !v)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filtered} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                stroke="var(--border-subtle)"
                minTickGap={32}
              />
              <YAxis
                yAxisId="btc"
                orientation="left"
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                stroke="var(--border-subtle)"
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                yAxisId="z"
                orientation="right"
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                stroke="var(--border-subtle)"
                domain={[-4, 4]}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-panel)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--text-strong)" }}
                formatter={(value: number, name: string) => {
                  if (name === "BTC") return [formatUSD(value), name];
                  return [formatNumber(value, 3), name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {showThresholds && (
                <>
                  <ReferenceLine
                    y={buyThreshold}
                    yAxisId="z"
                    stroke="var(--success)"
                    strokeDasharray="4 4"
                    label={{ value: "Buy", fill: "var(--success)", fontSize: 10, position: "insideBottomRight" }}
                  />
                  <ReferenceLine
                    y={sellThreshold}
                    yAxisId="z"
                    stroke="var(--danger)"
                    strokeDasharray="4 4"
                    label={{ value: "Sell", fill: "var(--danger)", fontSize: 10, position: "insideTopRight" }}
                  />
                </>
              )}
              {showBtc && (
                <Line
                  type="monotone"
                  dataKey="btc"
                  name="BTC"
                  stroke="var(--gold-solid)"
                  strokeWidth={2}
                  dot={false}
                  yAxisId="btc"
                />
              )}
              {showZ && (
                <Line
                  type="monotone"
                  dataKey="z"
                  name="Z"
                  stroke="#e5e1d4"
                  strokeWidth={1.5}
                  dot={false}
                  yAxisId="z"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function Toggle({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors"
      style={{
        borderColor: "var(--border-subtle)",
        background: active ? "rgba(201, 162, 39, 0.12)" : "transparent",
        color: active ? "var(--gold-solid)" : "var(--text-muted)",
      }}
    >
      {label}
    </button>
  );
}
