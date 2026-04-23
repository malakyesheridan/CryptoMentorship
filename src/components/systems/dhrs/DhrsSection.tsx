import type { DhrsSystem } from "@/types/dashboard-snapshot";
import { DhrsSignalHero } from "./DhrsSignalHero";
import { DhrsStatsGrid } from "./DhrsStatsGrid";
import { DhrsTimeAllocation } from "./DhrsTimeAllocation";
import { DhrsRotationsTable } from "./DhrsRotationsTable";

export function DhrsSection({ data }: { data: DhrsSystem }) {
  return (
    <div className="space-y-6">
      <DhrsSignalHero dominant={data.dominant} regime={data.regime} stats={data.stats} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <DhrsStatsGrid stats={data.stats} />
        </div>
        <div className="lg:col-span-3">
          <DhrsTimeAllocation timeIn={data.time_in} />
        </div>
      </div>
      <DhrsRotationsTable rotations={data.recent_rotations} />
    </div>
  );
}
