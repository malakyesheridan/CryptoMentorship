import { AffiliateDetail } from '@/components/admin/affiliates/AffiliateDetail'
import { requireRole } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { id: string }
}

export default async function AffiliateDetailPage({ params }: PageProps) {
  await requireRole(['admin'])
  return <AffiliateDetail affiliateId={params.id} />
}
