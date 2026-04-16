import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-server";
import { getUserMembership } from "@/lib/access";
import { getDashboardSnapshot } from "@/lib/dashboard-snapshot";
import { SystemsTabs } from "@/components/systems/SystemsTabs";
import { SnapshotMetaBadge } from "@/components/systems/SnapshotMetaBadge";

export const metadata = {
  title: "Systems — Stewart & Co",
  description: "Live performance dashboard for SDCA, DHRS, and MRSS systems.",
};

export default async function SystemsPage() {
  const user = await requireUser();
  const membership = await getUserMembership(user.id);

  if (!membership || membership.status === "paused") {
    redirect("/subscribe");
  }

  // Let error.tsx handle fetch failures.
  const snapshot = await getDashboardSnapshot();

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="heading-xl text-[var(--text-strong)]">Systems</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Live performance across SDCA, DHRS, and MRSS.
            </p>
          </div>
          <SnapshotMetaBadge timestamp={snapshot.timestamp} />
        </div>

        <SystemsTabs snapshot={snapshot} />
      </div>
    </div>
  );
}
