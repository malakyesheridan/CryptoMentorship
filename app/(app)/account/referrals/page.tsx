'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { SectionHeader } from '@/components/SectionHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  DollarSign, 
  Copy, 
  CheckCircle, 
  Clock, 
  Loader2,
  Share2,
  ExternalLink
} from 'lucide-react'
import { format } from 'date-fns'

interface ReferralData {
  referralCode: string
  affiliateLink: string
  shortLink: string
  stats: {
    totalReferrals: number
    completedReferrals: number
    pendingReferrals: number
    totalCommissions: number
    pendingCommissions: number
    paidCommissions: number
  }
  recentReferrals: Array<{
    id: string
    referredUserEmail: string | null
    referredUserName: string | null
    referredUserImage: string | null
    referredUserCreatedAt: string | null
    status: string
    completedAt: string | null
    createdAt: string
  }>
}

interface Commission {
  id: string
  amount: number
  currency: string
  status: string
  paymentAmount: number
  paymentDate: string
  paidAt: string | null
  createdAt: string
}

export default function ReferralsPage() {
  const { data: session } = useSession()
  const [referralData, setReferralData] = useState<ReferralData | null>(null)
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCommissions, setIsLoadingCommissions] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user) {
      fetchReferralData()
      fetchCommissions()
    }
  }, [session])

  const fetchReferralData = async () => {
    try {
      const res = await fetch('/api/referrals')
      if (!res.ok) {
        throw new Error('Failed to fetch referral data')
      }
      const data = await res.json()
      setReferralData(data)
    } catch (err) {
      console.error('Failed to fetch referral data:', err)
      setError('Failed to load referral data')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCommissions = async () => {
    setIsLoadingCommissions(true)
    try {
      const res = await fetch('/api/referrals/commissions?limit=10')
      if (!res.ok) {
        throw new Error('Failed to fetch commissions')
      }
      const data = await res.json()
      setCommissions(data.commissions || [])
    } catch (err) {
      console.error('Failed to fetch commissions:', err)
    } finally {
      setIsLoadingCommissions(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
        <p className="ml-3 text-slate-600">Loading referral data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-red-600">
        <p className="text-lg font-semibold">{error}</p>
        <Button onClick={fetchReferralData} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  if (!referralData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-slate-600">No referral data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <SectionHeader 
        title="Referral Program" 
        subtitle="Share your link and earn 15% commission on referrals"
      />

      {/* Affiliate Link Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Affiliate Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Short Link (Preferred) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Short Link (Recommended)</label>
              <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-lg border">
                <code className="flex-1 text-sm break-all">{referralData.shortLink}</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(referralData.shortLink)}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const link = referralData.shortLink
                    if (navigator.share) {
                      navigator.share({
                        title: 'Join me on CryptoMentorship',
                        text: 'Check out this amazing platform!',
                        url: link,
                      }).catch(() => copyToClipboard(link))
                    } else {
                      copyToClipboard(link)
                    }
                  }}
                  className="flex-shrink-0"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
            
            {/* Full Link (Alternative) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Full Link</label>
              <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-lg border">
                <code className="flex-1 text-sm break-all">{referralData.affiliateLink}</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(referralData.affiliateLink)}
                  className="flex-shrink-0"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>
            
            <p className="text-sm text-slate-600">
              Share this link with others. When they sign up and make a payment, you&apos;ll earn 15% commission!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Referrals</p>
                <p className="text-3xl font-bold mt-2">{referralData.stats.totalReferrals}</p>
              </div>
              <Users className="h-8 w-8 text-gold-500" />
            </div>
            <div className="mt-4 flex gap-2 text-sm">
              <Badge variant="outline">{referralData.stats.completedReferrals} completed</Badge>
              <Badge variant="outline">{referralData.stats.pendingReferrals} pending</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Commissions</p>
                <p className="text-3xl font-bold mt-2">
                  ${referralData.stats.totalCommissions.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
            <div className="mt-4 flex gap-2 text-sm">
              <Badge variant="outline" className="text-yellow-600">
                ${referralData.stats.pendingCommissions.toFixed(2)} pending
              </Badge>
              <Badge variant="outline" className="text-green-600">
                ${referralData.stats.paidCommissions.toFixed(2)} paid
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Commission Rate</p>
                <p className="text-3xl font-bold mt-2">15%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-sm text-slate-600 mt-4">
              Earn 15% on every payment from your referrals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Referrals */}
      {referralData.recentReferrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referralData.recentReferrals.map((referral) => {
                const displayName = referral.referredUserName || referral.referredUserEmail || 'Pending signup'
                const signupDate = referral.referredUserCreatedAt 
                  ? format(new Date(referral.referredUserCreatedAt), 'MMM d, yyyy')
                  : null
                const referralDate = format(new Date(referral.createdAt), 'MMM d, yyyy')
                
                return (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {referral.referredUserImage ? (
                        <img
                          src={referral.referredUserImage}
                          alt={displayName}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : referral.referredUserName ? (
                        <div className="h-10 w-10 rounded-full bg-gold-500 flex items-center justify-center text-white font-semibold">
                          {referral.referredUserName.charAt(0).toUpperCase()}
                        </div>
                      ) : null}
                      <div className="flex-1">
                        <p className="font-medium">
                          {displayName}
                        </p>
                        <div className="flex gap-2 text-sm text-slate-600">
                          {signupDate && (
                            <span>Signed up {signupDate}</span>
                          )}
                          {!signupDate && (
                            <span>Referred {referralDate}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        referral.status === 'completed'
                          ? 'default'
                          : referral.status === 'pending'
                          ? 'outline'
                          : 'secondary'
                      }
                    >
                      {referral.status === 'completed' && referral.completedAt && (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      {referral.status}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commission History */}
      <Card>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingCommissions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : commissions.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              <DollarSign className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-semibold mb-2">No commissions yet</p>
              <p className="text-sm max-w-md mx-auto mb-4">
                Commissions will appear here after your referrals complete signup and make their first payment.
              </p>
              <div className="mt-6 p-4 bg-slate-50 rounded-lg max-w-md mx-auto text-left">
                <p className="text-sm font-medium mb-2">How it works:</p>
                <ul className="text-sm space-y-1 text-slate-600">
                  <li>• Share your referral link with others</li>
                  <li>• When they sign up using your link, they become your referral</li>
                  <li>• You earn 15% commission on every payment they make</li>
                  <li>• Commissions appear here once payments are processed</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {commissions.map((commission) => (
                <div
                  key={commission.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                >
                  <div>
                    <p className="font-semibold">
                      ${commission.amount.toFixed(2)} {commission.currency.toUpperCase()}
                    </p>
                    <p className="text-sm text-slate-600">
                      From payment of ${commission.paymentAmount.toFixed(2)} on{' '}
                      {format(new Date(commission.paymentDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        commission.status === 'paid'
                          ? 'default'
                          : commission.status === 'pending'
                          ? 'outline'
                          : 'secondary'
                      }
                    >
                      {commission.status === 'paid' && (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      {commission.status === 'pending' && (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      {commission.status}
                    </Badge>
                    {commission.paidAt && (
                      <p className="text-xs text-slate-500 mt-1">
                        Paid {format(new Date(commission.paidAt), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/api/referrals/commissions'}
                  className="w-full"
                >
                  View All Commissions
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

