import { requireAuth } from '@/lib/access'
import { getUserMembership } from '@/lib/access'
import {
  getDashboardUser,
  getLatestDailyUpdate,
  getLatestSignals,
  getAnnouncements,
} from '@/lib/dashboard-data'
import { WelcomeHeader } from '@/components/dashboard/WelcomeHeader'
import { DailyUpdateHero } from '@/components/dashboard/DailyUpdateHero'
import { DailySignalSnapshot } from '@/components/dashboard/DailySignalSnapshot'
import { AnnouncementsList } from '@/components/dashboard/AnnouncementsList'

export default async function DashboardPage() {
  const sessionUser = await requireAuth()

  const [
    { user, membership },
    latestEpisode,
    signals,
    announcements,
  ] = await Promise.all([
    getDashboardUser(sessionUser.id),
    getLatestDailyUpdate(),
    getLatestSignals(),
    getAnnouncements(),
  ])

  const membershipInfo = await getUserMembership(sessionUser.id)
  const hasSubscription = membershipInfo?.isActive ?? false

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

        {/* Latest Crypto Compass episode hero */}
        <DailyUpdateHero
          episode={latestEpisode}
          hasSubscription={hasSubscription}
        />

        {/* Portfolio daily signal snapshot */}
        <DailySignalSnapshot
          signals={signals}
          hasSubscription={hasSubscription}
          userTier={membership?.tier ?? null}
        />

        {/* Announcements */}
        <AnnouncementsList announcements={announcements} />
      </div>
    </div>
  )
}
