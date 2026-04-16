import { Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function DhrsCurrentHoldingCard({
  dominant,
  regime,
}: {
  dominant: string;
  regime: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Currently Holding
            </div>
            <div className="mt-2 text-4xl font-bold tabular-nums text-[var(--text-strong)]">
              {dominant}
            </div>
          </div>
          <div
            className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
            style={{
              borderColor: regime ? "var(--success)" : "var(--border-subtle)",
              background: regime ? "rgba(34, 197, 94, 0.1)" : "var(--bg-panel)",
              color: regime ? "var(--success)" : "var(--text-muted)",
            }}
          >
            <Activity className="h-3 w-3" />
            {regime ? "Regime Active" : "Regime Off"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
