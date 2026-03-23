import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/dates'

interface WelcomeHeaderProps {
  userName: string | null
  userImage: string | null
  memberSince: Date
  tier: string | null
  status: string | null
}

const tierLabels: Record<string, string> = {
  T1: 'Growth',
  T2: 'Elite',
  T3: 'VIP',
}

export function WelcomeHeader({ userName, userImage, memberSince, tier, status }: WelcomeHeaderProps) {
  const firstName = userName?.split(' ')[0] ?? 'Member'
  const isActive = status === 'active' || status === 'trial'
  const tierLabel = tier && isActive ? tierLabels[tier] ?? tier : 'Free'

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--text-strong)]">
          Welcome back, <span className="text-gold-400">{firstName}</span>
        </h1>
        <div className="flex items-center gap-3">
          <Badge variant={isActive ? 'preview' : 'secondary'}>
            {tierLabel}
          </Badge>
          <span className="text-sm text-[var(--text-muted)]">
            Member since {formatDate(memberSince)}
          </span>
        </div>
      </div>
      {userImage && (
        <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-gold-400/30 shrink-0">
          <Image
            src={userImage}
            alt={userName ?? 'User'}
            fill
            sizes="48px"
            className="object-cover"
          />
        </div>
      )}
    </div>
  )
}
