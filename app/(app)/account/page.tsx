'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState, type FormEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NotificationPreferences } from '@/components/NotificationPreferences'
import { formatDate } from '@/lib/dates'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  Loader2,
  CheckCircle,
  XCircle,
  Mail,
  Shield,
  Calendar,
  CreditCard,
  AlertCircle,
  Users,
  DollarSign,
  Copy,
  Clock,
  Share2,
  Edit2,
  Save,
  X,
  Bell,
  Link as LinkIcon,
  Crown,
  Pencil,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────

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

interface Subscription {
  id: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  tier: string
}

interface Payment {
  id: string
  amount: number
  currency: string
  status: string
  createdAt: string
}

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

// ── Helpers ────────────────────────────────────────────────────

function getTierDisplayName(tier: string) {
  const tierNames: Record<string, string> = {
    T1: 'T1 Basic',
    T2: 'T2 Premium',
    T3: 'T3 Elite',
  }
  return tierNames[tier] || tier
}

function getStatusVariant(status: string) {
  if (status === 'active') return 'default' as const
  if (status === 'trial') return 'preview' as const
  return 'destructive' as const
}

// ── Skeleton ───────────────────────────────────────────────────

function SectionSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-[#2a2520] rounded" style={{ width: `${70 - i * 15}%` }} />
      ))}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────

