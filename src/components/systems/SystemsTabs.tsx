"use client";

import { useEffect, useState } from "react";
import type { DashboardSnapshot } from "@/types/dashboard-snapshot";
import { SdcaSection } from "./sdca/SdcaSection";
import { DhrsSection } from "./dhrs/DhrsSection";

type TabKey = "sdca" | "dhrs";

const TABS: { key: TabKey; label: string; subtitle: string }[] = [
  { key: "sdca", label: "SDCA", subtitle: "Bitcoin valuation signal" },
  { key: "dhrs", label: "DHRS", subtitle: "Rotation strategy" },
];

export function SystemsTabs({ snapshot }: { snapshot: DashboardSnapshot }) {
  const [active, setActive] = useState<TabKey>("sdca");

  // Hydrate from URL hash for deep links (#sdca / #dhrs). Legacy #mrss links
  // fall through to the default SDCA tab.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "");
    if (hash === "sdca" || hash === "dhrs") {
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
      </div>
    </div>
  );
}
