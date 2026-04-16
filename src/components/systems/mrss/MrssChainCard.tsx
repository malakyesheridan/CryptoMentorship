"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { MrssChain } from "@/types/dashboard-snapshot";
import { formatPct, pnlColor } from "@/lib/systems-format";

export function MrssChainCard({
  label,
  accent,
  chain,
}: {
  label: string;
  accent: string;
  chain: MrssChain;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className="border-t-4 transition-shadow hover:shadow-lg"
      style={{ borderTopColor: accent }}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-semibold text-[var(--text-strong)]">
              {label}
            </div>
            <div
              className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                background: chain.active
                  ? "rgba(34, 197, 94, 0.12)"
                  : "rgba(156, 163, 175, 0.12)",
                color: chain.active ? "var(--success)" : "var(--text-muted)",
              }}
            >
              {chain.active ? "Active" : "Inactive"}
            </div>
          </div>
          <div
            className="text-xl font-bold tabular-nums"
            style={{ color: pnlColor(chain.paper_pnl_pct) }}
          >
            {formatPct(chain.paper_pnl_pct, 2)}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Positions
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {chain.positions.map((p) => (
              <span
                key={p}
                className="rounded-md border px-2 py-0.5 text-xs"
                style={{
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-strong)",
                  background: "var(--bg-panel)",
                }}
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 flex w-full items-center justify-center gap-1 rounded-md border py-1.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)] transition-colors hover:text-[var(--text-strong)]"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {expanded ? "Hide" : "Details"}
          <ChevronDown
            className="h-3 w-3 transition-transform"
            style={{ transform: expanded ? "rotate(180deg)" : "none" }}
          />
        </button>
        {expanded && (
          <div className="mt-3 space-y-1 text-xs text-[var(--text-muted)]">
            <p>
              Chain status: {chain.active ? "Actively rotating" : "Idle"}
            </p>
            <p>Holdings: {chain.positions.length}</p>
            <p className="italic">
              Per-position detail will populate when included in the snapshot.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