export default function AccountPage() {
  const { data: session, update: updateSession } = useSession()

  // Account data
  const [accountData, setAccountData] = useState<AccountData | null>(null)
  const [accountLoading, setAccountLoading] = useState(true)
  const [accountError, setAccountError] = useState<string | null>(null)

  // Name edit
  const [displayName, setDisplayName] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)

  // Subscription
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [subLoading, setSubLoading] = useState(true)
  const [isUpdatingSub, setIsUpdatingSub] = useState(false)

  // Referrals
  const [summary, setSummary] = useState<AffiliateSummary | null>(null)
  const [referrals, setReferrals] = useState<ReferralRow[]>([])
  const [refLoading, setRefLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [currentSlug, setCurrentSlug] = useState<string | null>(null)
  const [isEditingSlug, setIsEditingSlug] = useState(false)
  const [newSlug, setNewSlug] = useState('')
  const [isSavingSlug, setIsSavingSlug] = useState(false)
  const [showBillingHistory, setShowBillingHistory] = useState(false)

  // ── Fetch all data in parallel ─────────────────────────────

  useEffect(() => {
    if (!session?.user?.id) return

    // Account
    fetch('/api/me/account')
      .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch account'))
      .then(data => {
        setAccountData(data)
        setDisplayName(data?.user?.name || '')
      })
      .catch(err => setAccountError(typeof err === 'string' ? err : 'Failed to load account'))
      .finally(() => setAccountLoading(false))

    // Subscription
    fetch('/api/stripe/subscription')
      .then(res => res.json())
      .then(data => {
        setSubscription(data.subscription || null)
        setPayments(data.membership?.payments || [])
      })
      .catch(() => {})
      .finally(() => setSubLoading(false))

    // Affiliate summary + referrals + slug
    Promise.all([
      fetch('/api/affiliate/summary').then(r => r.ok ? r.json() : null),
      fetch('/api/affiliate/referrals').then(r => r.ok ? r.json() : null),
      fetch('/api/referrals/slug').then(r => r.ok ? r.json() : null),
    ])
      .then(([sum, refs, slugData]) => {
        if (sum) setSummary(sum)
        if (refs) setReferrals(refs.referrals || [])
        if (slugData) setCurrentSlug(slugData.slug)
      })
      .catch(() => {})
      .finally(() => setRefLoading(false))
  }, [session?.user?.id])

  // ── Handlers ───────────────────────────────────────────────

  const handleNameSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNameError(null)
    const trimmedName = displayName.trim()
    if (!trimmedName) { setNameError('Name is required.'); return }
    if (trimmedName.length > 80) { setNameError('Name must be 80 characters or less.'); return }
    const currentName = accountData?.user?.name || session?.user?.name || ''
    if (trimmedName === currentName) { setIsEditingName(false); return }

    setIsSavingName(true)
    try {
      const res = await fetch('/api/me/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update name')
      setAccountData(prev => prev ? { ...prev, user: { ...prev.user, name: trimmedName } } : prev)
      await updateSession({ name: trimmedName })
      setIsEditingName(false)
      toast.success('Name updated')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update name'
      setNameError(msg)
      toast.error(msg)
    } finally {
      setIsSavingName(false)
    }
  }

  const fetchSubscription = async () => {
    const res = await fetch('/api/stripe/subscription')
    const data = await res.json()
    setSubscription(data.subscription || null)
    setPayments(data.membership?.payments || [])
  }

  const handleCancelSub = async () => {
    if (!confirm('Are you sure you want to cancel? It will remain active until the end of the billing period.')) return
    setIsUpdatingSub(true)
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to cancel') }
      await fetchSubscription()
      toast.success('Subscription cancelled')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel subscription')
    } finally {
      setIsUpdatingSub(false)
    }
  }

  const handleReactivateSub = async () => {
    setIsUpdatingSub(true)
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reactivate' }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to reactivate') }
      await fetchSubscription()
      toast.success('Subscription reactivated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reactivate subscription')
    } finally {
      setIsUpdatingSub(false)
    }
  }

  const handleSaveSlug = async () => {
    if (!newSlug.trim()) { toast.error('Slug cannot be empty'); return }
    setIsSavingSlug(true)
    try {
      const res = await fetch('/api/referrals/slug', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: newSlug.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update slug')
      toast.success('Referral slug updated')
      setCurrentSlug(data.slug)
      setIsEditingSlug(false)
      setNewSlug('')
      // Refresh summary to get updated link
      const sumRes = await fetch('/api/affiliate/summary')
      if (sumRes.ok) setSummary(await sumRes.json())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update slug')
    } finally {
      setIsSavingSlug(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch { toast.error('Failed to copy') }
  }

  // ── Error state ────────────────────────────────────────────

  if (accountError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <XCircle className="h-12 w-12 mb-4 text-red-500" />
        <p className="text-lg font-semibold text-red-400">{accountError}</p>
      </div>
    )
  }

  const user = accountData?.user || session?.user
  const membership = accountData?.membership

  const memberSince = membership?.createdAt
    ? formatDate(membership.createdAt, 'MMMM yyyy')
    : accountData?.user?.createdAt
      ? formatDate(accountData.user.createdAt, 'MMMM yyyy')
      : null

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* ═══ PROFILE HEADER ═══ */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-6">
        {accountLoading ? (
          <SectionSkeleton lines={4} />
        ) : (
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Avatar */}
            <div className="shrink-0">
              {user?.image ? (
                <img src={user.image as string} alt="" className="w-20 h-20 rounded-full ring-2 ring-[var(--border-subtle)]" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#2a2520] ring-2 ring-[var(--border-subtle)] flex items-center justify-center text-2xl font-bold text-[var(--text-muted)]">
                  {((user?.name as string)?.[0] ?? '?').toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Name row */}
              <div>
                {!isEditingName ? (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-[var(--text-strong)] truncate">
                      {user?.name || 'Anonymous'}
                    </h1>
                    {(user?.role === 'admin' || user?.role === 'editor') && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--gold-400)]/20 text-[var(--gold-400)] font-semibold uppercase tracking-wide">
                        {user?.role}
                      </span>
                    )}
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[#1a1815] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleNameSave} className="flex items-center gap-2">
                    <Input
                      value={displayName}
                      onChange={e => { setDisplayName(e.target.value); if (nameError) setNameError(null) }}
                      maxLength={80}
                      placeholder="Enter your name"
                      disabled={isSavingName}
                      className="max-w-xs"
                      autoFocus
                    />
                    <Button type="submit" size="sm" disabled={isSavingName}>
                      {isSavingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => { setIsEditingName(false); setDisplayName(accountData?.user?.name || ''); setNameError(null) }}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-strong)]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                )}
                {nameError && <p className="text-sm text-red-400 mt-1">{nameError}</p>}
              </div>

              {/* Email */}
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-[var(--text-strong)]">{user?.email || 'No email'}</span>
                {accountData?.user?.emailVerified && (
                  <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-medium">
                    <CheckCircle className="w-2.5 h-2.5" /> Verified
                  </span>
                )}
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                {memberSince && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Member since {memberSince}
                  </span>
                )}
                {membership && (
                  <span className="flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    <Badge variant={getStatusVariant(membership.status)} className="text-[10px] px-1.5 py-0">
                      {membership.status.charAt(0).toUpperCase() + membership.status.slice(1)}
                    </Badge>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ MEMBERSHIP & SUBSCRIPTION ═══ */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text-strong)] mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-[var(--text-muted)]" />
          Membership & Subscription
        </h2>

        {subLoading || accountLoading ? (
          <SectionSkeleton />
        ) : !membership && !subscription ? (
          <div className="text-center py-8">
            <CreditCard className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-[var(--text-muted)] mb-3">No active membership</p>
            <a href="/subscribe" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--gold-400)] text-[#0a0a0a] text-sm font-semibold hover:brightness-110 transition">
              View Plans
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tier + Status */}
            {membership && (
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="preview" className="text-sm px-3 py-1">
                  {getTierDisplayName(membership.tier)}
                </Badge>
                {membership.currentPeriodEnd && (
                  <span className="text-sm text-[var(--text-muted)]">
                    Period ends {formatDate(membership.currentPeriodEnd, 'MMM d, yyyy')}
                  </span>
                )}
                {membership.cancelAtPeriodEnd && (
                  <span className="text-xs text-amber-400 font-medium">Cancels at period end</span>
                )}
              </div>
            )}

            {/* Subscription actions */}
            {subscription && (
              <>
                {!subscription.cancelAtPeriodEnd && subscription.status === 'active' && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    Active — renews automatically on {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
                  </div>
                )}

                {subscription.cancelAtPeriodEnd && (
                  <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Cancels on {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
                  </div>
                )}

                <div className="flex gap-2">
                  {subscription.cancelAtPeriodEnd ? (
                    <Button size="sm" onClick={handleReactivateSub} disabled={isUpdatingSub}>
                      {isUpdatingSub ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Processing...</> : 'Reactivate Subscription'}
                    </Button>
                  ) : (
                    <Button size="sm" variant="destructive" onClick={handleCancelSub} disabled={isUpdatingSub}>
                      {isUpdatingSub ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Processing...</> : 'Cancel Subscription'}
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Benefits */}
            {membership && (
              <div className="flex flex-wrap gap-2 pt-2">
                {['Research reports', 'Crypto Compass', 'Model portfolio', 'Community access'].map(b => (
                  <span key={b} className="text-xs px-2.5 py-1 rounded-full bg-[var(--gold-400)]/10 text-[var(--gold-400)] font-medium">
                    {b}
                  </span>
                ))}
              </div>
            )}

            {/* Billing History */}
            {payments.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setShowBillingHistory(!showBillingHistory)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-strong)] transition-colors"
                >
                  {showBillingHistory ? 'Hide' : 'Show'} billing history ({payments.length})
                </button>
                {showBillingHistory && (
                  <div className="mt-3 space-y-2">
                    {payments.map(payment => (
                      <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-[#141210] border border-[var(--border-subtle)]">
                        <div>
                          <span className="text-sm font-medium text-[var(--text-strong)]">
                            ${payment.amount.toFixed(2)} {payment.currency.toUpperCase()}
                          </span>
                          <span className="text-xs text-[var(--text-muted)] ml-2">
                            {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <Badge variant={payment.status === 'succeeded' ? 'default' : payment.status === 'failed' ? 'destructive' : 'outline'}>
                          {payment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ REFERRAL PROGRAM ═══ */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text-strong)] mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-[var(--text-muted)]" />
          Referral Program
        </h2>

        {refLoading ? (
          <SectionSkeleton />
        ) : !summary ? (
          <p className="text-sm text-[var(--text-muted)] py-4">No affiliate data available</p>
        ) : (
          <div className="space-y-5">
            {/* Affiliate Link */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-[#141210] rounded-lg border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <LinkIcon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                <code className="text-sm text-[var(--text-strong)] truncate">{summary.shortLink}</code>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => copyToClipboard(summary.shortLink)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1a1815] text-[var(--text-muted)] hover:text-[var(--text-strong)] border border-[var(--border-subtle)] transition-colors"
                >
                  {copied ? <><CheckCircle className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: 'Join me on CryptoMentorship', text: 'Check out this platform!', url: summary.shortLink }).catch(() => copyToClipboard(summary.shortLink))
                    } else {
                      copyToClipboard(summary.shortLink)
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1a1815] text-[var(--text-muted)] hover:text-[var(--text-strong)] border border-[var(--border-subtle)] transition-colors"
                >
                  <Share2 className="w-3 h-3" /> Share
                </button>
              </div>
            </div>

            {/* Slug */}
            <div>
              {!isEditingSlug ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[var(--text-muted)]">Slug:</span>
                  <code className="font-mono text-[var(--text-strong)]">{currentSlug || summary.referralCode}</code>
                  <button
                    onClick={() => { setNewSlug(currentSlug || ''); setIsEditingSlug(true) }}
                    className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[#1a1815] transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--text-muted)]">Slug:</span>
                  <input
                    type="text"
                    value={newSlug}
                    onChange={e => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="custom-slug"
                    disabled={isSavingSlug}
                    className="px-2 py-1 text-sm border border-[var(--border-subtle)] rounded-lg bg-transparent text-[var(--text-strong)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--gold-400)]"
                  />
                  <button onClick={handleSaveSlug} disabled={isSavingSlug || !newSlug.trim()} className="p-1.5 rounded text-emerald-400 hover:bg-emerald-500/15 transition-colors disabled:opacity-40">
                    {isSavingSlug ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => { setIsEditingSlug(false); setNewSlug('') }} className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[#1a1815] transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Signups', value: summary.stats.totalSignups, icon: Users, color: 'text-[var(--gold-400)]' },
                { label: 'Qualified', value: summary.stats.qualified, icon: CheckCircle, color: 'text-blue-400' },
                { label: 'Payable', value: summary.stats.payable, icon: Clock, color: 'text-amber-400' },
                { label: 'Paid', value: `$${(summary.stats.paidTotalCents / 100).toFixed(2)}`, icon: DollarSign, color: 'text-emerald-400' },
              ].map(stat => (
                <div key={stat.label} className="p-3 rounded-lg bg-[#141210] border border-[var(--border-subtle)] text-center">
                  <stat.icon className={`w-5 h-5 mx-auto mb-1.5 ${stat.color}`} />
                  <p className="text-xl font-bold text-[var(--text-strong)]">{stat.value}</p>
                  <p className="text-xs text-[var(--text-muted)]">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Referral table */}
            {referrals.length > 0 && (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-left text-xs text-[var(--text-muted)]">
                      <th className="py-2 px-2">Referred</th>
                      <th className="py-2 px-2">Signed Up</th>
                      <th className="py-2 px-2">Status</th>
                      <th className="py-2 px-2">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map(ref => (
                      <tr key={ref.id} className="border-b border-[var(--border-subtle)]">
                        <td className="py-2.5 px-2">
                          <span className="font-medium text-[var(--text-strong)]">{ref.referredName || ref.referredEmail || 'Pending'}</span>
                        </td>
                        <td className="py-2.5 px-2 text-[var(--text-muted)]">
                          {ref.signedUpAt ? format(new Date(ref.signedUpAt), 'MMM d, yyyy') : '--'}
                        </td>
                        <td className="py-2.5 px-2">
                          <Badge variant={ref.status === 'PAID' ? 'default' : ref.status === 'PAYABLE' ? 'outline' : 'secondary'}>
                            {ref.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-2 text-[var(--text-muted)]">
                          {ref.commissionAmountCents !== null ? `$${(ref.commissionAmountCents / 100).toFixed(2)}` : '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {referrals.length === 0 && (
              <p className="text-xs text-[var(--text-muted)]">
                Share your referral link to start tracking signups and commissions.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ═══ NOTIFICATIONS ═══ */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-strong)] mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-[var(--text-muted)]" />
          Notifications
        </h2>
        <NotificationPreferences />
      </div>
    </div>
  )
}
