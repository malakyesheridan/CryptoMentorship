'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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

type ManualPayout = {
  id: string
  referrer: {
    id: string
    name: string | null
    email: string | null
  }
  amountCents: number
  currency: string
  scheduledFor: string
  frequency: string | null
  reminderEnabled: boolean
  nextRunAt: string | null
  lastSentAt: string | null
  notes: string | null
  createdAt: string
}

export function AffiliatePayouts() {
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([])
  const [payouts, setPayouts] = useState<PayoutBatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedAffiliateId, setExpandedAffiliateId] = useState<string | null>(null)
  const [payableReferrals, setPayableReferrals] = useState<Record<string, ReferralRow[]>>({})
  const [selectedReferralIds, setSelectedReferralIds] = useState<Record<string, Set<string>>>({})
  const [statusFilter, setStatusFilter] = useState<string>('READY')
  const [manualPayouts, setManualPayouts] = useState<ManualPayout[]>([])
  const [manualReferrerId, setManualReferrerId] = useState<string>('')
  const [manualAmount, setManualAmount] = useState<string>('')
  const [manualDate, setManualDate] = useState<string>('')
  const [manualFrequency, setManualFrequency] = useState<string>('')
  const [manualReminder, setManualReminder] = useState<boolean>(true)
  const [manualNotes, setManualNotes] = useState<string>('')
  const [isSubmittingManual, setIsSubmittingManual] = useState(false)
  const [editingManualId, setEditingManualId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editFrequency, setEditFrequency] = useState('')
  const [editReminder, setEditReminder] = useState(true)
  const [editNotes, setEditNotes] = useState('')

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

  const loadManualPayouts = async () => {
    const res = await fetch('/api/admin/affiliates/manual-payouts')
    const data = await res.json()
    setManualPayouts(data.payouts || [])
  }

  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([loadAffiliates(), loadPayouts(statusFilter), loadManualPayouts()])
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

  const submitManualPayout = async () => {
    if (!manualReferrerId || !manualAmount || !manualDate) {
      toast.error('Referrer, amount, and date are required')
      return
    }

    const amountCents = Math.round(Number(manualAmount) * 100)
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      toast.error('Enter a valid amount')
      return
    }

    setIsSubmittingManual(true)
    try {
      const res = await fetch('/api/admin/affiliates/manual-payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referrerId: manualReferrerId,
          amountCents,
          currency: 'aud',
          scheduledFor: new Date(manualDate).toISOString(),
          frequency: manualFrequency || null,
          reminderEnabled: manualReminder,
          notes: manualNotes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to create manual payout')
        return
      }
      toast.success('Manual payout scheduled')
      setManualAmount('')
      setManualDate('')
      setManualFrequency('')
      setManualReminder(true)
      setManualNotes('')
      await loadManualPayouts()
    } finally {
      setIsSubmittingManual(false)
    }
  }

  const startEditManual = (payout: ManualPayout) => {
    setEditingManualId(payout.id)
    setEditAmount((payout.amountCents / 100).toFixed(2))
    setEditDate(payout.scheduledFor.slice(0, 10))
    setEditFrequency(payout.frequency || '')
    setEditReminder(payout.reminderEnabled)
    setEditNotes(payout.notes || '')
  }

  const cancelEditManual = () => {
    setEditingManualId(null)
    setEditAmount('')
    setEditDate('')
    setEditFrequency('')
    setEditReminder(true)
    setEditNotes('')
  }

  const saveEditManual = async (payoutId: string) => {
    const amountCents = Math.round(Number(editAmount) * 100)
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (!editDate) {
      toast.error('Select a date')
      return
    }

    const res = await fetch(`/api/admin/affiliates/manual-payouts/${payoutId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountCents,
        currency: 'aud',
        scheduledFor: new Date(editDate).toISOString(),
        frequency: editFrequency || null,
        reminderEnabled: editReminder,
        notes: editNotes || null,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Failed to update payout')
      return
    }

    toast.success('Manual payout updated')
    cancelEditManual()
    await loadManualPayouts()
  }

  const deleteManual = async (payoutId: string) => {
    if (!window.confirm('Delete this scheduled payout?')) return
    const res = await fetch(`/api/admin/affiliates/manual-payouts/${payoutId}`, {
      method: 'DELETE',
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Failed to delete payout')
      return
    }
    toast.success('Manual payout deleted')
    await loadManualPayouts()
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
        <CardHeader>
          <CardTitle>Manual Payouts & Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-600">Affiliate</label>
              <select
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={manualReferrerId}
                onChange={(event) => setManualReferrerId(event.target.value)}
              >
                <option value="">Select an affiliate</option>
                {affiliates.map((row) => (
                  <option key={row.referrer.id} value={row.referrer.id}>
                    {row.referrer.name || row.referrer.email || row.referrer.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-600">Amount (AUD)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={manualAmount}
                onChange={(event) => setManualAmount(event.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-600">Date</label>
              <Input
                type="date"
                value={manualDate}
                onChange={(event) => setManualDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-600">Frequency (optional)</label>
              <select
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={manualFrequency}
                onChange={(event) => setManualFrequency(event.target.value)}
              >
                <option value="">One-time</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            <div className="space-y-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={manualReminder}
                onChange={(event) => setManualReminder(event.target.checked)}
              />
              <span className="text-sm text-slate-600">Enable reminder</span>
            </div>
            <div className="space-y-2 lg:col-span-3">
              <label className="text-sm text-slate-600">Notes</label>
              <Textarea
                value={manualNotes}
                onChange={(event) => setManualNotes(event.target.value)}
                rows={2}
                placeholder="Optional notes or payout reference"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={submitManualPayout} disabled={isSubmittingManual}>
              {isSubmittingManual ? 'Saving...' : 'Schedule payout'}
            </Button>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border-subtle)] text-left text-slate-600">
                  <th className="py-2 px-3">Affiliate</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 px-3">Scheduled</th>
                  <th className="py-2 px-3">Frequency</th>
                  <th className="py-2 px-3">Reminder</th>
                  <th className="py-2 px-3">Notes</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {manualPayouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-[color:var(--border-subtle)]">
                    <td className="py-2 px-3">
                      {payout.referrer.name || payout.referrer.email || '--'}
                    </td>
                    <td className="py-2 px-3">
                      {editingManualId === payout.id ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editAmount}
                          onChange={(event) => setEditAmount(event.target.value)}
                        />
                      ) : (
                        `$${(payout.amountCents / 100).toFixed(2)} AUD`
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {editingManualId === payout.id ? (
                        <Input
                          type="date"
                          value={editDate}
                          onChange={(event) => setEditDate(event.target.value)}
                        />
                      ) : (
                        format(new Date(payout.scheduledFor), 'MMM d, yyyy')
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {editingManualId === payout.id ? (
                        <select
                          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
                          value={editFrequency}
                          onChange={(event) => setEditFrequency(event.target.value)}
                        >
                          <option value="">One-time</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                        </select>
                      ) : (
                        payout.frequency || 'One-time'
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {editingManualId === payout.id ? (
                        <input
                          type="checkbox"
                          checked={editReminder}
                          onChange={(event) => setEditReminder(event.target.checked)}
                        />
                      ) : (
                        payout.reminderEnabled ? 'On' : 'Off'
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {editingManualId === payout.id ? (
                        <Textarea
                          value={editNotes}
                          onChange={(event) => setEditNotes(event.target.value)}
                          rows={2}
                        />
                      ) : (
                        payout.notes || '--'
                      )}
                    </td>
                    <td className="py-2 px-3 space-x-2">
                      {editingManualId === payout.id ? (
                        <>
                          <Button size="sm" onClick={() => saveEditManual(payout.id)}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditManual}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={() => startEditManual(payout)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteManual(payout.id)}>
                            Delete
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {manualPayouts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-sm text-slate-500">
                      No manual payouts scheduled.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
