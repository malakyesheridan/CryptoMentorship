'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/SectionHeader'
import { Calendar, Save, Eye, Copy, Trash2, Plus, X, Users } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface EventFormData {
  title: string
  slug: string
  summary: string
  description: string
  startAt: string
  endAt: string
  timezone: string
  visibility: string
  locationType: string
  locationText: string
  joinUrl: string
  capacity: string
  hostUserId: string
  recordingUrl: string
  resources: Array<{ title: string; url: string }>
}

interface AdminEventFormProps {
  event?: any
  isEdit?: boolean
}

export default function NewEventPage() {
  return <AdminEventForm isEdit={false} />
}
function AdminEventForm({ event, isEdit = false }: AdminEventFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<EventFormData>({
    title: event?.title || '',
    slug: event?.slug || '',
    summary: event?.summary || '',
    description: event?.description || '',
    startAt: event?.startAt ? new Date(event.startAt).toISOString().slice(0, 16) : '',
    endAt: event?.endAt ? new Date(event.endAt).toISOString().slice(0, 16) : '',
    timezone: event?.timezone || 'UTC',
    visibility: event?.visibility || 'member',
    locationType: event?.locationType || 'online',
    locationText: event?.locationText || '',
    joinUrl: event?.joinUrl || '',
    capacity: event?.capacity?.toString() || '',
    hostUserId: event?.hostUserId || '',
    recordingUrl: event?.recordingUrl || '',
    resources: event?.resources || []
  })

  // Auto-generate slug from title
  useEffect(() => {
    if (!isEdit && formData.title) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      setFormData(prev => ({ ...prev, slug }))
    }
  }, [formData.title, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        startAt: new Date(formData.startAt).toISOString(),
        endAt: new Date(formData.endAt).toISOString(),
      }

      const url = isEdit ? `/api/admin/events/${event.id}` : '/api/admin/events'
      const method = isEdit ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error('Failed to save event')
      }

      const result = await response.json()
      toast.success(isEdit ? 'Event updated successfully' : 'Event created successfully')
      router.push(`/admin/events/${result.id}`)
    } catch (error) {
      toast.error('Failed to save event')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/events/${event.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete event')
      }

      toast.success('Event deleted successfully')
      router.push('/admin/events')
    } catch (error) {
      toast.error('Failed to delete event')
    } finally {
      setLoading(false)
    }
  }

  const addResource = () => {
    setFormData(prev => ({
      ...prev,
      resources: [...prev.resources, { title: '', url: '' }]
    }))
  }

  const removeResource = (index: number) => {
    setFormData(prev => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== index)
    }))
  }

  const updateResource = (index: number, field: 'title' | 'url', value: string) => {
    setFormData(prev => ({
      ...prev,
      resources: prev.resources.map((resource, i) => 
        i === index ? { ...resource, [field]: value } : resource
      )
    }))
  }

  return (
    <div className="container-main section-padding">
      <SectionHeader 
        title={isEdit ? 'Edit Event' : 'Create New Event'}
        subtitle={isEdit ? 'Update event details and settings' : 'Set up a new live session or event'}
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter event title"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="slug">URL Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="event-url-slug"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    URL: /events/{formData.slug}
                  </p>
                </div>

                <div>
                  <Label htmlFor="summary">Summary</Label>
                  <Textarea
                    id="summary"
                    value={formData.summary}
                    onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                    placeholder="Brief description for event cards"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Full event description (supports Markdown)"
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Date & Time */}
            <Card>
              <CardHeader>
                <CardTitle>Date & Time</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startAt">Start Date & Time *</Label>
                    <Input
                      id="startAt"
                      type="datetime-local"
                      value={formData.startAt}
                      onChange={(e) => setFormData(prev => ({ ...prev, startAt: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endAt">End Date & Time *</Label>
                    <Input
                      id="endAt"
                      type="datetime-local"
                      value={formData.endAt}
                      onChange={(e) => setFormData(prev => ({ ...prev, endAt: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={formData.timezone} 
                    onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                    <option value="Australia/Sydney">Sydney</option>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="locationType">Location Type</Label>
                  <Select 
                    value={formData.locationType} 
                    onChange={(e) => setFormData(prev => ({ ...prev, locationType: e.target.value }))}
                  >
                    <option value="online">Online</option>
                    <option value="in_person">In Person</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="locationText">Location Details</Label>
                  <Input
                    id="locationText"
                    value={formData.locationText}
                    onChange={(e) => setFormData(prev => ({ ...prev, locationText: e.target.value }))}
                    placeholder={formData.locationType === 'online' ? 'Zoom, Google Meet, etc.' : 'Address or venue name'}
                  />
                </div>

                {formData.locationType === 'online' && (
                  <div>
                    <Label htmlFor="joinUrl">Join URL</Label>
                    <Input
                      id="joinUrl"
                      value={formData.joinUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, joinUrl: e.target.value }))}
                      placeholder="https://zoom.us/j/..."
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Post-Event Resources */}
            <Card>
              <CardHeader>
                <CardTitle>Post-Event Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="recordingUrl">Recording URL</Label>
                  <Input
                    id="recordingUrl"
                    value={formData.recordingUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, recordingUrl: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Additional Resources</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addResource}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Resource
                    </Button>
                  </div>
                  
                  {formData.resources.map((resource, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                      <Input
                        placeholder="Resource title"
                        value={resource.title}
                        onChange={(e) => updateResource(index, 'title', e.target.value)}
                      />
                      <Input
                        placeholder="Resource URL"
                        value={resource.url}
                        onChange={(e) => updateResource(index, 'url', e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeResource(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select 
                    value={formData.visibility} 
                    onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value }))}
                  >
                    <option value="public">Public</option>
                    <option value="member">Members Only</option>
                    <option value="admin">Admin Only</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                    placeholder="Leave empty for unlimited"
                    min="1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : (isEdit ? 'Update Event' : 'Create Event')}
                </Button>

                {isEdit && (
                  <>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/events/${event.slug}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Event
                      </Link>
                    </Button>

                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/admin/events/${event.id}/attendees`}>
                        <Users className="h-4 w-4 mr-2" />
                        View Attendees
                      </Link>
                    </Button>

                    <Button variant="outline" className="w-full">
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate Event
                    </Button>

                    <Button 
                      variant="outline" 
                      className="w-full text-red-600 hover:text-red-700"
                      onClick={handleDelete}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Event
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
