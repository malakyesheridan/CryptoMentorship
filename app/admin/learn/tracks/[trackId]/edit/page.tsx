'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BookOpen, 
  ArrowLeft, 
  Save, 
  Eye, 
  EyeOff,
  Upload,
  Calendar,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { updateTrack } from '@/lib/actions/learning'
import { toast } from 'sonner'

interface TrackEditPageProps {
  params: {
    trackId: string
  }
}

export default function TrackEditPage({ params }: TrackEditPageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTrack, setIsLoadingTrack] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    summary: '',
    coverUrl: '',
    minTier: 'member' as 'guest' | 'member' | 'editor' | 'admin',
    description: '',
    publishedAt: '',
  })

  useEffect(() => {
    async function fetchTrack() {
      try {
        const res = await fetch(`/api/admin/learn/tracks/${params.trackId}`)
        if (!res.ok) {
          throw new Error('Failed to fetch track')
        }
        const track = await res.json()
        
        setFormData({
          title: track.title || '',
          slug: track.slug || '',
          summary: track.summary || '',
          coverUrl: track.coverUrl || '',
          minTier: track.minTier || 'member',
          description: track.description || '',
          publishedAt: track.publishedAt ? new Date(track.publishedAt).toISOString().slice(0, 16) : '',
        })
      } catch (error) {
        console.error('Error fetching track:', error)
        toast.error('Failed to load track')
      } finally {
        setIsLoadingTrack(false)
      }
    }

    fetchTrack()
  }, [params.trackId])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Auto-generate slug from title if slug is empty
      ...(field === 'title' && !prev.slug && { slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await updateTrack(params.trackId, {
        ...formData,
        publishedAt: formData.publishedAt || undefined,
      })

      if (result.success) {
        toast.success('Track updated successfully')
        router.push(`/admin/learn/tracks/${params.trackId}`)
      }
    } catch (error: any) {
      console.error('Error updating track:', error)
      toast.error(error.message || 'Failed to update track')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingTrack) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex">
          <AdminSidebar />
          <div className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-slate-200 rounded w-1/4"></div>
                <div className="h-64 bg-slate-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <Link href={`/admin/learn/tracks/${params.trackId}`}>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Track
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Edit Track</h1>
                  <p className="text-slate-600 mt-2">
                    Update track information and settings
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-gold-600" />
                    Basic Information
                  </CardTitle>
                  <CardDescription>
                    Set up the basic details for your learning track
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Track Title *
                    </label>
                    <Input
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="e.g., Foundations of Cryptocurrency Trading"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      URL Slug *
                    </label>
                    <Input
                      value={formData.slug}
                      onChange={(e) => handleInputChange('slug', e.target.value)}
                      placeholder="e.g., crypto-trading-foundations"
                      required
                    />
                    <p className="text-sm text-slate-500 mt-1">
                      This will be the URL: /learn/{formData.slug || 'track-slug'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Summary
                    </label>
                    <textarea
                      value={formData.summary}
                      onChange={(e) => handleInputChange('summary', e.target.value)}
                      placeholder="Brief description of what students will learn..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Cover Image URL
                    </label>
                    <Input
                      value={formData.coverUrl}
                      onChange={(e) => handleInputChange('coverUrl', e.target.value)}
                      placeholder="https://example.com/cover-image.jpg"
                      type="url"
                    />
                    {formData.coverUrl && (
                      <div className="mt-2">
                        <img
                          src={formData.coverUrl}
                          alt="Cover preview"
                          className="h-32 w-full object-cover rounded-md border"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Access & Publishing */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gold-600" />
                    Access & Publishing
                  </CardTitle>
                  <CardDescription>
                    Control who can access this track and when it&apos;s published
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Minimum Tier Required
                    </label>
                    <select
                      value={formData.minTier}
                      onChange={(e) => handleInputChange('minTier', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                    >
                      <option value="guest">Guest</option>
                      <option value="member">Member</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <p className="text-sm text-slate-500 mt-1">
                      Users must have at least this tier to access the track
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Publish Date
                    </label>
                    <Input
                      value={formData.publishedAt}
                      onChange={(e) => handleInputChange('publishedAt', e.target.value)}
                      type="datetime-local"
                    />
                    <p className="text-sm text-slate-500 mt-1">
                      Leave empty to save as draft. Set a future date to schedule publishing.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-gold-600" />
                    Track Description
                  </CardTitle>
                  <CardDescription>
                    Detailed description of the track content (supports MDX)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Description (MDX)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Write a detailed description of what students will learn..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                      rows={8}
                    />
                    <p className="text-sm text-slate-500 mt-1">
                      Supports Markdown and MDX components like Callout, Metric, etc.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormData(prev => ({
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

                <div className="text-sm text-slate-500">
                  {formData.publishedAt ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <Eye className="h-4 w-4" />
                      Will be published
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-yellow-600">
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

