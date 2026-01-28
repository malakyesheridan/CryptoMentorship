'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { format } from 'date-fns'

type ReferralRow = {
  id: string
  referralCode: string
  slugUsed: string | null
  status: string
  referredEmail: string | null
  referredName: string | null
  clickedAt: string | null
  signedUpAt: string | null
  trialStartedAt: string | null
  trialEndsAt: string | null
  firstPaidAt: string | null
  qualifiedAt: string | null
  payableAt: string | null
  paidAt: string | null
  commissionAmountCents: number | null
  currency: string
  payoutBatchId: string | null
}

type AffiliateDetailResponse = {
  referrer: {
    id: string
    name: string | null
    email: string | null
    referralSlug: string | null
  }
  referrals: ReferralRow[]
}

export function AffiliateDetail({ affiliateId }: { affiliateId: string }) {
  const [data, setData] = useState<AffiliateDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/affiliates/${affiliateId}/referrals`)
        const json = await res.json()
        setData(json)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [affiliateId])

  const stats = useMemo(() => {
    if (!data) return { total: 0, qualified: 0, payable: 0, paid: 0 }
    return data.referrals.reduce(
      (acc, referral) => {
        acc.total += 1
        if (['QUALIFIED', 'PAYABLE', 'PAID'].includes(referral.status)) acc.qualified += 1
        if (referral.status === 'PAYABLE') acc.payable += 1
        if (referral.status === 'PAID') acc.paid += 1
        return acc
      },
      { total: 0, qualified: 0, payable: 0, paid: 0 }
    )
  }, [data])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!data) {
    return <div className="text-slate-600">Affiliate not found.</div>
  }

  return (
    <div className="space-y-8">
      <Card className="card">
        <CardHeader>
          <CardTitle>Affiliate Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-lg font-semibold">{data.referrer.name || 'Unnamed'}</p>
            <p className="text-sm text-slate-600">{data.referrer.email || '--'}</p>
            <p className="text-sm text-slate-500">Slug: {data.referrer.referralSlug || '--'}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Total Referrals</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="card">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Qualified</p>
            <p className="text-2xl font-bold">{stats.qualified}</p>
          </CardContent>
        </Card>
        <Card className="card">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Payable</p>
            <p className="text-2xl font-bold">{stats.payable}</p>
          </CardContent>
        </Card>
        <Card className="card">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Paid</p>
            <p className="text-2xl font-bold">{stats.paid}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="card">
        <CardHeader>
          <CardTitle>Referral Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--border-subtle)] text-left text-sm text-slate-600">
                  <th className="py-3 px-4">Referred</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Signed Up</th>
                  <th className="py-3 px-4">Qualified</th>
                  <th className="py-3 px-4">Payable</th>
                  <th className="py-3 px-4">Paid</th>
                  <th className="py-3 px-4">Commission</th>
                </tr>
              </thead>
              <tbody>
                {data.referrals.map((referral) => (
                  <tr key={referral.id} className="border-b border-[color:var(--border-subtle)]">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-slate-800">
                          {referral.referredName || referral.referredEmail || 'Pending'}
                        </p>
                        <p className="text-sm text-slate-500">{referral.referredEmail || '--'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={referral.status === 'PAID' ? 'default' : 'secondary'}>
                        {referral.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-600">
                      {referral.signedUpAt ? format(new Date(referral.signedUpAt), 'MMM d, yyyy') : '--'}
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-600">
                      {referral.qualifiedAt ? format(new Date(referral.qualifiedAt), 'MMM d, yyyy') : '--'}
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-600">
                      {referral.payableAt ? format(new Date(referral.payableAt), 'MMM d, yyyy') : '--'}
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-600">
                      {referral.paidAt ? format(new Date(referral.paidAt), 'MMM d, yyyy') : '--'}
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-600">
                      {referral.commissionAmountCents !== null
                        ? `$${(referral.commissionAmountCents / 100).toFixed(2)}`
                        : '--'}
                    </td>
                  </tr>
                ))}
                {data.referrals.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                      No referrals found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
