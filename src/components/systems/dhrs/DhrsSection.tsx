import type { DhrsSystem } from "@/types/dashboard-snapshot";
import { DhrsCurrentHoldingCard } from "./DhrsCurrentHoldingCard";
import { DhrsStatsGrid } from "./DhrsStatsGrid";
import { DhrsTimeAllocation } from "./DhrsTimeAllocation";
import { DhrsRotationsTable } from "./DhrsRotationsTable";
import { DhrsPaperTradeCard } from "./DhrsPaperTradeCard";

export function DhrsSection({ data }: { data: DhrsSystem }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <DhrsCurrentHoldingCard dominant={data.dominant} regime={data.regime} />
        <DhrsPaperTradeCard paper={data.paper} />
      </div>
      <DhrsStatsGrid stats={data.stats} />
      <div className="grid gap-6 lg:grid-cols-2">
        <DhrsTimeAllocation timeIn={data.time_in} />
        <DhrsRotationsTable rotations={data.recent_rotations} />
      </div>
    </div>
  );
}
