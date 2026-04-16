"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BarChart3, Table as TableIcon } from "lucide-react";

type Mode = "bar" | "table";

export function DhrsTimeAllocation({
  timeIn,
}: {
  timeIn: Record<string, number>;
}) {
  const [mode, setMode] = useState<Mode>("bar");
  const [search, setSearch] = useState("");

  const sorted = useMemo(
    () =>
      Object.entries(timeIn).sort(([, a], [, b]) => b - a),
    [timeIn],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(([k]) => k.toLowerCase().includes(q));
  }, [sorted, search]);

  const max = sorted[0]?.[1] ?? 1;
  const visible = mode === "bar" ? sorted.slice(0, 15) : filtered;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Time Allocation</CardTitle>
        <div className="flex items-center gap-2">
          {mode === "table" && (
            <Input
              placeholder="Search asset…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-40 text-xs"
            />
          )}
          <div
            className="flex rounded-lg border p-0.5"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <button
              onClick={() => setMode("bar")}
              className="rounded p-1.5"
              style={{
                background: mode === "bar" ? "var(--gold-solid)" : "transparent",
                color: mode === "bar" ? "#000" : "var(--text-muted)",
              }}
              aria-label="Bar view"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMode("table")}
              className="rounded p-1.5"
              style={{
                background: mode === "table" ? "var(--gold-solid)" : "transparent",
                color: mode === "table" ? "#000" : "var(--text-muted)",
              }}
              aria-label="Table view"
            >
              <TableIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {mode === "bar" ? (
          <div className="space-y-2">
            {visible.map(([asset, pct]) => (
              <div key={asset} className="flex items-center gap-3">
                <div
                  className="w-16 shrink-0 truncate text-xs text-[var(--text-strong)]"
                  title={asset}
                >
                  {asset}
                </div>
                <div
                  className="h-6 flex-1 overflow-hidden rounded"
                  style={{ background: "var(--bg-panel)" }}
                >
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${(pct / max) * 100}%`,
                      background: "var(--gold-solid)",
                    }}
                  />
                </div>
                <div className="w-12 shrink-0 text-right text-xs tabular-nums text-[var(--text-muted)]">
                  {pct.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0" style={{ background: "var(--bg-panel)" }}>
                <tr>
                  <th className="px-2 py-1.5 text-left text-xs uppercase text-[var(--text-muted)]">
                    Asset
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs uppercase text-[var(--text-muted)]">
                    Time %
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map(([asset, pct]) => (
                  <tr
                    key={asset}
                    className="border-t"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <td className="px-2 py-1.5 text-[var(--text-strong)]">{asset}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-[var(--text-muted)]">
                      {pct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
