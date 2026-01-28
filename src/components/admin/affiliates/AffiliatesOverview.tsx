'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, DollarSign, CheckCircle, Clock, Loader2 } from 'lucide-react'

type AffiliateRow = {
  referrer: {
    id: string
    name: string | null
    email: string | null
    referralSlug: string | null
  }
  stats: {
    totalSignups: number
    qualified: number
    payable: number
    paidTotalCents: number
  }
}

type ReferralRow = {
  id: string
  status: string
  referredName: string | null
  referredEmail: string | null
  signedUpAt: string | null
  payableAt: string | null
  commissionAmountCents: number | null
  currency: string
  paidAt: string | null
  referrer: {
    id: string
    name: string | null
    email: string | null
  }
}

export function AffiliatesOverview() {
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([])
  const [allReferrals, setAllReferrals] = useState<ReferralRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [affiliatesRes, referralsRes] = await Promise.all([
          fetch('/api/admin/affiliates'),
          fetch('/api/admin/affiliates/referrals')
        ])
        const affiliatesData = await affiliatesRes.json()
        const referralsData = await referralsRes.json()
        setAffiliates(affiliatesData.affiliates || [])
        setAllReferrals(referralsData.referrals || [])
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const totals = useMemo(() => {
    return affiliates.reduce(
      (acc, row) => ({
        affiliates: acc.affiliates + 1,
        signups: acc.signups + row.stats.totalSignups,
        payable: acc.payable + row.stats.payable,
        paidTotalCents: acc.paidTotalCents + row.stats.paidTotalCents
      }),
      { affiliates: 0, signups: 0, payable: 0, paidTotalCents: 0 }
    )
  }, [affiliates])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Affiliates</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.affiliates}</div>
            <p className="text-xs text-slate-500">Active referrers</p>
          </CardContent>
        </Card>
        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Total Signups</CardTitle>
            <CheckCircle className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.signups}</div>
            <p className="text-xs text-slate-500">Referred users</p>
          </CardContent>
        </Card>
        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Payable</CardTitle>
            <Clock className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.payable}</div>
            <p className="text-xs text-slate-500">Referrals ready to pay</p>
          </CardContent>
        </Card>
        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Paid Total</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totals.paidTotalCents / 100).toFixed(2)}</div>
            <p className="text-xs text-slate-500">Paid commissions</p>
          </CardContent>
        </Card>
      </div>

      <Card className="card">
        <CardHeader>
          <CardTitle>All Affiliates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--border-subtle)] text-left text-sm text-slate-600">
                  <th className="py-3 px-4">Affiliate</th>
                  <th className="py-3 px-4">Signups</th>
                  <th className="py-3 px-4">Qualified</th>
                  <th className="py-3 px-4">Payable</th>
                  <th className="py-3 px-4">Paid Total</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.map((row) => (
                  <tr key={row.referrer.id} className="border-b border-[color:var(--border-subtle)]">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-slate-800">{row.referrer.name || 'Unnamed'}</p>
                        <p className="text-sm text-slate-500">{row.referrer.email || '--'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">{row.stats.totalSignups}</td>
                    <td className="py-4 px-4">{row.stats.qualified}</td>
                    <td className="py-4 px-4">
                      <Badge variant={row.stats.payable > 0 ? 'default' : 'secondary'}>
                        {row.stats.payable}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      ${(row.stats.paidTotalCents / 100).toFixed(2)}
                    </td>
                    <td className="py-4 px-4">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/affiliates/${row.referrer.id}`}>View</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {affiliates.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                      No affiliates found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="card">
        <CardHeader>
          <CardTitle>All Referral Deals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--border-subtle)] text-left text-sm text-slate-600">
                  <th className="py-3 px-4">Referrer</th>
                  <th className="py-3 px-4">Referred</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Signed Up</th>
                  <th className="py-3 px-4">Payable</th>
                  <th className="py-3 px-4">Commission</th>
                </tr>
              </thead>
              <tbody>
                {allReferrals.map((referral) => (
                  <tr key={referral.id} className="border-b border-[color:var(--border-subtle)]">
                    <td className="py-4 px-4">
                      <p className="font-medium text-slate-800">
                        {referral.referrer.name || referral.referrer.email || 'Unknown'}
                      </p>
                      <p className="text-sm text-slate-500">{referral.referrer.email || '--'}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-medium text-slate-800">
                        {referral.referredName || referral.referredEmail || 'Pending'}
                      </p>
                      <p className="text-sm text-slate-500">{referral.referredEmail || '--'}</p>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={referral.status === 'PAID' ? 'default' : 'secondary'}>
                        {referral.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-600">
                      {referral.signedUpAt ? referral.signedUpAt.split('T')[0] : '--'}
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-600">
                      {referral.payableAt ? referral.payableAt.split('T')[0] : '--'}
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-600">
                      {referral.commissionAmountCents !== null
                        ? `$${(referral.commissionAmountCents / 100).toFixed(2)}`
                        : '--'}
                    </td>
                  </tr>
                ))}
                {allReferrals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                      No referral deals found.
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
