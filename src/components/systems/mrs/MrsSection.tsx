import type { MrsSystem } from "@/types/dashboard-snapshot";
import { MrsSignalHero } from "./MrsSignalHero";
import { MrsStatsGrid } from "./MrsStatsGrid";
import { MrsTimeAllocation } from "./MrsTimeAllocation";
import { MrsRotationsTable } from "./MrsRotationsTable";

export function MrsSection({ data }: { data: MrsSystem }) {
  return (
    <div className="space-y-6">
      <MrsSignalHero dominant={data.dominant} regime={data.regime} stats={data.stats} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <MrsStatsGrid stats={data.stats} />
        </div>
        <div className="lg:col-span-3">
          <MrsTimeAllocation timeIn={data.time_in} />
        </div>
      </div>
      <MrsRotationsTable rotations={data.recent_rotations} />
    </div>
  );
}
