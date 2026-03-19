'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Save } from 'lucide-react'
import { createSection, updateSection } from '@/lib/actions/learning'
import { toast } from 'sonner'

interface SectionFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trackId: string
  section?: {
    id: string
    title: string
    summary?: string | null
  }
  onSuccess: () => void
}

export function SectionFormModal({ open, onOpenChange, trackId, section, onSuccess }: SectionFormModalProps) {
  const isEdit = !!section
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
  })

  useEffect(() => {
    if (open && section) {
      setFormData({
        title: section.title,
        summary: section.summary || '',
      })
    } else if (open) {
      setFormData({ title: '', summary: '' })
    }
  }, [open, section])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (isEdit && section) {
        await updateSection(section.id, {
          title: formData.title,
          summary: formData.summary || undefined,
        })
        toast.success('Section updated')
      } else {
        await createSection({
          trackId,
          title: formData.title,
          summary: formData.summary || undefined,
        })
        toast.success('Section created')
      }
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || `Failed to ${isEdit ? 'update' : 'create'} section`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg mx-4">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Section' : 'Create Section'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update section details' : 'Add a new section to organize lessons'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="section-title">
              Section Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="section-title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Introduction to Cryptocurrency"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="section-summary">Summary</Label>
            <Textarea
              id="section-summary"
              value={formData.summary}
              onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="Brief description of what this section covers..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.title.trim()}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Section' : 'Create Section')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
