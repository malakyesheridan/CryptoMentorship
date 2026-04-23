import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/dates'

interface WelcomeHeaderProps {
  userName: string | null
  userImage: string | null
  memberSince: Date
  status: string | null
}

function getMembershipLabel(status: string | null): string {
  if (status === 'trial') return 'Trial'
  if (status === 'active') return 'Member'
  return 'Free'
}

export function WelcomeHeader({ userName, userImage, memberSince, status }: WelcomeHeaderProps) {
  const firstName = userName?.split(' ')[0] ?? 'Member'
  const isActive = status === 'active' || status === 'trial'
  const label = getMembershipLabel(status)

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--text-strong)]">
          Welcome back, <span className="text-gold-400">{firstName}</span>
        </h1>
        <div className="flex items-center gap-3">
          <Badge variant={isActive ? 'preview' : 'secondary'}>
            {label}
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
