'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Send, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { z } from 'zod'

const notificationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  body: z.string().max(1000, 'Body must be 1000 characters or less').optional(),
  url: z.string().url('Invalid URL').optional().or(z.literal('')),
  type: z.enum(['announcement', 'portfolio_update', 'crypto_compass', 'learning_hub', 'community_mention', 'community_reply']),
})

type NotificationFormData = z.infer<typeof notificationSchema>

interface CreateNotificationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateNotificationModal({ isOpen, onClose, onSuccess }: CreateNotificationModalProps) {
  const [formData, setFormData] = useState<NotificationFormData>({
    title: '',
    body: '',
    url: '',
    type: 'announcement',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [mounted, setMounted] = useState(false)

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsSubmitting(true)

    try {
      // Validate form data
      const validated = notificationSchema.parse({
        ...formData,
        url: formData.url?.trim() || undefined,
        body: formData.body?.trim() || undefined,
      })

      // Send to API
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create notification')
      }

      toast.success(data.message || 'Notification sent successfully!')
      
      // Reset form
      setFormData({
        title: '',
        body: '',
        url: '',
        type: 'announcement',
      })
      
      onSuccess?.()
      onClose()
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message
          }
        })
        setErrors(fieldErrors)
        toast.error('Please fix the form errors')
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to create notification')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: keyof NotificationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto min-h-screen"
      onClick={onClose}
    >
      <Card 
        className="card w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] my-auto overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Notification
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="announcement">Announcement</option>
                <option value="portfolio_update">Portfolio Update</option>
                <option value="crypto_compass">Crypto Compass</option>
                <option value="learning_hub">Learning Hub</option>
                <option value="community_mention">Community Mention</option>
                <option value="community_reply">Community Reply</option>
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Enter notification title"
                maxLength={200}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent ${
                  errors.title ? 'border-red-300' : 'border-slate-300'
                }`}
                required
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                {formData.title.length}/200 characters
              </p>
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Body (Optional)
              </label>
              <textarea
                value={formData.body}
                onChange={(e) => handleChange('body', e.target.value)}
                placeholder="Enter notification body/message"
                maxLength={1000}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent ${
                  errors.body ? 'border-red-300' : 'border-slate-300'
                }`}
              />
              {errors.body && (
                <p className="mt-1 text-sm text-red-600">{errors.body}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                {formData.body?.length || 0}/1000 characters
              </p>
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                URL (Optional)
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => handleChange('url', e.target.value)}
                placeholder="https://example.com/page"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent ${
                  errors.url ? 'border-red-300' : 'border-slate-300'
                }`}
              />
              {errors.url && (
                <p className="mt-1 text-sm text-red-600">{errors.url}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Users will be able to click the notification to navigate to this URL
              </p>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Notification Recipients
                  </p>
                  <p className="text-sm text-blue-700">
                    This notification will be sent to all active users (members, editors, and admins).
                    It will appear in their notification bell and be marked as unread until they view it.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-yellow-500 hover:bg-yellow-600"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Notification
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )

  // Render modal using portal to escape parent positioning context
  return createPortal(modalContent, document.body)
}

