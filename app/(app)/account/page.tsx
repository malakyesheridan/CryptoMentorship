'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { SectionHeader } from '@/components/SectionHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Mail, Shield, Calendar, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { NotificationPreferences } from '@/components/NotificationPreferences'
import { formatDate } from '@/lib/dates'
import { toast } from 'sonner'

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
  const { data: session, update: updateSession } = useSession()
  const [accountData, setAccountData] = useState<AccountData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [isNameDirty, setIsNameDirty] = useState(false)

  useEffect(() => {
    async function fetchAccountData() {
      try {
        const res = await fetch('/api/me/account')
        if (!res.ok) {
          throw new Error('Failed to fetch account data')
        }
        const data = await res.json()
        setAccountData(data)
        setDisplayName(data?.user?.name || '')
        setIsNameDirty(false)
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

  const handleNameSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNameError(null)

    const trimmedName = displayName.trim()
    if (!trimmedName) {
      setNameError('Name is required.')
      return
    }
    if (trimmedName.length > 80) {
      setNameError('Name must be 80 characters or less.')
      return
    }

    const currentName = accountData?.user?.name || session?.user?.name || ''
    if (trimmedName === currentName) {
      setIsNameDirty(false)
      return
    }

    setIsSavingName(true)
    try {
      const res = await fetch('/api/me/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update name')
      }

      setAccountData((prev) =>
        prev ? { ...prev, user: { ...prev.user, name: trimmedName } } : prev
      )
      await updateSession({ name: trimmedName })
      setIsNameDirty(false)
      toast.success('Name updated successfully.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update name'
      setNameError(message)
      toast.error(message)
    } finally {
      setIsSavingName(false)
    }
  }

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
            <div className="flex items-start space-x-3">
              <User className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Name</p>
                <form onSubmit={handleNameSave} className="mt-2 space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={displayName}
                      onChange={(event) => {
                        setDisplayName(event.target.value)
                        setIsNameDirty(true)
                        if (nameError) {
                          setNameError(null)
                        }
                      }}
                      maxLength={80}
                      placeholder="Enter your name"
                      disabled={isSavingName}
                    />
                    <Button type="submit" disabled={isSavingName || !isNameDirty}>
                      {isSavingName ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </div>
                  {nameError && (
                    <p className="text-sm text-red-600">{nameError}</p>
                  )}
                </form>
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

        {/* Quick Links */}
        <div className="card p-6">
          <h3 className="heading-2 text-xl mb-6">Quick Links</h3>
          <div className="space-y-3">
            <Link
              href="/account/subscription"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors"
            >
              <span className="font-medium">Subscription Management</span>
              <span className="text-slate-400">→</span>
            </Link>
            <Link
              href="/account/referrals"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors"
            >
              <span className="font-medium">Referral Program</span>
              <span className="text-slate-400">→</span>
            </Link>
          </div>
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
