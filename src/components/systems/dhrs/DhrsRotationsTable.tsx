"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DhrsRotation } from "@/types/dashboard-snapshot";
import { formatPct, pnlColor } from "@/lib/systems-format";
import { getAssetDisplayLabel } from "@/lib/portfolio-assets";

export function DhrsRotationsTable({
  rotations,
}: {
  rotations: DhrsRotation[];
}) {
  const [filter, setFilter] = useState<string>("ALL");

  const assets = useMemo(() => {
    const s = new Set<string>();
    rotations.forEach((r) => {
      s.add(r.from);
      s.add(r.to);
    });
    return ["ALL", ...Array.from(s).sort()];
  }, [rotations]);

  const filtered = useMemo(() => {
    const base = filter === "ALL"
      ? rotations
      : rotations.filter((r) => r.from === filter || r.to === filter);
    // Latest rotations first. Falls back to original order when dates tie
    // (stable since we copy before sorting).
    return [...base].sort((a, b) => b.date.localeCompare(a.date));
  }, [rotations, filter]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Recent Rotations</CardTitle>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border bg-transparent px-2 py-1 text-xs"
          style={{
            borderColor: "var(--border-subtle)",
            color: "var(--text-strong)",
          }}
        >
          {assets.map((a) => (
            <option key={a} value={a} style={{ background: "var(--bg-panel)" }}>
              {a === "ALL" ? a : getAssetDisplayLabel(a)}
            </option>
          ))}
        </select>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          <table className="min-w-full text-sm">
            <thead
              className="sticky top-0 border-b"
              style={{
                borderColor: "var(--border-subtle)",
                background: "var(--bg-panel)",
              }}
            >
              <tr>
                <th className="px-3 py-2 text-left text-xs uppercase text-[var(--text-muted)]">
                  Date
                </th>
                <th className="px-3 py-2 text-left text-xs uppercase text-[var(--text-muted)]">
                  Rotation
                </th>
                <th className="px-3 py-2 text-right text-xs uppercase text-[var(--text-muted)]">
                  Return
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={`${r.date}-${i}`}
                  className="border-t"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <td className="px-3 py-2 tabular-nums text-[var(--text-muted)]">
                    {r.date}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 text-[var(--text-strong)]">
                      <span>{getAssetDisplayLabel(r.from)}</span>
                      <ArrowRight className="h-3 w-3 text-[var(--text-muted)]" />
                      <span>{getAssetDisplayLabel(r.to)}</span>
                    </span>
                  </td>
                  <td
                    className="px-3 py-2 text-right tabular-nums"
                    style={{ color: pnlColor(r.return_pct) }}
                  >
                    {formatPct(r.return_pct, 2)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-6 text-center text-sm text-[var(--text-muted)]"
                  >
                    No rotations match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
