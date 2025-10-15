import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { TradeTable } from '@/components/signals/TradeTable'
import { Button } from '@/components/ui/button'
import { Plus, Download, Upload } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getSignals() {
  // TODO: Implement actual data fetching from database
  // For now, return mock data
  return [] as any[]
}

export default async function AdminSignalsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || !['editor', 'admin'].includes(session.user.role)) {
    redirect('/login')
  }

  const signals = await getSignals()

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Signals Management</h1>
                  <p className="text-slate-600 mt-2">
                    Manage trading signals and track performance
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Link href="/admin/signals/import">
                    <Button variant="outline" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Import CSV
                    </Button>
                  </Link>
                  <Link href="/admin/signals/new">
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      New Signal
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Signals</p>
                    <p className="text-2xl font-bold text-slate-900">{signals.length}</p>
                  </div>
                  <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-medium">📊</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Open Positions</p>
                    <p className="text-2xl font-bold text-green-600">
                      {signals.filter(s => s.status === 'open').length}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 text-sm font-medium">📈</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Closed Trades</p>
                    <p className="text-2xl font-bold text-slate-600">
                      {signals.filter(s => s.status === 'closed').length}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center">
                    <span className="text-slate-600 text-sm font-medium">📉</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Win Rate</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {signals.length > 0 ? 
                        Math.round((signals.filter(s => s.status === 'closed' && s.rMultiple > 0).length / 
                          signals.filter(s => s.status === 'closed').length) * 100) || 0 : 0}%
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <span className="text-yellow-600 text-sm font-medium">🎯</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Signals Table */}
            <Suspense fallback={<div className="text-center py-8">Loading signals...</div>}>
              <TradeTable 
                trades={signals}
                title="All Signals"
                showFilters={true}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
