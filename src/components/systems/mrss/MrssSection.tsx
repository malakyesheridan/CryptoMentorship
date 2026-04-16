import type { MrssSystem } from "@/types/dashboard-snapshot";
import { MrssOverview } from "./MrssOverview";
import { MrssChainCard } from "./MrssChainCard";

const CHAIN_META: Record<
  "eth" | "sol" | "bnb",
  { label: string; accent: string }
> = {
  eth: { label: "Ethereum", accent: "#627eea" },
  sol: { label: "Solana", accent: "#9945ff" },
  bnb: { label: "BNB Chain", accent: "#f3ba2f" },
};

export function MrssSection({ data }: { data: MrssSystem }) {
  return (
    <div className="space-y-6">
      <MrssOverview
        regime={data.btc_regime}
        lastCycle={data.last_cycle}
        totalPnl={data.total_paper_pnl_pct}
      />
      <div className="grid gap-6 md:grid-cols-3">
        {(Object.keys(data.chains) as Array<keyof typeof data.chains>).map(
          (key) => (
            <MrssChainCard
              key={key}
              label={CHAIN_META[key].label}
              accent={CHAIN_META[key].accent}
              chain={data.chains[key]}
            />
          ),
        )}
      </div>
    </div>
  );
}
