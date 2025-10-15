'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { json } from '@/lib/http'
import type { CreateChannelBody, CreateChannelResponse } from '@/lib/community/types'

export function ChannelForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsLoading(true)
    try {
      const response = await json<CreateChannelResponse>('/api/community/channels', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        } as CreateChannelBody),
      })

      if (response.ok) {
        router.push('/admin/community')
        router.refresh()
      } else {
        throw new Error('Failed to create channel')
      }
    } catch (error) {
      console.error('Error creating channel:', error)
      // TODO: Add proper error handling/toast
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Channel Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., General Discussion"
          required
          disabled={isLoading}
        />
        <p className="text-xs text-slate-500">
          This will be displayed as #{formData.name || 'channel-name'}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optional description for this channel..."
          rows={3}
          disabled={isLoading}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="btn-gold" disabled={isLoading || !formData.name.trim()}>
          {isLoading ? 'Creating...' : 'Create Channel'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
