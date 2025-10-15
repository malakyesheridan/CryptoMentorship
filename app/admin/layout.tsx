import { requireRole } from '@/lib/auth-server'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Require admin or editor role
  await requireRole(['admin', 'editor'])

  return (
    <div className="min-h-screen bg-ivory">
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 ml-64">
          <div className="container-main section-padding">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
