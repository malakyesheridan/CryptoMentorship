import Image from 'next/image';
import { Sparkles } from 'lucide-react';

import { getForYou } from '@/lib/me';
import { formatDate } from '@/lib/dates';
import { Badge } from '@/components/ui/badge';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { DASHBOARD_PLACEHOLDER } from '@/constants/media';

export const dynamic = 'force-dynamic';

export default async function ForYouGrid() {
  const items = await getForYou(6);

  if (items.length === 0) {
    return (
      <DashboardEmptyState
        icon={<Sparkles className="h-8 w-8" />}
        title="Personalized content coming soon"
        description="Follow tags to get tailored recommendations."
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
          <div className="p-4 space-y-2">
            <div className="font-medium line-clamp-2">{it.title}</div>
            <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
              <span>Published {formatDate(it.publishedAt, 'MMM d, yyyy')}</span>
            </div>
            {it.matchedTags && it.matchedTags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {it.matchedTags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] uppercase tracking-wide">
                    #{tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground">Recommended for you</div>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}

