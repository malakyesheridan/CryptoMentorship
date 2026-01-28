import { AffiliatePayouts } from '@/components/admin/affiliates/AffiliatePayouts'
import { requireRole } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export default async function AffiliatePayoutsPage() {
  await requireRole(['admin'])
  return <AffiliatePayouts />
}
