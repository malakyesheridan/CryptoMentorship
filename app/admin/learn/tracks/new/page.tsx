'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { DbHealthBanner } from '@/components/admin/learning/DbHealthBanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BookOpen,
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { PdfAttachmentsField } from '@/components/learning/PdfAttachmentsField'
import type { PdfResource } from '@/lib/learning/resources'

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error'

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function createRequestId() {
  return `track_create_${nanoid(10)}`
}

export default function NewTrackPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [slugSuggestion, setSlugSuggestion] = useState<string | null>(null)
  const [isSlugDirty, setIsSlugDirty] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    summary: '',
    coverUrl: '',
    pdfResources: [] as PdfResource[],
    minTier: 'member' as 'guest' | 'member' | 'editor' | 'admin',
    publishedAt: '',
  })

  const slugHint = useMemo(() => {
    if (!formData.slug) return null
    if (slugStatus === 'checking') return 'Checking slug availability...'
    if (slugStatus === 'available') return 'Available'
    if (slugStatus === 'taken') return 'Taken'
    if (slugStatus === 'invalid') return 'Slug must include letters or numbers'
    if (slugStatus === 'error') return 'Unable to validate slug right now'
    return null
  }, [formData.slug, slugStatus])

  useEffect(() => {
    const slug = normalizeSlug(formData.slug)
    if (!slug) {
      setSlugStatus(formData.slug ? 'invalid' : 'idle')
      setSlugSuggestion(null)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        setSlugStatus('checking')
        const response = await fetch(
          `/api/admin/learning-tracks/slug-available?slug=${encodeURIComponent(slug)}`,
          { cache: 'no-store', signal: controller.signal }
        )
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          setSlugStatus('error')
          setSlugSuggestion(null)
          return
        }
        if (payload?.available) {
          setSlugStatus('available')
          setSlugSuggestion(null)
          return
        }
        setSlugStatus('taken')
        setSlugSuggestion(typeof payload?.suggestion === 'string' ? payload.suggestion : null)
      } catch {
        if (!controller.signal.aborted) {
          setSlugStatus('error')
          setSlugSuggestion(null)
        }
      }
    }, 350)

    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [formData.slug])

  const handleInputChange = (field: string, value: string) => {
    setErrorMessage('')
    setFormData((prev) => {
      if (field === 'title') {
        const nextTitle = value
        if (!isSlugDirty) {
          return { ...prev, title: nextTitle, slug: normalizeSlug(nextTitle) }
        }
        return { ...prev, title: nextTitle }
      }

      if (field === 'slug') {
        const normalized = normalizeSlug(value)
        return { ...prev, slug: normalized }
      }

      return { ...prev, [field]: value }
    })
  }

  const runDbHealthCheck = async (): Promise<{ ok: true } | { ok: false; message: string }> => {
    try {
      const response = await fetch('/api/health/db', { method: 'GET', cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (response.ok && payload?.ok) {
        return { ok: true }
      }
      return {
        ok: false,
        message:
          typeof payload?.message === 'string'
            ? payload.message
            : 'Database temporarily unreachable. Try again in 30 seconds.',
      }
    } catch {
      return {
        ok: false,
        message: 'Database health check failed. Please try again in 30 seconds.',
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage('')

    const slug = normalizeSlug(formData.slug || formData.title)
    if (!slug) {
      setErrorMessage('Please enter a valid title and slug before creating the track.')
      setIsLoading(false)
      return
    }

    if (slugStatus === 'taken' && slugSuggestion) {
      setFormData((prev) => ({ ...prev, slug: slugSuggestion }))
      setErrorMessage(`Slug is already taken. Suggested slug applied: ${slugSuggestion}`)
      setIsLoading(false)
      return
    }

    const dbHealth = await runDbHealthCheck()
    if (!dbHealth.ok) {
      setErrorMessage(dbHealth.message)
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/admin/learning-tracks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          slug,
          summary: formData.summary,
          coverUrl: formData.coverUrl || undefined,
          pdfResources: formData.pdfResources,
          minTier: formData.minTier,
          publishedAt: formData.publishedAt ? new Date(formData.publishedAt).toISOString() : undefined,
          requestId: createRequestId(),
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        if (response.status === 409 && payload?.error === 'slug_taken') {
          const suggestion = typeof payload?.suggestion === 'string' ? payload.suggestion : null
          if (suggestion) {
            setFormData((prev) => ({ ...prev, slug: suggestion }))
            setSlugSuggestion(suggestion)
            setSlugStatus('taken')
            setErrorMessage(`Slug is already taken. Suggested slug applied: ${suggestion}`)
          } else {
            setErrorMessage('Slug already exists. Please choose a different slug.')
          }
          return
        }

        const message =
          typeof payload?.message === 'string'
            ? payload.message
            : 'Track creation failed. Please try again.'
        setErrorMessage(message)
        return
      }

      if (!payload?.success || !payload?.track?.id) {
        setErrorMessage('Track creation failed. Please try again.')
        return
      }

      router.push(`/admin/learn/tracks/${payload.track.id}`)
    } catch {
      setErrorMessage('Track creation failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1815]">
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1 p-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8">
              <div className="mb-4 flex items-center gap-4">
                <Link href="/admin/learn/tracks">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Tracks
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-[var(--text-strong)]">Create New Track</h1>
                  <p className="mt-2 text-[var(--text-strong)]">Design a structured learning path for your students</p>
                </div>
              </div>
            </div>

            <DbHealthBanner />

            {errorMessage && (
              <div className="mb-6 rounded-md border border-[#c03030] bg-[#2e1a1a] px-4 py-3 text-sm text-[#c03030]">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-gold-600" />
                    Basic Information
                  </CardTitle>
                  <CardDescription>Set up the basic details for your learning track</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--text-strong)]">Track Title *</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="e.g., Foundations of Cryptocurrency Trading"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--text-strong)]">URL Slug *</label>
                    <Input
                      value={formData.slug}
                      onChange={(e) => {
                        setIsSlugDirty(true)
                        handleInputChange('slug', e.target.value)
                      }}
                      placeholder="e.g., crypto-trading-foundations"
                      required
                    />
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <span className="text-[var(--text-muted)]">This will be the URL: /learn/{formData.slug || 'track-slug'}</span>
                      {slugHint && (
                        <span
                          className={
                            slugStatus === 'available'
                              ? 'text-green-700'
                              : slugStatus === 'taken' || slugStatus === 'invalid'
                              ? 'text-[#c03030]'
                              : 'text-[var(--text-muted)]'
                          }
                        >
                          {slugStatus === 'available' && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}
                          {slugHint}
                        </span>
                      )}
                    </div>
                    {slugStatus === 'taken' && slugSuggestion && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          setIsSlugDirty(true)
                          setFormData((prev) => ({ ...prev, slug: slugSuggestion }))
                          setErrorMessage('')
                        }}
                      >
                        Use suggestion: {slugSuggestion}
                      </Button>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--text-strong)]">Summary</label>
                    <textarea
                      value={formData.summary}
                      onChange={(e) => handleInputChange('summary', e.target.value)}
                      placeholder="Brief description of what students will learn..."
                      className="w-full rounded-md border border-[var(--border-subtle)] px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-gold-500"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--text-strong)]">Cover Image URL</label>
                    <Input
                      value={formData.coverUrl}
                      onChange={(e) => handleInputChange('coverUrl', e.target.value)}
                      placeholder="https://example.com/cover-image.jpg"
                      type="url"
                    />
                    {formData.coverUrl && (
                      <div className="mt-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={formData.coverUrl}
                          alt="Cover preview"
                          className="h-32 w-full rounded-md border object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <PdfAttachmentsField
                    label="Track PDFs"
                    helperText="Upload PDFs to share with students on the track page."
                    value={formData.pdfResources}
                    onChange={(next) => setFormData((prev) => ({ ...prev, pdfResources: next }))}
                    folder="learning/track-pdfs"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gold-600" />
                    Access & Publishing
                  </CardTitle>
                  <CardDescription>Control who can access this track and when it&apos;s published</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--text-strong)]">Minimum Tier Required</label>
                    <select
                      value={formData.minTier}
                      onChange={(e) => handleInputChange('minTier', e.target.value)}
                      className="w-full rounded-md border border-[var(--border-subtle)] px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-gold-500"
                    >
                      <option value="guest">Guest</option>
                      <option value="member">Member</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">Users must have at least this tier to access the track</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--text-strong)]">Publish Date</label>
                    <Input
                      value={formData.publishedAt}
                      onChange={(e) => handleInputChange('publishedAt', e.target.value)}
                      type="datetime-local"
                    />
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Leave empty to save as draft. Set a future date to schedule publishing.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button type="submit" disabled={isLoading || slugStatus === 'checking'} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {isLoading ? 'Creating...' : 'Create Track'}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        publishedAt: new Date().toISOString().slice(0, 16)
                      }))
                    }}
                    className="flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Publish Now
                  </Button>
                </div>

                <div className="text-sm text-[var(--text-muted)]">
                  {formData.publishedAt ? (
                    <span className="flex items-center gap-1 text-[#4a7c3f]">
                      <Eye className="h-4 w-4" />
                      Will be published
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[#c9a227]">
                      <EyeOff className="h-4 w-4" />
                      Will be saved as draft
                    </span>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

