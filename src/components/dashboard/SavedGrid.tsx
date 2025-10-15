import Image from 'next/image';
import { Bookmark } from 'lucide-react';

import { getSaved } from '@/lib/me';
import { formatRelative } from '@/lib/dates';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { DASHBOARD_PLACEHOLDER } from '@/constants/media';

export const dynamic = 'force-dynamic';

export default async function SavedGrid() {
  const items = await getSaved(6);

  if (items.length === 0) {
    return (
      <DashboardEmptyState
        icon={<Bookmark className="h-8 w-8" />}
        title="No saved items yet"
        description="Bookmark content to save it for later."
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
            <div className="text-xs text-muted-foreground">Saved {formatRelative(it.savedAt)}</div>
          </div>
        </a>
      ))}
    </div>
  );
}

