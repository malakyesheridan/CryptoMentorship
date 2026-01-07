import { RoiDashboardAdmin } from '@/components/admin/roi/RoiDashboardAdmin'

export const dynamic = 'force-dynamic'

export default function RoiAdminPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="heading-hero text-4xl mb-2">
          <span>ROI</span> <span className="gold">Dashboard</span>
        </h1>
        <p className="subhead">Manage performance data, benchmarks, and member-facing metrics.</p>
      </div>
      <RoiDashboardAdmin />
    </div>
  )
}
