import type { SdcaSystem } from "@/types/dashboard-snapshot";
import { SdcaSignalHero } from "./SdcaSignalHero";
import { SdcaIndicatorGrid } from "./SdcaIndicatorGrid";
import { SdcaChart } from "./SdcaChart";
import { SdcaPerformanceTable } from "./SdcaPerformanceTable";

export function SdcaSection({ data }: { data: SdcaSystem }) {
  return (
    <div className="space-y-6">
      <SdcaSignalHero data={data} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <SdcaIndicatorGrid indicators={data.indicators} />
        </div>
        <div className="lg:col-span-3">
          <SdcaChart
            chart={data.chart}
            buyThreshold={data.buy_threshold}
            sellThreshold={data.sell_threshold}
          />
        </div>
      </div>
      <SdcaPerformanceTable performance={data.performance} />
    </div>
  );
}
