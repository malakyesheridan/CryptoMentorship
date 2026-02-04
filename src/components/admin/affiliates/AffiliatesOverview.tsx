'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, DollarSign, CheckCircle, Clock, Loader2 } from 'lucide-react'
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

type UserOption = {
  id: string
  name: string | null
  email: string
  createdAt: string
  referralSlug: string | null
  role: string
}

export function AffiliatesOverview() {
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([])
  const [allReferrals, setAllReferrals] = useState<ReferralRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [memberQuery, setMemberQuery] = useState('')
  const [memberResults, setMemberResults] = useState<UserOption[]>([])
  const [selectedMember, setSelectedMember] = useState<UserOption | null>(null)
  const [isSearchingMembers, setIsSearchingMembers] = useState(false)
  const [referrerQuery, setReferrerQuery] = useState('')
  const [referrerResults, setReferrerResults] = useState<UserOption[]>([])
  const [selectedReferrer, setSelectedReferrer] = useState<UserOption | null>(null)
  const [isSearchingReferrers, setIsSearchingReferrers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true)
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
      if (showLoader) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load(true)
  }, [load])

  useEffect(() => {
    if (selectedMember) {
      return
    }
    if (memberQuery.trim().length < 2) {
      setMemberResults([])
      return
    }

    const controller = new AbortController()
    const handle = setTimeout(async () => {
      setIsSearchingMembers(true)
      try {
        const res = await fetch(`/api/admin/affiliates/users?q=${encodeURIComponent(memberQuery)}`, {
          signal: controller.signal
        })
        const data = await res.json()
        setMemberResults(data.users || [])
      } catch {
        if (!controller.signal.aborted) {
          setMemberResults([])
        }
      } finally {
        if (!controller.signal.aborted) setIsSearchingMembers(false)
      }
    }, 250)

    return () => {
      controller.abort()
      clearTimeout(handle)
    }
  }, [memberQuery, selectedMember])

  useEffect(() => {
    if (selectedReferrer) {
      return
    }
    if (referrerQuery.trim().length < 2) {
      setReferrerResults([])
      return
    }

    const controller = new AbortController()
    const handle = setTimeout(async () => {
      setIsSearchingReferrers(true)
      try {
        const exclude = selectedMember?.id ? `&exclude=${selectedMember.id}` : ''
        const res = await fetch(
          `/api/admin/affiliates/users?q=${encodeURIComponent(referrerQuery)}${exclude}`,
          { signal: controller.signal }
        )
        const data = await res.json()
        setReferrerResults(data.users || [])
      } catch {
        if (!controller.signal.aborted) {
          setReferrerResults([])
        }
      } finally {
        if (!controller.signal.aborted) setIsSearchingReferrers(false)
      }
    }, 250)

    return () => {
      controller.abort()
      clearTimeout(handle)
    }
  }, [referrerQuery, selectedMember?.id, selectedReferrer])

  useEffect(() => {
    if (selectedMember && selectedReferrer && selectedMember.id === selectedReferrer.id) {
      setSelectedReferrer(null)
      setReferrerQuery('')
    }
  }, [selectedMember, selectedReferrer])

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

  const referralDateLabel = selectedMember
    ? format(new Date(selectedMember.createdAt), 'MMM d, yyyy')
    : ''

  const handleCreateReferral = async () => {
    if (!selectedMember || !selectedReferrer) return
    if (selectedMember.id === selectedReferrer.id) {
      toast.error('Member and referrer must be different users')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/affiliates/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referredUserId: selectedMember.id,
          referrerId: selectedReferrer.id
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create referral')
      }
      toast.success('Referral linked successfully')
      setSelectedMember(null)
      setSelectedReferrer(null)
      setMemberQuery('')
      setReferrerQuery('')
      setMemberResults([])
      setReferrerResults([])
      await load(false)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create referral')
    } finally {
      setIsSubmitting(false)
    }
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
          <CardTitle>Manual Referral Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="member-search">Member</Label>
              <Input
                id="member-search"
                value={memberQuery}
                onChange={(event) => {
                  setMemberQuery(event.target.value)
                  setSelectedMember(null)
                }}
                placeholder="Search by name or email"
              />
              {selectedMember && (
                <p className="text-xs text-slate-500">
                  Selected: {selectedMember.name || selectedMember.email}
                </p>
              )}
              {memberQuery.trim().length >= 2 && memberResults.length > 0 && (
                <div className="border border-[color:var(--border-subtle)] rounded-md bg-white shadow-sm max-h-56 overflow-auto">
                  {memberResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-slate-50"
                      onClick={() => {
                        setSelectedMember(user)
                        setMemberQuery(user.name || user.email)
                        setMemberResults([])
                      }}
                    >
                      <div className="text-sm font-medium text-slate-800">
                        {user.name || user.email}
                      </div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </button>
                  ))}
                </div>
              )}
              {memberQuery.trim().length >= 2 && memberResults.length === 0 && !isSearchingMembers && (
                <p className="text-xs text-slate-500">No users found.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="referrer-search">Referrer</Label>
              <Input
                id="referrer-search"
                value={referrerQuery}
                onChange={(event) => {
                  setReferrerQuery(event.target.value)
                  setSelectedReferrer(null)
                }}
                placeholder="Search by name or email"
              />
              {selectedReferrer && (
                <p className="text-xs text-slate-500">
                  Selected: {selectedReferrer.name || selectedReferrer.email}
                </p>
              )}
              {referrerQuery.trim().length >= 2 && referrerResults.length > 0 && (
                <div className="border border-[color:var(--border-subtle)] rounded-md bg-white shadow-sm max-h-56 overflow-auto">
                  {referrerResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-slate-50"
                      onClick={() => {
                        setSelectedReferrer(user)
                        setReferrerQuery(user.name || user.email)
                        setReferrerResults([])
                      }}
                    >
                      <div className="text-sm font-medium text-slate-800">
                        {user.name || user.email}
                      </div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </button>
                  ))}
                </div>
              )}
              {referrerQuery.trim().length >= 2 && referrerResults.length === 0 && !isSearchingReferrers && (
                <p className="text-xs text-slate-500">No users found.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Referral Date</Label>
              <Input readOnly value={referralDateLabel} placeholder="Select a member" />
              <p className="text-xs text-slate-500">
                Uses the member&apos;s sign-up date.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedMember(null)
                setSelectedReferrer(null)
                setMemberQuery('')
                setReferrerQuery('')
                setMemberResults([])
                setReferrerResults([])
              }}
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateReferral}
              disabled={!selectedMember || !selectedReferrer || isSubmitting}
            >
              {isSubmitting ? 'Linking...' : 'Link Referral'}
            </Button>
          </div>
        </CardContent>
      </Card>

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
