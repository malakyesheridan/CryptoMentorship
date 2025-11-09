'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { SectionHeader } from '@/components/SectionHeader'
import { Badge } from '@/components/ui/badge'
import { User, Mail, Shield, Calendar, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { NotificationPreferences } from '@/components/NotificationPreferences'
import { formatDate } from '@/lib/dates'

interface AccountData {
  user: {
    id: string
    name: string | null
    email: string
    emailVerified: Date | null
    image: string | null
    role: string
    createdAt: Date
    lastLoginAt: Date | null
    loginCount: number
    isActive: boolean
    profileCompleted: boolean
    onboardingCompleted: boolean
  }
  membership: {
    id: string
    tier: string
    status: string
    createdAt: Date
    updatedAt: Date
    currentPeriodStart: Date | null
    currentPeriodEnd: Date | null
    cancelAtPeriodEnd: boolean
    stripeCustomerId: string | null
    stripeSubscriptionId: string | null
  } | null
}

export default function AccountPage() {
  const { data: session } = useSession()
  const [accountData, setAccountData] = useState<AccountData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAccountData() {
      try {
        const res = await fetch('/api/me/account')
        if (!res.ok) {
          throw new Error('Failed to fetch account data')
        }
        const data = await res.json()
        setAccountData(data)
      } catch (err) {
        console.error('Error fetching account data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load account data')
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user?.id) {
      fetchAccountData()
    }
  }, [session?.user?.id])

  // Format tier name for display
  const getTierDisplayName = (tier: string) => {
    const tierNames: { [key: string]: string } = {
      'T1': 'T1 Basic',
      'T2': 'T2 Premium',
      'T3': 'T3 Elite',
    }
    return tierNames[tier] || tier
  }

  // Format status badge variant
  const getStatusVariant = (status: string) => {
    if (status === 'active') return 'default'
    if (status === 'trial') return 'preview'
    return 'destructive'
  }

  // Get member since date (from membership createdAt or user createdAt)
  const getMemberSinceDate = () => {
    if (accountData?.membership?.createdAt) {
      return formatDate(accountData.membership.createdAt, 'MMMM yyyy')
    }
    if (accountData?.user?.createdAt) {
      return formatDate(accountData.user.createdAt, 'MMMM yyyy')
    }
    return 'Unknown'
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
        <p className="ml-3 text-slate-600">Loading account information...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-red-600">
        <XCircle className="h-12 w-12 mb-4" />
        <p className="text-lg font-semibold">{error}</p>
      </div>
    )
  }

  const user = accountData?.user || session?.user
  const membership = accountData?.membership

  return (
    <div className="space-y-8">
      <SectionHeader 
        title="Account Settings" 
        subtitle="Manage your profile and membership information"
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Information */}
        <div className="card p-6">
          <h3 className="heading-2 text-xl mb-6">Profile Information</h3>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Name</p>
                <p className="font-medium text-slate-800">{user?.name || 'Not provided'}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-slate-400" />
              <div className="flex-1">
                <p className="text-sm text-slate-500">Email</p>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-800">{user?.email || 'Not provided'}</p>
                  {accountData?.user?.emailVerified && (
                    <Badge variant="default" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Role</p>
                <Badge variant={user?.role === 'admin' ? 'preview' : 'default'}>
                  {user?.role || 'guest'}
                </Badge>
              </div>
            </div>

            {accountData?.user && (
              <>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Account Created</p>
                    <p className="font-medium text-slate-800">
                      {formatDate(accountData.user.createdAt, 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>

                {accountData.user.lastLoginAt && (
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Last Login</p>
                      <p className="font-medium text-slate-800">
                        {formatDate(accountData.user.lastLoginAt, 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Membership Information */}
        <div className="card p-6">
          <h3 className="heading-2 text-xl mb-6">Membership</h3>
          
          {membership ? (
            <>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Tier</p>
                    <Badge variant="preview">{getTierDisplayName(membership.tier)}</Badge>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Status</p>
                    <Badge variant={getStatusVariant(membership.status)}>
                      {membership.status.charAt(0).toUpperCase() + membership.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Member Since</p>
                    <p className="font-medium text-slate-800">{getMemberSinceDate()}</p>
                  </div>
                </div>

                {membership.currentPeriodEnd && (
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Current Period Ends</p>
                      <p className="font-medium text-slate-800">
                        {formatDate(membership.currentPeriodEnd, 'MMMM d, yyyy')}
                        {membership.cancelAtPeriodEnd && (
                          <span className="ml-2 text-orange-600 text-xs">(Cancels at period end)</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 p-4 bg-gold-50 rounded-lg border border-gold-200">
                <h4 className="font-semibold text-slate-800 mb-2">Membership Benefits</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Access to all research reports</li>
                  <li>• Weekly Crypto Compass episodes</li>
                  <li>• Portfolio positions and model portfolio</li>
                  <li>• Community access and support</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-600 mb-4">No active membership</p>
              <a href="/subscribe" className="text-gold-600 hover:text-gold-700 font-medium">
                View subscription plans →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Notification Preferences */}
      <div>
        <h2 className="heading-2 text-2xl mb-6">Notification Preferences</h2>
        <NotificationPreferences />
      </div>
    </div>
  )
}
