import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/SectionHeader'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target,
  Edit,
  Trash2,
  ArrowLeft,
  Calendar,
  Clock
} from 'lucide-react'
import Link from 'next/link'

// Force dynamic rendering for admin pages (auth-gated)
export const dynamic = 'force-dynamic'

interface SignalDetailPageProps {
  params: {
    signalId: string
  }
}

async function getSignal(signalId: string) {
  const signal = await prisma.signalTrade.findUnique({
    where: { id: signalId }
  })

  return signal
}

export default async function SignalDetailPage({ params }: SignalDetailPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/admin')
  }

  const signal = await getSignal(params.signalId)

  if (!signal) {
    redirect('/admin/signals')
  }

  const isLong = signal.direction === 'LONG'
  const isClosed = !!signal.exitPrice

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/admin/signals">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Signals
            </Button>
          </Link>
          
          <SectionHeader
            title={`${signal.symbol} ${signal.direction}`}
            subtitle="Signal Details"
            actions={
              <div className="flex gap-2">
                <Link href={`/admin/signals/${signal.id}/edit`}>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Signal Info */}
            <Card>
              <CardHeader>
                <CardTitle>Signal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Symbol</h4>
                    <p className="text-slate-600">{signal.symbol}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Direction</h4>
                    <Badge variant={isLong ? 'default' : 'destructive'}>
                      {isLong ? (
                        <>
                          <TrendingUp className="h-3 w-3 mr-1" />
                          LONG
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-3 w-3 mr-1" />
                          SHORT
                        </>
                      )}
                    </Badge>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Entry Price</h4>
                    <p className="text-slate-600">${signal.entryPrice.toString()}</p>
                  </div>
                  
                  
                  {signal.stopLoss && (
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Stop Loss</h4>
                      <p className="text-slate-600">${signal.stopLoss.toString()}</p>
                    </div>
                  )}
                  
                  {signal.takeProfit && (
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Take Profit</h4>
                      <p className="text-slate-600">${signal.takeProfit.toString()}</p>
                    </div>
                  )}
                  
                  {signal.riskPct && (
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Risk %</h4>
                      <p className="text-slate-600">{signal.riskPct.toString()}%</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={isClosed ? 'default' : 'secondary'}>
                    {isClosed ? 'Closed' : 'Open'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Exit Information */}
            {isClosed && (
              <Card>
                <CardHeader>
                  <CardTitle>Exit Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Exit Price</h4>
                      <p className="text-slate-600">${signal.exitPrice?.toString()}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Exit Date</h4>
                      <p className="text-slate-600">
                        {signal.exitTime ? new Date(signal.exitTime).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    
                    
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {signal.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">{signal.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>Trade Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Status</span>
                  <Badge variant={isClosed ? 'default' : 'secondary'}>
                    {isClosed ? 'Closed' : 'Open'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Entry Date</span>
                  <span className="text-sm font-medium">
                    {new Date(signal.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                {isClosed && signal.exitTime && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Exit Date</span>
                    <span className="text-sm font-medium">
                      {new Date(signal.exitTime).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/admin/signals/${signal.id}/edit`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Signal
                  </Button>
                </Link>
                
                <Link href={`/signals/${signal.slug}`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Target className="h-4 w-4 mr-2" />
                    View Public
                  </Button>
                </Link>
                
                {!isClosed && (
                  <Button variant="outline" className="w-full justify-start">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Close Position
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
