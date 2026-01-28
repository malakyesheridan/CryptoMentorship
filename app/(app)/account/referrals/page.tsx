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
  Edit2,
  Save,
  X
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface AffiliateSummary {
  referralCode: string
  affiliateLink: string
  shortLink: string
  stats: {
    totalSignups: number
    qualified: number
    payable: number
    paidTotalCents: number
  }
}

interface ReferralRow {
  id: string
  currency: string
  status: string
  referredName: string | null
  referredEmail: string | null
  signedUpAt: string | null
  payableAt: string | null
  commissionAmountCents: number | null
  paidAt: string | null
}

export default function ReferralsPage() {
  const { data: session } = useSession()
  const [summary, setSummary] = useState<AffiliateSummary | null>(null)
  const [referrals, setReferrals] = useState<ReferralRow[]>([])
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)
  const [isLoadingReferrals, setIsLoadingReferrals] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentSlug, setCurrentSlug] = useState<string | null>(null)
  const [isEditingSlug, setIsEditingSlug] = useState(false)
  const [newSlug, setNewSlug] = useState('')
  const [isSavingSlug, setIsSavingSlug] = useState(false)

  useEffect(() => {
    if (session?.user) {
      fetchSummary()
      fetchReferrals()
      fetchCurrentSlug()
    }
  }, [session])

  const fetchCurrentSlug = async () => {
    try {
      const res = await fetch('/api/referrals/slug')
      if (res.ok) {
        const data = await res.json()
        setCurrentSlug(data.slug)
      }
    } catch (err) {
      console.error('Failed to fetch current slug:', err)
    }
  }

  const handleEditSlug = () => {
    setNewSlug(currentSlug || '')
    setIsEditingSlug(true)
  }

  const handleCancelEdit = () => {
    setIsEditingSlug(false)
    setNewSlug('')
  }

  const handleSaveSlug = async () => {
    if (!newSlug.trim()) {
      toast.error('Slug cannot be empty')
      return
    }

    setIsSavingSlug(true)
    try {
      const res = await fetch('/api/referrals/slug', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: newSlug.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update slug')
      }

      toast.success('Referral slug updated successfully!')
      setCurrentSlug(data.slug)
      setIsEditingSlug(false)
      setNewSlug('')
      fetchSummary()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update slug')
    } finally {
      setIsSavingSlug(false)
    }
  }

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/affiliate/summary')
      if (!res.ok) {
        throw new Error('Failed to fetch affiliate summary')
      }
      const data = await res.json()
      setSummary(data)
    } catch (err) {
      console.error('Failed to fetch affiliate summary:', err)
      setError('Failed to load affiliate summary')
    } finally {
      setIsLoadingSummary(false)
    }
  }

  const fetchReferrals = async () => {
    setIsLoadingReferrals(true)
    try {
      const res = await fetch('/api/affiliate/referrals')
      if (!res.ok) {
        throw new Error('Failed to fetch referrals')
      }
      const data = await res.json()
      setReferrals(data.referrals || [])
    } catch (err) {
      console.error('Failed to fetch referrals:', err)
    } finally {
      setIsLoadingReferrals(false)
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

  if (isLoadingSummary) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
        <p className="ml-3 text-slate-600">Loading affiliate data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-red-600">
        <p className="text-lg font-semibold">{error}</p>
        <Button onClick={fetchSummary} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-slate-600">No affiliate data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Referral Program"
        subtitle="Share your link and track referral status, payouts, and commissions"
      />

      <Card>
        <CardHeader>
          <CardTitle>Your Referral Slug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!isEditingSlug ? (
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border">
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Current Slug
                  </label>
                  <code className="text-lg font-mono text-slate-900">
                    {currentSlug || summary.referralCode}
                  </code>
                  <p className="text-xs text-slate-500 mt-1">
                    Your referral link: {summary.shortLink}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditSlug}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            ) : (
              <div className="space-y-3 p-4 bg-slate-50 rounded-lg border">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Custom Slug
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSlug}
                      onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="example"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-mono"
                      disabled={isSavingSlug}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={isSavingSlug}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveSlug}
                      disabled={isSavingSlug || !newSlug.trim()}
                      className="bg-yellow-500 hover:bg-yellow-600"
                    >
                      {isSavingSlug ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Only lowercase letters, numbers, and hyphens. 3-50 characters.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Affiliate Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Your Referral Link</label>
              <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-lg border">
                <code className="flex-1 text-sm break-all">{summary.shortLink}</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(summary.shortLink)}
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
                    const link = summary.shortLink
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

            <p className="text-sm text-slate-600">
              Share this link with others. You&apos;ll see their signup and payout status here once they register.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Signups</p>
                <p className="text-3xl font-bold mt-2">{summary.stats.totalSignups}</p>
              </div>
              <Users className="h-8 w-8 text-gold-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Qualified</p>
                <p className="text-3xl font-bold mt-2">{summary.stats.qualified}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Payable</p>
                <p className="text-3xl font-bold mt-2">{summary.stats.payable}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Paid Total</p>
                <p className="text-3xl font-bold mt-2">
                  ${(summary.stats.paidTotalCents / 100).toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Referral Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingReferrals ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              <Users className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-semibold mb-2">No referrals yet</p>
              <p className="text-sm max-w-md mx-auto">
                Share your referral link to start tracking signups and commissions.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[color:var(--border-subtle)] text-left text-sm text-slate-600">
                    <th className="py-3 px-4">Referred</th>
                    <th className="py-3 px-4">Signed Up</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Payable At</th>
                    <th className="py-3 px-4">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((referral) => {
                    const displayName = referral.referredName || referral.referredEmail || 'Pending'
                    return (
                      <tr key={referral.id} className="border-b border-[color:var(--border-subtle)]">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-slate-800">{displayName}</p>
                            {referral.referredEmail && (
                              <p className="text-sm text-slate-500">{referral.referredEmail}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-600">
                          {referral.signedUpAt
                            ? format(new Date(referral.signedUpAt), 'MMM d, yyyy')
                            : '--'}
                        </td>
                        <td className="py-4 px-4">
                          <Badge
                            variant={
                              referral.status === 'PAID'
                                ? 'default'
                                : referral.status === 'PAYABLE'
                                ? 'outline'
                                : 'secondary'
                            }
                          >
                            {referral.status === 'PAID' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {referral.status === 'PAYABLE' && <Clock className="h-3 w-3 mr-1" />}
                            {referral.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-600">
                          {referral.payableAt
                            ? format(new Date(referral.payableAt), 'MMM d, yyyy')
                            : '--'}
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-600">
                          {referral.commissionAmountCents !== null
                            ? `$${(referral.commissionAmountCents / 100).toFixed(2)}`
                            : '--'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
