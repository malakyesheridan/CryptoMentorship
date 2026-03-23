import { Suspense } from 'react'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { requireAuth } from '@/lib/access'
import { getUserMembership } from '@/lib/access'
import {
  getDashboardUser,
  getLatestDailyUpdate,
  getRecentEpisodes,
  getAnnouncements,
} from '@/lib/dashboard-data'
import { WelcomeHeader } from '@/components/dashboard/WelcomeHeader'
import { DailyUpdateHero } from '@/components/dashboard/DailyUpdateHero'
import { RecentEpisodesGrid } from '@/components/dashboard/RecentEpisodesGrid'
import { AnnouncementsList } from '@/components/dashboard/AnnouncementsList'
import RecentCommunity from '@/components/dashboard/RecentCommunity'

export default async function DashboardPage() {
  const sessionUser = await requireAuth()

  const [
    { user, membership },
    dailyUpdate,
    episodes,
    announcements,
  ] = await Promise.all([
    getDashboardUser(sessionUser.id),
    getLatestDailyUpdate(),
    getRecentEpisodes(),
    getAnnouncements(),
  ])

  const membershipInfo = await getUserMembership(sessionUser.id)
  const hasSubscription = membershipInfo?.isActive ?? false

  // Filter out the daily update from episodes to avoid duplicates
  const filteredEpisodes = dailyUpdate
    ? episodes.filter((ep) => ep.slug !== dailyUpdate.slug).slice(0, 3)
    : episodes.slice(0, 3)

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="container mx-auto px-4 py-8 space-y-10">
        {/* Personalized welcome */}
        <WelcomeHeader
          userName={user?.name ?? sessionUser.name ?? null}
          userImage={user?.image ?? sessionUser.image ?? null}
          memberSince={user?.createdAt ?? new Date()}
          tier={membership?.tier ?? null}
          status={membership?.status ?? null}
        />

        {/* Daily Update hero */}
        <DailyUpdateHero
          episode={dailyUpdate}
          hasSubscription={hasSubscription}
        />

        {/* Recent Crypto Compass episodes */}
        <RecentEpisodesGrid
          episodes={filteredEpisodes}
          hasSubscription={hasSubscription}
        />

        {/* Announcements */}
        <AnnouncementsList announcements={announcements} />

        {/* Community highlights */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--text-strong)]">Community</h2>
            <Link
              href="/community"
              className="flex items-center gap-1 text-sm text-gold-400 hover:text-gold-300 transition-colors"
            >
              View All
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <Suspense
            fallback={
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-[#2a2520] rounded-xl p-4 animate-pulse">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-[#1a1815] shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 bg-[#1a1815] rounded" />
                        <div className="h-4 w-full bg-[#1a1815] rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            }
          >
            <RecentCommunity />
          </Suspense>
        </section>
      </div>
    </div>
  )
}
