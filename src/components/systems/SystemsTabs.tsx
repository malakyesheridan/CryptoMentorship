"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardSnapshot } from "@/types/dashboard-snapshot";
import { brandName } from "@/lib/brand";
import { SdcaSection } from "./sdca/SdcaSection";
import { DhrsSection } from "./dhrs/DhrsSection";
import { MrsSection } from "./mrs/MrsSection";

type TabKey = "sdca" | "mrs" | "mars" | "tars" | "tfars" | "dhrs";

const TABS: { key: TabKey; label: string; subtitle: string }[] = [
  { key: "sdca", label: brandName("sdca"), subtitle: "Bitcoin valuation signal" },
  { key: "mrs", label: brandName("mrs"), subtitle: "3-asset rotation" },
  { key: "mars", label: brandName("mars"), subtitle: "6-asset rotation" },
  { key: "tars", label: brandName("tars"), subtitle: "10-asset rotation" },
  { key: "tfars", label: brandName("tfars"), subtitle: "25-asset rotation" },
  { key: "dhrs", label: brandName("dhrs"), subtitle: "60+ asset rotation" },
];

const TAB_KEYS = new Set<TabKey>(["sdca", "mrs", "mars", "tars", "tfars", "dhrs"]);

export function SystemsTabs({ snapshot }: { snapshot: DashboardSnapshot }) {
  const [active, setActive] = useState<TabKey>("sdca");

  // Hydrate from URL hash for deep links (#sdca / #dhrs / #mrs / #mars / #tars / #tfars).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "") as TabKey;
    if (TAB_KEYS.has(hash)) {
      setActive(hash);
    }
  }, []);

  const handleTab = (key: TabKey) => {
    setActive(key);
    if (typeof window !== "undefined") {
      history.replaceState(null, "", `#${key}`);
    }
  };

  return (
    <div>
      <div
        className="sticky top-0 z-10 -mx-4 mb-6 overflow-x-auto overflow-y-hidden border-b px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        style={{
          borderColor: "var(--border-subtle)",
          background: "color-mix(in srgb, var(--bg-page) 90%, transparent)",
        }}
      >
        <nav className="flex gap-1 sm:gap-2" aria-label="Systems">
          {TABS.map((tab) => {
            const isActive = active === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTab(tab.key)}
                className="group relative whitespace-nowrap px-4 py-3 text-left transition-colors focus-ring"
                aria-current={isActive ? "page" : undefined}
              >
                <div
                  className="text-sm font-semibold tracking-wide"
                  style={{
                    color: isActive
                      ? "var(--text-strong)"
                      : "var(--text-muted)",
                  }}
                >
                  {tab.label}
                </div>
                <div
                  className="text-xs"
                  style={{
                    color: isActive
                      ? "var(--gold-solid)"
                      : "var(--text-muted)",
                  }}
                >
                  {tab.subtitle}
                </div>
                {isActive && (
                  <span
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                    style={{ background: "var(--gold-solid)" }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        {active === "sdca" && <SdcaSection data={snapshot.sdca} />}
        {active === "dhrs" && <DhrsSection data={snapshot.dhrs} />}
        {active === "mrs" && (
          snapshot.mrs ? (
            <MrsSection data={snapshot.mrs} />
          ) : (
            <PendingSection label={brandName("mrs")} />
          )
        )}
        {active === "mars" && (
          snapshot.mars ? (
            <MrsSection data={snapshot.mars} />
          ) : (
            <PendingSection label={brandName("mars")} />
          )
        )}
        {active === "tars" && (
          snapshot.tars ? (
            <MrsSection data={snapshot.tars} />
          ) : (
            <PendingSection label={brandName("tars")} />
          )
        )}
        {active === "tfars" && (
          snapshot.tfars ? (
            <MrsSection data={snapshot.tfars} />
          ) : (
            <PendingSection label={brandName("tfars")} />
          )
        )}
      </div>
    </div>
  );
}

function PendingSection({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="p-10 text-center">
        <div className="heading-md text-[var(--text-strong)]">
          System data connecting…
        </div>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {label} will appear here once the data feed is live.
        </p>
      </CardContent>
    </Card>
  );
}
