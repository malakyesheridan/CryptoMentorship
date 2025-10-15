export type ContinueItem = {
  type: 'content' | 'episode';
  slug: string;
  title: string;
  coverUrl?: string | null;
  lastViewedAt: Date;
};

export type SavedItem = {
  type: 'content' | 'episode';
  slug: string;
  title: string;
  coverUrl?: string | null;
  savedAt: Date;
};

export type ForYouItem = {
  type: 'content' | 'episode';
  slug: string;
  title: string;
  coverUrl?: string | null;
  publishedAt: Date;
  matchedTags?: string[];
};

export type CommunityItem = {
  id: string;
  body: string;
  createdAt: Date;
  preview: string;
  channel: { id: string; name: string };
  author: { id: string; name: string | null; avatarUrl?: string | null };
};

