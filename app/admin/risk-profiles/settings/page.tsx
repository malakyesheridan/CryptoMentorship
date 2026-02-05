import { requireRole } from '@/lib/auth-server'
import { AdminBackLink } from '@/components/admin/AdminBackLink'
import { RiskOnboardingConfigEditor } from '@/components/admin/risk-onboarding/RiskOnboardingConfigEditor'

export const dynamic = 'force-dynamic'

export default async function RiskOnboardingSettingsPage() {
  await requireRole(['admin'])
  return (
    <div className="space-y-8">
      <AdminBackLink href="/admin/risk-profiles" label="Back to Risk Profiles" />
      <RiskOnboardingConfigEditor />
    </div>
  )
}
