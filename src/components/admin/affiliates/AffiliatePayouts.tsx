'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

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
  payableAt: string | null
  commissionAmountCents: number | null
  currency: string
}

type PayoutBatch = {
  id: string
  status: string
  totalAmountCents: number
  currency: string
  dueAt: string | null
  paidAt: string | null
  createdAt: string
  referralsCount: number
  referrer: {
    id: string
    name: string | null
    email: string | null
    referralSlug: string | null
  }
}

export function AffiliatePayouts() {
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([])
  const [payouts, setPayouts] = useState<PayoutBatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedAffiliateId, setExpandedAffiliateId] = useState<string | null>(null)
  const [payableReferrals, setPayableReferrals] = useState<Record<string, ReferralRow[]>>({})
  const [selectedReferralIds, setSelectedReferralIds] = useState<Record<string, Set<string>>>({})
  const [statusFilter, setStatusFilter] = useState<string>('READY')

  const loadAffiliates = async () => {
    const res = await fetch('/api/admin/affiliates')
    const data = await res.json()
    setAffiliates(data.affiliates || [])
  }

  const loadPayouts = async (status?: string) => {
    const url = status ? `/api/admin/affiliates/payouts?status=${status}` : '/api/admin/affiliates/payouts'
    const res = await fetch(url)
    const data = await res.json()
    setPayouts(data.payouts || [])
  }

  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([loadAffiliates(), loadPayouts(statusFilter)])
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [statusFilter])

  const readyAffiliates = useMemo(
    () => affiliates.filter((row) => row.stats.payable > 0),
    [affiliates]
  )

  const toggleAffiliate = async (affiliateId: string) => {
    if (expandedAffiliateId === affiliateId) {
      setExpandedAffiliateId(null)
      return
    }

    setExpandedAffiliateId(affiliateId)

    if (payableReferrals[affiliateId]) return

    const res = await fetch(`/api/admin/affiliates/${affiliateId}/referrals`)
    const data = await res.json()
    const payable = (data.referrals || []).filter((r: ReferralRow) => r.status === 'PAYABLE')
    setPayableReferrals((prev) => ({ ...prev, [affiliateId]: payable }))
    setSelectedReferralIds((prev) => ({ ...prev, [affiliateId]: new Set() }))
  }

  const toggleReferralSelection = (affiliateId: string, referralId: string) => {
    setSelectedReferralIds((prev) => {
      const current = new Set(prev[affiliateId] || [])
      if (current.has(referralId)) {
        current.delete(referralId)
      } else {
        current.add(referralId)
      }
      return { ...prev, [affiliateId]: current }
    })
  }

  const createBatch = async (affiliateId: string, useSelected: boolean) => {
    const selected = selectedReferralIds[affiliateId]
    const referralIds = useSelected && selected ? Array.from(selected) : undefined

    const res = await fetch('/api/admin/affiliates/payouts/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referrerId: affiliateId, referralIds })
    })

    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Failed to create payout batch')
      return
    }

    toast.success('Payout batch created')
    await Promise.all([loadAffiliates(), loadPayouts(statusFilter)])
  }

  const markBatchPaid = async (batchId: string) => {
    const res = await fetch(`/api/admin/affiliates/payouts/${batchId}/mark-paid`, {
      method: 'POST'
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Failed to mark paid')
      return
    }
    toast.success('Payout batch marked paid')
    await loadPayouts(statusFilter)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Card className="card">
        <CardHeader>
          <CardTitle>Ready To Pay</CardTitle>
        </CardHeader>
        <CardContent>
          {readyAffiliates.length === 0 ? (
            <p className="text-sm text-slate-600">No payable referrals right now.</p>
          ) : (
            <div className="space-y-4">
              {readyAffiliates.map((affiliate) => {
                const isExpanded = expandedAffiliateId === affiliate.referrer.id
                const payable = payableReferrals[affiliate.referrer.id] || []
                const selected = selectedReferralIds[affiliate.referrer.id] || new Set()

                return (
                  <div key={affiliate.referrer.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{affiliate.referrer.name || 'Unnamed'}</p>
                        <p className="text-sm text-slate-500">{affiliate.referrer.email || '--'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{affiliate.stats.payable} payable</Badge>
                        <Button variant="outline" size="sm" onClick={() => toggleAffiliate(affiliate.referrer.id)}>
                          {isExpanded ? 'Hide' : 'Select'}
                        </Button>
                        <Button size="sm" onClick={() => createBatch(affiliate.referrer.id, false)}>
                          Create Batch (All)
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4">
                        {payable.length === 0 ? (
                          <p className="text-sm text-slate-500">No payable referrals loaded.</p>
                        ) : (
                          <>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-[color:var(--border-subtle)] text-left text-slate-600">
                                    <th className="py-2 px-3">Select</th>
                                    <th className="py-2 px-3">Referred</th>
                                    <th className="py-2 px-3">Payable At</th>
                                    <th className="py-2 px-3">Commission</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {payable.map((referral) => (
                                    <tr key={referral.id} className="border-b border-[color:var(--border-subtle)]">
                                      <td className="py-2 px-3">
                                        <input
                                          type="checkbox"
                                          checked={selected.has(referral.id)}
                                          onChange={() => toggleReferralSelection(affiliate.referrer.id, referral.id)}
                                        />
                                      </td>
                                      <td className="py-2 px-3">
                                        {referral.referredName || referral.referredEmail || 'Pending'}
                                      </td>
                                      <td className="py-2 px-3">
                                        {referral.payableAt ? format(new Date(referral.payableAt), 'MMM d, yyyy') : '--'}
                                      </td>
                                      <td className="py-2 px-3">
                                        {referral.commissionAmountCents !== null
                                          ? `$${(referral.commissionAmountCents / 100).toFixed(2)}`
                                          : '--'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="mt-3 flex justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => createBatch(affiliate.referrer.id, true)}
                                disabled={selected.size === 0}
                              >
                                Create Batch (Selected)
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="card">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Payout Batches</CardTitle>
          <div className="flex gap-2">
            {['READY', 'PAID', 'DRAFT', 'CANCELLED'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border-subtle)] text-left text-slate-600">
                  <th className="py-2 px-3">Batch</th>
                  <th className="py-2 px-3">Affiliate</th>
                  <th className="py-2 px-3">Total</th>
                  <th className="py-2 px-3">Referrals</th>
                  <th className="py-2 px-3">Due</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((batch) => (
                  <tr key={batch.id} className="border-b border-[color:var(--border-subtle)]">
                    <td className="py-2 px-3 font-mono text-xs">{batch.id.slice(0, 8)}</td>
                    <td className="py-2 px-3">
                      {batch.referrer.name || batch.referrer.email || '--'}
                    </td>
                    <td className="py-2 px-3">
                      ${(batch.totalAmountCents / 100).toFixed(2)} {batch.currency.toUpperCase()}
                    </td>
                    <td className="py-2 px-3">{batch.referralsCount}</td>
                    <td className="py-2 px-3">
                      {batch.dueAt ? format(new Date(batch.dueAt), 'MMM d, yyyy') : '--'}
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant={batch.status === 'PAID' ? 'default' : 'secondary'}>
                        {batch.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 space-x-2">
                      {batch.status === 'READY' && (
                        <Button size="sm" onClick={() => markBatchPaid(batch.id)}>
                          Mark Paid
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          window.location.href = `/api/admin/affiliates/payouts/${batch.id}/export.csv`
                        }}
                      >
                        Export CSV
                      </Button>
                    </td>
                  </tr>
                ))}
                {payouts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                      No payout batches found.
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
