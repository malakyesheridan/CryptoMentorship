import { AffiliatesOverview } from '@/components/admin/affiliates/AffiliatesOverview'
import { requireRole } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export default async function AffiliatesPage() {
  await requireRole(['admin'])
  return <AffiliatesOverview />
}
