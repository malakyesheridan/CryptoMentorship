'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SimpleTrackUpload } from './SimpleTrackUpload'
import { LessonVideoUpload } from './LessonVideoUpload'
import { BookOpen, Upload, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tracks: Array<{ id: string; title: string }>
  onTrackCreated?: () => void
  onVideoUploaded?: () => void
}

type TabType = 'new' | 'existing'

export function UploadModal({ 
  open, 
  onOpenChange, 
  tracks,
  onTrackCreated,
  onVideoUploaded 
}: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('new')
  const [selectedTrackId, setSelectedTrackId] = useState<string>('')
  const [lastCreatedTrack, setLastCreatedTrack] = useState<{
    id: string
    title: string
    slug: string
  } | null>(null)
  const [lastUploadedLessonTitle, setLastUploadedLessonTitle] = useState<string | null>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedTrackId('')
      setActiveTab('new')
      setLastCreatedTrack(null)
      setLastUploadedLessonTitle(null)
    }
  }, [open])

  useEffect(() => {
    if (!lastCreatedTrack) return
    const timeout = setTimeout(() => {
      setLastCreatedTrack(null)
    }, 10000)
    return () => clearTimeout(timeout)
  }, [lastCreatedTrack])

  useEffect(() => {
    if (!lastUploadedLessonTitle) return
    const timeout = setTimeout(() => {
      setLastUploadedLessonTitle(null)
    }, 10000)
    return () => clearTimeout(timeout)
  }, [lastUploadedLessonTitle])

  const handleTrackCreated = (track: { id: string; title: string; slug: string }) => {
    onTrackCreated?.()
    setLastCreatedTrack(track)
    setSelectedTrackId(track.id)
    // Switch to existing tab after track is created so they can upload videos
    setActiveTab('existing')
    // The parent will refresh tracks list
  }

  const handleVideoUploaded = (lessonTitle?: string) => {
    onVideoUploaded?.()
    if (lessonTitle) {
      setLastUploadedLessonTitle(lessonTitle)
    }
    // Don't close modal, just reset the form
    setSelectedTrackId(selectedTrackId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-6 w-6 text-yellow-600" />
            Upload Content
          </DialogTitle>
          <DialogDescription>
            Create a new track or upload videos to an existing track
          </DialogDescription>
        </DialogHeader>

        {lastCreatedTrack && (
          <div className="mb-4 rounded-lg border border-[#1a2e1a] bg-[#1a2e1a] px-4 py-3 text-sm text-[#4a7c3f] flex items-start justify-between gap-4">
            <span>
              Track created: <span className="font-semibold">{lastCreatedTrack.title}</span>
            </span>
            <button
              type="button"
              onClick={() => setLastCreatedTrack(null)}
              className="text-[#4a7c3f] hover:text-[#4a7c3f]"
              aria-label="Dismiss track created confirmation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {lastUploadedLessonTitle && (
          <div className="mb-4 rounded-lg border border-[#1a2e1a] bg-[#1a2e1a] px-4 py-3 text-sm text-[#4a7c3f] flex items-start justify-between gap-4">
            <span>
              Lesson uploaded: <span className="font-semibold">{lastUploadedLessonTitle}</span>
            </span>
            <button
              type="button"
              onClick={() => setLastUploadedLessonTitle(null)}
              className="text-[#4a7c3f] hover:text-[#4a7c3f]"
              aria-label="Dismiss lesson uploaded confirmation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-subtle)] mb-6">
          <button
            onClick={() => setActiveTab('new')}
            className={cn(
              'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'new'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-strong)]'
            )}
          >
            <Plus className="h-4 w-4 inline mr-2" />
            Create New Track
          </button>
          <button
            onClick={() => setActiveTab('existing')}
            className={cn(
              'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'existing'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-strong)]'
            )}
          >
            <BookOpen className="h-4 w-4 inline mr-2" />
            Upload to Existing Track
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'new' && (
          <div>
            <SimpleTrackUpload onSuccess={handleTrackCreated} />
          </div>
        )}

        {activeTab === 'existing' && (
          <div className="space-y-6">
            {tracks.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-muted)]">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-[var(--text-muted)]" />
                <p>No tracks available. Create a track first!</p>
                <Button
                  onClick={() => setActiveTab('new')}
                  variant="outline"
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Track
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-strong)] mb-2">
                    Select Track
                  </label>
                  <select
                    value={selectedTrackId}
                    onChange={(e) => setSelectedTrackId(e.target.value)}
                    className="w-full h-10 px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    <option value="">Choose a track to upload to...</option>
                    {tracks.map((track) => (
                      <option key={track.id} value={track.id}>
                        {track.title}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTrackId && (
                  <div>
                    <LessonVideoUpload 
                      trackId={selectedTrackId}
                      onUploadSuccess={handleVideoUploaded}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

