import Image from 'next/image';
import { Clock } from 'lucide-react';

import { getContinueReading } from '@/lib/me';
import { formatRelative } from '@/lib/dates';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { DASHBOARD_PLACEHOLDER } from '@/constants/media';

export const dynamic = 'force-dynamic';

export default async function ContinueReading() {
  const items = await getContinueReading(6);

  if (items.length === 0) {
    return (
      <DashboardEmptyState
        icon={<Clock className="h-8 w-8" />}
        title="No recent reading history"
        description="Start exploring content to see it here."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <a
          key={`${it.type}:${it.slug}`}
          href={`/${it.type === 'content' ? 'content' : 'macro'}/${it.slug}`}
          className="card overflow-hidden"
        >
          <div className="relative h-32 w-full bg-muted">
            <Image
              src={it.coverUrl ?? DASHBOARD_PLACEHOLDER}
              alt={it.title}
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              className="object-cover"
            />
          </div>
          <div className="p-4 space-y-1">
            <div className="font-medium line-clamp-2">{it.title}</div>
            <div className="text-xs text-muted-foreground">
              Viewed {formatRelative(it.lastViewedAt)}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

