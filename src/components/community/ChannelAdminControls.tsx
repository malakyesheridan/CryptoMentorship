'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit2, Trash2, X, GripVertical } from 'lucide-react'
import { json } from '@/lib/http'
import { toast } from 'sonner'
import type { Channel } from '@/lib/community/types'

interface ChannelAdminControlsProps {
  channels: Channel[]
  isAdmin: boolean
  onChannelChange: () => void
}

export function ChannelAdminControls({ channels, isAdmin, onChannelChange }: ChannelAdminControlsProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [draggedChannelId, setDraggedChannelId] = useState<string | null>(null)
  const [draggedOverChannelId, setDraggedOverChannelId] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null)

  if (!isAdmin) return null

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsLoading(true)
    try {
      const requestBody = {
        name: formData.name.trim(),
        ...(formData.description.trim() && { description: formData.description.trim() }),
      }
      
      console.log('Creating channel with body:', requestBody)
      
      // json() helper already parses JSON and throws on error
      const data = await json<{ ok: boolean; item?: any; message?: string; errors?: any[] }>('/api/community/channels', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      console.log('Channel creation response:', data)
      console.log('Response ok?', data?.ok)
      console.log('Response item:', data?.item)

      if (data && data.ok) {
        toast.success('Channel created successfully')
        setFormData({ name: '', description: '' })
        setShowCreateForm(false)
        // Force refresh channels list
        onChannelChange()
        // Also wait a bit and refresh again to ensure cache is cleared
        setTimeout(() => {
          onChannelChange()
        }, 500)
      } else {
        throw new Error(data?.message || 'Failed to create channel')
      }
    } catch (error) {
      console.error('Channel creation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(errorMessage || 'Failed to create channel')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingChannel || !formData.name.trim()) return

    setIsLoading(true)
    try {
      // json() helper already parses JSON and throws on error
      const data = await json<{ ok: boolean; item?: any; message?: string }>(`/api/community/channels?channelId=${editingChannel.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        }),
      })

      if (data.ok) {
        toast.success('Channel updated successfully')
        setFormData({ name: '', description: '' })
        setEditingChannel(null)
        onChannelChange()
      } else {
        throw new Error(data.message || 'Failed to update channel')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Update error:', error)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (channelId: string) => {
    if (!confirm('Are you sure you want to delete this channel? All messages will be deleted.')) {
      return
    }

    setIsLoading(true)
    try {
      // json() helper already parses JSON and throws on error
      const data = await json<{ ok: boolean; message?: string }>(`/api/community/channels?channelId=${channelId}`, {
        method: 'DELETE',
      })

      if (data.ok) {
        toast.success('Channel deleted successfully')
        onChannelChange()
      } else {
        throw new Error(data.message || 'Failed to delete channel')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete channel'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const startEdit = (channel: Channel) => {
    setEditingChannel(channel)
    setFormData({
      name: channel.name,
      description: channel.description || '',
    })
    setShowCreateForm(false)
  }

  const cancelEdit = () => {
    setEditingChannel(null)
    setFormData({ name: '', description: '' })
  }

  const handleDragStart = (e: React.DragEvent, channelId: string) => {
    setDraggedChannelId(channelId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.dropEffect = 'move'
    // Add visual feedback by making the dragged element semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }

  const handleDragOver = (e: React.DragEvent, channelId: string) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    
    if (channelId !== draggedChannelId) {
      setDraggedOverChannelId(channelId)
      
      // Calculate drop position based on mouse Y position relative to the element
      const rect = e.currentTarget.getBoundingClientRect()
      const y = e.clientY - rect.top
      const height = rect.height
      const midpoint = height / 2
      
      // If mouse is in top half, drop before; bottom half, drop after
      const position = y < midpoint ? 'before' : 'after'
      setDropPosition(position)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving the element (not just moving to a child)
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDraggedOverChannelId(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, targetChannelId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    const currentDropPosition = dropPosition || 'before' // Default to 'before' if not set

    if (!draggedChannelId || draggedChannelId === targetChannelId) {
      setDraggedChannelId(null)
      setDraggedOverChannelId(null)
      setDropPosition(null)
      return
    }

    // Get current channel order
    const sortedChannels = [...channels].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const draggedIndex = sortedChannels.findIndex(c => c.id === draggedChannelId)
    const targetIndex = sortedChannels.findIndex(c => c.id === targetChannelId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedChannelId(null)
      setDraggedOverChannelId(null)
      setDropPosition(null)
      return
    }

    // Calculate new order
    const newChannels = [...sortedChannels]
    const [removed] = newChannels.splice(draggedIndex, 1)
    
    // Calculate insertion index based on drop position
    let insertIndex = targetIndex
    if (currentDropPosition === 'after') {
      insertIndex = targetIndex + 1
      // Adjust if we removed an item before the target
      if (draggedIndex < targetIndex) {
        insertIndex = targetIndex // Target index is already correct after splice
      }
    } else {
      // 'before' position
      insertIndex = targetIndex
      // Adjust if we removed an item after the target
      if (draggedIndex > targetIndex) {
        insertIndex = targetIndex // Target index is already correct after splice
      }
    }
    
    newChannels.splice(insertIndex, 0, removed)

    // Extract channel IDs in new order
    const channelIds = newChannels.map(c => c.id)

    // Optimistic update: immediately update local state
    // The parent component will refresh, but this gives instant feedback
    setIsLoading(true)
    setDraggedChannelId(null)
    setDraggedOverChannelId(null)
    setDropPosition(null)
    
    try {
      const data = await json<{ success: boolean }>('/api/admin/channels/reorder', {
        method: 'POST',
        body: JSON.stringify({ channelIds }),
      })

      if (data.success) {
        toast.success('Channels reordered successfully')
        // Force immediate refresh with cache bypass
        // Wait a small delay to ensure database transaction is committed
        setTimeout(() => {
          onChannelChange()
          // Force another refresh after a short delay to ensure cache is cleared
          setTimeout(() => {
            onChannelChange()
          }, 200)
        }, 100)
      } else {
        throw new Error('Failed to reorder channels')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reorder channels'
      toast.error(errorMessage)
      // Refresh to get correct order on error
      onChannelChange()
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset opacity
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
    setDraggedChannelId(null)
    setDraggedOverChannelId(null)
    setDropPosition(null)
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">Admin Controls</h4>
        {!showCreateForm && !editingChannel && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowCreateForm(true)
              setEditingChannel(null)
              setFormData({ name: '', description: '' })
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Channel
          </Button>
        )}
      </div>

      {(showCreateForm || editingChannel) && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h5 className="font-medium text-slate-900">
              {editingChannel ? 'Edit Channel' : 'Create Channel'}
            </h5>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCreateForm(false)
                cancelEdit()
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form onSubmit={editingChannel ? handleUpdate : handleCreate} className="space-y-3">
            <div>
              <Label htmlFor="channel-name">Channel Name</Label>
              <Input
                id="channel-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., General Discussion"
                required
                disabled={isLoading}
                maxLength={100}
              />
              <p className="text-xs text-slate-500 mt-1">
                Channel name can be any name (1-100 characters)
              </p>
            </div>
            <div>
              <Label htmlFor="channel-description">Description (optional)</Label>
              <Textarea
                id="channel-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Channel description..."
                rows={2}
                disabled={isLoading}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading} size="sm">
                {editingChannel ? 'Update' : 'Create'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false)
                  cancelEdit()
                }}
                disabled={isLoading}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-1">
        {[...channels].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((channel, index) => (
          <div key={channel.id} className="relative">
            {/* Drop indicator line BEFORE channel - shows when dragging over this channel's top half OR previous channel's bottom */}
            {((draggedOverChannelId === channel.id && dropPosition === 'before') ||
              (index > 0 && draggedOverChannelId === channels.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[index - 1]?.id && dropPosition === 'after')) && (
              <div className="h-1.5 bg-blue-500 rounded-full mb-2 mx-2 shadow-lg z-10" style={{ boxShadow: '0 0 8px rgba(59, 130, 246, 0.6)' }} />
            )}
            
            <div
              draggable={!isLoading}
              onDragStart={(e) => handleDragStart(e, channel.id)}
              onDragOver={(e) => handleDragOver(e, channel.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, channel.id)}
              onDragEnd={handleDragEnd}
              className={`flex items-center justify-between p-3 rounded-lg transition-all duration-150 relative ${
                draggedChannelId === channel.id
                  ? 'opacity-40 bg-slate-200 scale-95 cursor-grabbing'
                  : draggedOverChannelId === channel.id
                  ? dropPosition === 'before'
                    ? 'bg-blue-50 border-t-4 border-blue-500 border-b-2 border-blue-200'
                    : 'bg-blue-50 border-b-4 border-blue-500 border-t-2 border-blue-200'
                  : 'hover:bg-slate-50 border-2 border-transparent'
              } ${isLoading ? 'pointer-events-none opacity-50' : 'cursor-grab active:cursor-grabbing'}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <GripVertical className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900">#{channel.name}</div>
                  {channel.description && (
                    <div className="text-xs text-slate-500 truncate">{channel.description}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    startEdit(channel)
                  }}
                  disabled={isLoading}
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(channel.id)
                  }}
                  disabled={isLoading}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {/* Drop indicator line AFTER channel - shows when dragging over this channel's bottom half */}
            {draggedOverChannelId === channel.id && dropPosition === 'after' && index === channels.length - 1 && (
              <div className="h-1.5 bg-blue-500 rounded-full mt-2 mx-2 shadow-lg z-10" style={{ boxShadow: '0 0 8px rgba(59, 130, 246, 0.6)' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

