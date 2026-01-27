import { requireActiveSubscription } from '@/lib/access'

export default async function CommunityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireActiveSubscription()
  return <>{children}</>
}
