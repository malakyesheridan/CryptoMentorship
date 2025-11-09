'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CreditCard, Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'

interface Subscription {
  id: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  tier: string
}

interface Membership {
  id: string
  tier: string
  status: string
  payments?: Payment[]
}

interface Payment {
  id: string
  amount: number
  currency: string
  status: string
  createdAt: string
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()
  
  useEffect(() => {
    fetchSubscription()
  }, [])
  
  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/stripe/subscription')
      const data = await res.json()
      setSubscription(data.subscription)
      setMembership(data.membership)
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? It will remain active until the end of the billing period.')) {
      return
    }
    
    setIsUpdating(true)
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to cancel subscription')
      }
      
      await fetchSubscription()
    } catch (error) {
      console.error('Cancel subscription error:', error)
      alert(error instanceof Error ? error.message : 'Failed to cancel subscription. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }
  
  const handleReactivate = async () => {
    setIsUpdating(true)
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reactivate' }),
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reactivate subscription')
      }
      
      await fetchSubscription()
    } catch (error) {
      console.error('Reactivate subscription error:', error)
      alert(error instanceof Error ? error.message : 'Failed to reactivate subscription. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    )
  }
  
  if (!subscription) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Subscription Management</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">You don't have an active subscription.</p>
              <Button onClick={() => router.push('/subscribe')}>
                Subscribe Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Subscription Management</h1>
      
      {/* Current Subscription */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">Tier: {subscription.tier}</p>
                <p className="text-sm text-slate-600 mt-1">
                  Status:{' '}
                  <Badge className={subscription.status === 'active' ? 'bg-green-100 text-green-800' : ''}>
                    {subscription.status}
                  </Badge>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Calendar className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-600">Current Period</p>
                <p className="font-medium">
                  {format(new Date(subscription.currentPeriodStart), 'MMM d, yyyy')} -{' '}
                  {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            
            {subscription.cancelAtPeriodEnd && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  Your subscription will cancel at the end of the billing period ({format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}).
                </p>
              </div>
            )}
            
            {!subscription.cancelAtPeriodEnd && subscription.status === 'active' && (
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-800">
                  Your subscription is active and will renew automatically.
                </p>
              </div>
            )}
            
            <div className="flex gap-2 pt-2">
              {subscription.cancelAtPeriodEnd ? (
                <Button onClick={handleReactivate} disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Reactivate Subscription'
                  )}
                </Button>
              ) : (
                <Button variant="destructive" onClick={handleCancel} disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Cancel Subscription'
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Billing History */}
      {membership?.payments && membership.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {membership.payments.map((payment: Payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                  <div>
                    <p className="font-medium">
                      ${payment.amount.toFixed(2)} {payment.currency.toUpperCase()}
                    </p>
                    <p className="text-sm text-slate-600">
                      {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge
                    variant={
                      payment.status === 'succeeded'
                        ? 'default'
                        : payment.status === 'failed'
                        ? 'destructive'
                        : 'outline'
                    }
                  >
                    {payment.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

