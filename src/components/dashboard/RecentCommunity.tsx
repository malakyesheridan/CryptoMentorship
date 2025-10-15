import { MessageCircle } from 'lucide-react';

import { getRecentCommunity } from '@/lib/me';
import { formatRelative } from '@/lib/dates';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';

export const dynamic = 'force-dynamic';

export default async function RecentCommunity() {
  const items = await getRecentCommunity(8);

  if (items.length === 0) {
    return (
      <DashboardEmptyState
        icon={<MessageCircle className="h-8 w-8" />}
        title="Community activity coming soon"
        description="Join discussions to see the latest posts here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((msg) => {
        const preview = (msg.body ?? '').trim().slice(0, 160);
        return (
          <a
            key={msg.id}
            href={`/community?c=${msg.channel.id}#message-${msg.id}`}
            className="block card p-4 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-sm text-foreground">{msg.channel.name}</span>
              <span>{formatRelative(msg.createdAt)}</span>
            </div>
            <div className="mt-2 text-sm line-clamp-2">
              {preview.length === 160 ? `${preview}…` : preview || '—'}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {msg.author.name ?? 'Member'}
            </div>
          </a>
        );
      })}
    </div>
  );
}

