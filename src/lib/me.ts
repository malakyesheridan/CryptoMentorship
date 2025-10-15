import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-server';
import type {
  ContinueItem,
  SavedItem,
  ForYouItem,
  CommunityItem,
} from '@/types/member';

function now() {
  return new Date();
}

function coerceDate(d: Date | string | null | undefined) {
  return d instanceof Date ? d : d ? new Date(d) : new Date(0);
}

/** Return last 6 items the member viewed (content + episodes). */
export async function getContinueReading(limit = 6): Promise<ContinueItem[]> {
  const user = await requireUser();

  const views = await prisma.viewEvent.findMany({
    where: { 
      userId: user.id,
      // Only show content from the same client
      ...((user as any).clientId ? {
        OR: [
          { user: { clientId: (user as any).clientId } },
          { user: { clientId: null } } // Include global content
        ]
      } : {})
    },
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, limit * 3),
  });

  const seen = new Set<string>();
  const deduped: typeof views = [];
  for (const v of views) {
    const key = `${v.entityType}:${v.entityId}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(v);
    }
    if (deduped.length >= limit * 2) break;
  }

  const contentIds = deduped
    .filter((d) => d.entityType === 'content')
    .map((d) => d.entityId);
  const episodeIds = deduped
    .filter((d) => d.entityType === 'episode')
    .map((d) => d.entityId);

  const [contentRows, episodeRows] = await Promise.all([
    contentIds.length
      ? prisma.content.findMany({
          where: {
            id: { in: contentIds },
            publishedAt: { lte: now() },
          },
          select: { id: true, slug: true, title: true, coverUrl: true, publishedAt: true },
        })
      : Promise.resolve([] as Array<{ id: string; slug: string; title: string; coverUrl: string | null; publishedAt: Date | null }>),
    episodeIds.length
      ? prisma.episode.findMany({
          where: {
            id: { in: episodeIds },
            publishedAt: { lte: now() },
          },
          select: { id: true, slug: true, title: true, coverUrl: true },
        })
      : Promise.resolve([] as Array<{ id: string; slug: string; title: string; coverUrl: string | null }>),
  ]);

  const byIdContent = new Map(contentRows.map((r) => [r.id, r]));
  const byIdEpisode = new Map(episodeRows.map((r) => [r.id, r]));

  const items: ContinueItem[] = deduped
    .map((v) => {
      if (v.entityType === 'content') {
        const row = byIdContent.get(v.entityId);
        if (!row) return null;
        return {
          type: 'content',
          slug: row.slug,
          title: row.title,
          coverUrl: row.coverUrl,
          lastViewedAt: coerceDate(v.createdAt),
        } satisfies ContinueItem;
      }
      const row = byIdEpisode.get(v.entityId);
      if (!row) return null;
      return {
        type: 'episode',
        slug: row.slug,
        title: row.title,
        coverUrl: row.coverUrl,
        lastViewedAt: coerceDate(v.createdAt),
      } satisfies ContinueItem;
    })
    .filter(Boolean) as ContinueItem[];

  return items.slice(0, limit);
}

/** Return last 6 bookmarks across content + episodes. */
export async function getSaved(limit = 6): Promise<SavedItem[]> {
  const user = await requireUser();
  const rows = await prisma.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: limit * 2,
  });

  const contentIds = rows.filter((r) => r.contentId).map((r) => r.contentId!);
  const episodeIds = rows.filter((r) => r.episodeId).map((r) => r.episodeId!);

  const [contents, episodes] = await Promise.all([
    contentIds.length
      ? prisma.content.findMany({
          where: {
            id: { in: contentIds },
            publishedAt: { lte: now() },
          },
          select: { id: true, slug: true, title: true, coverUrl: true },
        })
      : Promise.resolve([] as Array<{ id: string; slug: string; title: string; coverUrl: string | null }>),
    episodeIds.length
      ? prisma.episode.findMany({
          where: {
            id: { in: episodeIds },
            publishedAt: { lte: now() },
          },
          select: { id: true, slug: true, title: true, coverUrl: true },
        })
      : Promise.resolve([] as Array<{ id: string; slug: string; title: string; coverUrl: string | null }>),
  ]);

  const cById = new Map(contents.map((c) => [c.id, c]));
  const eById = new Map(episodes.map((e) => [e.id, e]));

  const items: SavedItem[] = rows
    .map((r) => {
      if (r.contentId) {
        const c = cById.get(r.contentId);
        if (!c) return null;
        return {
          type: 'content',
          slug: c.slug,
          title: c.title,
          coverUrl: c.coverUrl,
          savedAt: coerceDate(r.createdAt),
        } satisfies SavedItem;
      }
      if (r.episodeId) {
        const e = eById.get(r.episodeId);
        if (!e) return null;
        return {
          type: 'episode',
          slug: e.slug,
          title: e.title,
          coverUrl: e.coverUrl,
          savedAt: coerceDate(r.createdAt),
        } satisfies SavedItem;
      }
      return null;
    })
    .filter(Boolean) as SavedItem[];

  return items.slice(0, limit);
}

/** Return up to 6 recommended items based on followed tags. Falls back to recent. */
export async function getForYou(limit = 6): Promise<ForYouItem[]> {
  const user = await requireUser();
  const interests = await prisma.userInterest.findMany({
    where: { userId: user.id },
    select: { tag: true },
  });
  const tags = interests.map((i) => i.tag);

  if (tags.length === 0) {
    const [contents, episodes] = await Promise.all([
      prisma.content.findMany({
        where: { publishedAt: { lte: now() } },
        orderBy: { publishedAt: 'desc' },
        take: limit,
        select: { slug: true, title: true, coverUrl: true, publishedAt: true },
      }),
      prisma.episode.findMany({
        where: { publishedAt: { lte: now() } },
        orderBy: { publishedAt: 'desc' },
        take: Math.max(0, limit - 3),
        select: { slug: true, title: true, coverUrl: true, publishedAt: true },
      }),
    ]);
    return [
      ...contents.map((c) => ({
        type: 'content' as const,
        slug: c.slug,
        title: c.title,
        coverUrl: c.coverUrl,
        publishedAt: coerceDate(c.publishedAt),
      })),
      ...episodes.map((e) => ({
        type: 'episode' as const,
        slug: e.slug,
        title: e.title,
        coverUrl: e.coverUrl,
        publishedAt: coerceDate(e.publishedAt),
      })),
    ].slice(0, limit);
  }

  const tagFilters = tags.map((t) => ({ tags: { contains: t } }));

  const [contents, episodes] = await Promise.all([
    prisma.content.findMany({
      where: {
        publishedAt: { lte: now() },
        OR: tagFilters,
      },
      orderBy: { publishedAt: 'desc' },
      take: limit * 2,
      select: { slug: true, title: true, coverUrl: true, publishedAt: true, tags: true },
    }),
    prisma.episode.findMany({
      where: {
        publishedAt: { lte: now() },
      },
      orderBy: { publishedAt: 'desc' },
      take: limit * 2,
      select: { slug: true, title: true, coverUrl: true, publishedAt: true },
    }),
  ]);

  const mapItem = (type: 'content' | 'episode') =>
    (x: { slug: string; title: string; coverUrl: string | null; publishedAt: Date | null; tags?: any }): ForYouItem => ({
      type,
      slug: x.slug,
      title: x.title,
      coverUrl: x.coverUrl,
      publishedAt: coerceDate(x.publishedAt),
      matchedTags: x.tags ? (
        Array.isArray(x.tags)
          ? (x.tags as string[]).filter((t) => tags.includes(t))
          : typeof x.tags === 'string'
            ? tags.filter((t) => x.tags.includes(t))
            : []
      ) : [],
    });

  const merged = [
    ...contents.map(mapItem('content')),
    ...episodes.map(mapItem('episode')),
  ].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

  const seen = new Set<string>();
  const result: ForYouItem[] = [];
  for (const m of merged) {
    const key = `${m.type}:${m.slug}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(m);
    }
    if (result.length >= limit) break;
  }
  return result;
}

/** Latest community messages across channels (or scoped to user's channels if modeled). */
export async function getRecentCommunity(limit = 8): Promise<CommunityItem[]> {
  await requireUser();
  const rows = await prisma.message.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      channel: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, image: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    body: r.body ?? '',
    preview: (r.body ?? '').trim().slice(0, 160),
    createdAt: coerceDate(r.createdAt),
    channel: r.channel,
    author: {
      id: r.user.id,
      name: r.user.name,
      avatarUrl: r.user.image ?? null,
    },
  }));
}

