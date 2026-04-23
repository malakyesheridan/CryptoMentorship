import type { DhrsSystem } from "@/types/dashboard-snapshot";
import { DhrsCurrentHoldingCard } from "./DhrsCurrentHoldingCard";
import { DhrsStatsGrid } from "./DhrsStatsGrid";
import { DhrsTimeAllocation } from "./DhrsTimeAllocation";
import { DhrsRotationsTable } from "./DhrsRotationsTable";

export function DhrsSection({ data }: { data: DhrsSystem }) {
  return (
    <div className="space-y-6">
      <DhrsCurrentHoldingCard dominant={data.dominant} regime={data.regime} />
      <DhrsStatsGrid stats={data.stats} />
      <div className="grid gap-6 lg:grid-cols-2">
        <DhrsTimeAllocation timeIn={data.time_in} />
        <DhrsRotationsTable rotations={data.recent_rotations} />
      </div>
    </div>
  );
}
