'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Save, Send } from 'lucide-react'
import { toast } from 'sonner'
import { json } from '@/lib/http'

interface StrategySnapshot {
  id: string
  date: string
  equityValue: string
  dominantAsset: string | null
}

interface StrategyUpdate {
  id: string
  date: string
  updateType: string
  commentaryText: string | null
  notify: boolean
  createdAt: string
}

interface StrategyDetail {
  id: string
  name: string
  slug: string
  description: string | null
  type: string
  configJson: string | null
  isActive: boolean
  sortOrder: number
  snapshots: StrategySnapshot[]
  updates: StrategyUpdate[]
}

export default function AdminStrategyEditPage() {
  const params = useParams()
  const router = useRouter()
  const strategyId = params.id as string

  const [strategy, setStrategy] = useState<StrategyDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSendingCommentary, setIsSendingCommentary] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [configJson, setConfigJson] = useState('')

  // Commentary form
  const [commentaryText, setCommentaryText] = useState('')
  const [notifyUsers, setNotifyUsers] = useState(false)

  const fetchStrategy = useCallback(async () => {
    try {
      const data = await json<StrategyDetail>(`/api/admin/strategies/${strategyId}`)
      setStrategy(data)
      setName(data.name)
      setDescription(data.description || '')
      setIsActive(data.isActive)
      setConfigJson(data.configJson || '')
    } catch (error) {
      console.error('Error fetching strategy:', error)
      toast.error('Failed to load strategy')
    } finally {
      setIsLoading(false)
    }
  }, [strategyId])

  useEffect(() => {
    fetchStrategy()
  }, [fetchStrategy])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await json(`/api/admin/strategies/${strategyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, isActive, configJson }),
      })
      toast.success('Strategy updated')
    } catch (error) {
      console.error('Error saving strategy:', error)
      toast.error('Failed to save strategy')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCommentary = async () => {
    if (!commentaryText.trim()) {
      toast.error('Commentary text is required')
      return
    }
    setIsSendingCommentary(true)
    try {
      await json(`/api/admin/strategies/${strategyId}/commentary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentaryText, notify: notifyUsers }),
      })
      toast.success('Commentary published')
      setCommentaryText('')
      setNotifyUsers(false)
      await fetchStrategy()
    } catch (error) {
      console.error('Error sending commentary:', error)
      toast.error('Failed to publish commentary')
    } finally {
      setIsSendingCommentary(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--text-strong)] mx-auto" />
          <p className="text-[var(--text-muted)] mt-2">Loading strategy...</p>
        </div>
      </div>
    )
  }

  if (!strategy) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--text-muted)]">Strategy not found</p>
        <Link href="/admin/strategies" className="text-[var(--gold-400)] hover:underline mt-2 inline-block">
          Back to strategies
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/strategies">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="heading-hero text-3xl sm:text-4xl mb-1">
            <span>Edit</span> <span className="gold">{strategy.name}</span>
          </h1>
          <p className="subhead">
            {strategy.type.replace('_', ' ')} &middot; /{strategy.slug}
          </p>
        </div>
      </div>

      {/* Metadata Form */}
      <Card className="card">
        <CardHeader>
          <CardTitle className="heading-2">Strategy Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-strong)] mb-2">
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Strategy name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-strong)] mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Strategy description..."
              rows={3}
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-2 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-400)]"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-[var(--text-strong)]">Active</label>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActive ? 'bg-green-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-strong)] mb-2">
              Config JSON
            </label>
            <textarea
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              placeholder='{"param": "value"}'
              rows={5}
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-2 text-sm font-mono text-[var(--text-strong)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-400)]"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Push Commentary */}
      <Card className="card">
        <CardHeader>
          <CardTitle className="heading-2">Push Commentary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-strong)] mb-2">
              Commentary Text
            </label>
            <textarea
              value={commentaryText}
              onChange={(e) => setCommentaryText(e.target.value)}
              placeholder="Write your strategy commentary..."
              rows={4}
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-2 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-400)]"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="notify-users"
              checked={notifyUsers}
              onChange={(e) => setNotifyUsers(e.target.checked)}
              className="rounded border-[var(--border-subtle)]"
            />
            <label htmlFor="notify-users" className="text-sm text-[var(--text-strong)]">
              Notify subscribed users via email
            </label>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleCommentary} disabled={isSendingCommentary}>
              <Send className="h-4 w-4 mr-2" />
              {isSendingCommentary ? 'Publishing...' : 'Publish Commentary'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Snapshots */}
      <Card className="card">
        <CardHeader>
          <CardTitle className="heading-2">Recent Snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          {strategy.snapshots.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No snapshots yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-[var(--text-muted)]">
                  <tr>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Equity Value</th>
                    <th className="py-2">Dominant Asset</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {strategy.snapshots.map((snap) => (
                    <tr key={snap.id} className="text-[var(--text-strong)]">
                      <td className="py-2 pr-4">
                        {new Date(snap.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-2 pr-4 font-mono">
                        ${Number(snap.equityValue).toLocaleString()}
                      </td>
                      <td className="py-2">{snap.dominantAsset || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Updates */}
      <Card className="card">
        <CardHeader>
          <CardTitle className="heading-2">Recent Updates</CardTitle>
        </CardHeader>
        <CardContent>
          {strategy.updates.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No updates yet</p>
          ) : (
            <div className="space-y-3">
              {strategy.updates.map((update) => (
                <div
                  key={update.id}
                  className="border border-[var(--border-subtle)] rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium uppercase text-[var(--text-muted)]">
                      {update.updateType.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(update.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  {update.commentaryText && (
                    <p className="text-sm text-[var(--text-strong)]">{update.commentaryText}</p>
                  )}
                  {update.notify && (
                    <span className="inline-flex mt-1 rounded-full bg-blue-900/30 text-blue-400 px-2 py-0.5 text-xs">
                      Notified
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
