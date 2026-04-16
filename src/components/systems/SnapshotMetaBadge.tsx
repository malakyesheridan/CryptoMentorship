import { formatDistanceToNow } from "date-fns";

export function SnapshotMetaBadge({ timestamp }: { timestamp: string }) {
  const date = new Date(timestamp);
  const relative = formatDistanceToNow(date, { addSuffix: true });
  const absolute = date.toLocaleString();

  return (
    <div
      className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--bg-panel)",
      }}
      title={`Snapshot time: ${absolute}`}
    >
      <span className="relative flex h-2 w-2">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ background: "var(--gold-solid)" }}
        />
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{ background: "var(--gold-solid)" }}
        />
      </span>
      <span className="text-[var(--text-muted)]">Updated {relative}</span>
    </div>
  );
}
