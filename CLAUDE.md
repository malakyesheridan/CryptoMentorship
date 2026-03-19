# Stewart & Co — Crypto Portal

Full-stack crypto mentorship platform built with Next.js 14 App Router. Members get access to learning tracks, daily portfolio signals, crypto compass episodes, events, and community features.

## Tech Stack

- **Framework**: Next.js 14.2 (App Router), React 18, TypeScript 5.9
- **Database**: PostgreSQL (Neon) via Prisma 5.22
- **Auth**: NextAuth 4 with Prisma adapter
- **Styling**: Tailwind CSS 3.4, dark theme via CSS variables
- **Payments**: Stripe (subscriptions + one-time)
- **Storage**: Vercel Blob
- **Icons**: Lucide React
- **Toasts**: Sonner
- **Charts**: Recharts
- **Email**: Nodemailer

## Commands

```bash
npm run dev          # Dev server on port 5000
npx tsc --noEmit     # Type check (always run after changes)
npm run build        # Production build
npx prisma studio    # DB browser
npx prisma db push   # Push schema changes
```

## Path Aliases

```
@/*            → src/*
@/components/* → src/components/*
@/lib/*        → src/lib/*
@/data/*       → src/data/*
```

## File Structure

```
app/                    # Next.js App Router pages
  (app)/                # Main authenticated app (dashboard, learning, crypto-compass)
  admin/                # Admin panel (has own layout with AdminSidebar)
  api/                  # API routes
src/
  components/
    ui/                 # Primitives: Card, Badge, Button, Input, Dialog
    admin/              # Admin-specific components
    learning/           # Learning hub components
  lib/
    prisma.ts           # Prisma client singleton
    auth.ts / auth-server.ts  # Auth config + server helpers (requireAuth, requireRole)
    audit.ts            # Audit logging
    dates.ts            # formatDate, formatTime, timeago
    db/                 # retry.ts, errors.ts — DB resilience utilities
    strategies/         # Strategy-related queries
  data/                 # Static data files
prisma/
  schema.prisma         # 50+ models (User, Episode, Track, Lesson, etc.)
```

## Styling Conventions

### CSS Variables (dark theme)
```
--bg-page       # Page background
--bg-panel      # Card/panel background
--border-subtle # Borders
--text-strong   # Primary text
--text-muted    # Secondary text
--gold-400      # Gold accent
```

### Color Palette
- Gold accent: `gold-400`, `gold-500`, `gold-600` (Tailwind custom colors)
- Skeleton shimmer: `bg-[#2a2520]` with `animate-pulse`
- Panel backgrounds: `bg-[var(--bg-panel)]`
- Page backgrounds: `bg-[var(--bg-page)]`
- Dark hover states: `hover:bg-[#1a1815]`
- Error red: `#c03030`
- Font: Playfair Display for headings (`font-playfair`)

### Component Patterns
- Use `Card`, `CardHeader`, `CardContent`, `CardTitle` from `@/components/ui/card`
- Use `Badge` from `@/components/ui/badge` for status indicators
- Use `SectionHeader` for page headers with title + subtitle
- Use `EmptyState` for zero-data states with icon + action
- Use `heading-hero`, `heading-2`, `subhead`, `gold` CSS classes for typography

## Performance Patterns (IMPORTANT)

These patterns are established and must be followed for all new pages:

### 1. Loading Skeletons
Every route group needs a `loading.tsx` that shows instantly during navigation:
```tsx
// app/[section]/loading.tsx
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 bg-[#2a2520] rounded" />
      {/* Match the page layout with shimmer bars */}
    </div>
  )
}
```

### 2. Data Caching with unstable_cache
Wrap server-side data fetches in `unstable_cache` with named tags for targeted invalidation:
```tsx
import { unstable_cache } from 'next/cache'

const getCachedData = unstable_cache(
  async () => {
    // Prisma queries here
    return data
  },
  ['cache-key'],
  { revalidate: 60, tags: ['tag-name'] }
)
```
- Use `revalidateTag('tag-name')` in mutation handlers to bust specific caches
- Do NOT use `export const dynamic = 'force-dynamic'` on cached pages
- Keep `force-dynamic` only for pages with search params/filters or user-specific data

### 3. Parallel Queries
Always use `Promise.all()` for independent queries:
```tsx
const [users, stats, logs] = await Promise.all([
  prisma.user.findMany(...),
  prisma.user.count(...),
  getAuditLogs(10),
])
```

### 4. Query Slimming
- Use `select` instead of `include` when you only need specific fields
- Use `_count` instead of loading full relations just to count them
- Never fetch full objects when you only need an ID or existence check
  - Bad: `quiz: true` → Good: `quiz: { select: { id: true } }`
  - Bad: `enrollments: { select: { id: true } }` when only `_count.enrollments` is used

### 5. Client-Side Navigation
Use `useTransition` + `startTransition` for non-blocking `router.refresh()`:
```tsx
const [isPending, startTransition] = useTransition()
startTransition(() => router.refresh())
```

## Admin Panel

- Layout at `app/admin/layout.tsx` handles auth via `requireRole(['admin', 'editor'])` — individual pages do NOT need redundant auth checks
- Sidebar: `src/components/admin/AdminSidebar.tsx` — collapsible groups with localStorage persistence
- Admin pages should use `unstable_cache` (60s TTL) for list/stat pages
- Admin skeleton: `app/admin/loading.tsx` covers all admin page transitions

## Auth Helpers

```tsx
// Server-side auth (use in server components / route handlers)
import { requireAuth } from '@/lib/auth-server'        // Returns user or redirects
import { requireRole } from '@/lib/auth-server'         // Requires specific role(s)
import { requireActiveSubscription } from '@/lib/auth-server'  // Requires paid membership

// Client-side
import { useSession } from 'next-auth/react'
```

## Cache Invalidation Tags

When creating/editing content, call `revalidateTag` with the relevant tag:
- `admin-dashboard` — admin dashboard stats
- `admin-episodes` — episode list
- `admin-signals` — signals list
- `admin-strategies` — strategies list
- `admin-tracks` — learning tracks list
- `track-${slug}` — individual track data
- `lesson-${slug}` — individual lesson data

## Known Issues (DO NOT try to fix)

- `DATABASE_URL is required but not set` errors in dev server logs — local dev has no database configured, this is expected. All DB-dependent pages error on localhost but work on Vercel deployment.
- The dev server runs on port 5000 (not 3000)

## Do's and Don'ts

**DO:**
- Run `npx tsc --noEmit` after every change
- Add `loading.tsx` when creating new route groups
- Use `unstable_cache` for any page that fetches list data
- Parallelize independent queries with `Promise.all`
- Use existing UI components from `@/components/ui/`
- Use CSS variables for colors, not hardcoded values (except `#2a2520` for skeletons)
- Use `formatDate` from `@/lib/dates` for date formatting

**DON'T:**
- Don't add `export const dynamic = 'force-dynamic'` to new pages unless they have search params
- Don't add redundant auth checks in pages under `app/admin/` (layout handles it)
- Don't use `include` when `select` would suffice
- Don't fetch full relations just to count them — use `_count`
- Don't render `AdminSidebar` in admin pages (layout renders it)
- Don't use `RealTimeProgress` or similar client-side components that duplicate server-fetched data
