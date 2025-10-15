'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Clock, Plus, Trash2, Edit, Save, X } from 'lucide-react'
import { updateChapters } from '@/lib/actions/replay'
import { msToTime, toMs } from '@/lib/player'

interface Chapter {
  id: string
  title: string
  startMs: number
}

interface AdminChaptersManagerProps {
  eventId: string
  initialChapters: Chapter[]
  recordingUrl?: string
}

export function AdminChaptersManager({ 
  eventId, 
  initialChapters, 
  recordingUrl 
}: AdminChaptersManagerProps) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters)
  const [editingChapter, setEditingChapter] = useState<string | null>(null)
  const [newChapter, setNewChapter] = useState({ title: '', startMs: 0 })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddChapter = async () => {
    if (!newChapter.title.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await updateChapters({
        eventId,
        chapters: [
          ...chapters.map(ch => ({ ...ch, id: ch.id })),
          { title: newChapter.title.trim(), startMs: newChapter.startMs }
        ]
      })

      if (result.error) {
        setError(result.error)
      } else if (result.chapters) {
        setChapters(result.chapters)
        setNewChapter({ title: '', startMs: 0 })
      }
    } catch (err) {
      setError('Failed to add chapter')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateChapter = async (chapterId: string, updates: Partial<Chapter>) => {
    try {
      const result = await updateChapters({
        eventId,
        chapters: chapters.map(ch => 
          ch.id === chapterId 
            ? { ...ch, ...updates, id: ch.id }
            : { ...ch, id: ch.id }
        )
      })

      if (result.error) {
        setError(result.error)
      } else if (result.chapters) {
        setChapters(result.chapters)
        setEditingChapter(null)
      }
    } catch (err) {
      setError('Failed to update chapter')
    }
  }

  const handleDeleteChapter = async (chapterId: string) => {
    try {
      const result = await updateChapters({
        eventId,
        chapters: chapters.map(ch => ({ ...ch, id: ch.id, _delete: ch.id === chapterId }))
      })

      if (result.error) {
        setError(result.error)
      } else if (result.chapters) {
        setChapters(result.chapters)
      }
    } catch (err) {
      setError('Failed to delete chapter')
    }
  }

  const handleTimeChange = (value: string, setter: (ms: number) => void) => {
    try {
      const ms = toMs(value)
      setter(ms)
    } catch {
      // Invalid format, ignore
    }
  }

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Add New Chapter */}
      <div className="border border-slate-200 rounded-lg p-4 space-y-3">
        <h4 className="font-medium text-slate-800">Add New Chapter</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Input
              type="text"
              placeholder="Chapter title..."
              value={newChapter.title}
              onChange={(e) => setNewChapter(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="MM:SS"
              value={msToTime(newChapter.startMs)}
              onChange={(e) => handleTimeChange(e.target.value, (ms) => 
                setNewChapter(prev => ({ ...prev, startMs: ms }))
              )}
            />
            <Button
              size="sm"
              onClick={handleAddChapter}
              disabled={!newChapter.title.trim() || isSubmitting}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chapters List */}
      <div className="space-y-2">
        {chapters.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>No chapters yet. Add your first chapter above.</p>
          </div>
        ) : (
          chapters.map((chapter) => (
            <div
              key={chapter.id}
              className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg"
            >
              {editingChapter === chapter.id ? (
                <>
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={chapter.title}
                      onChange={(e) => setChapters(prev => 
                        prev.map(ch => 
                          ch.id === chapter.id 
                            ? { ...ch, title: e.target.value }
                            : ch
                        )
                      )}
                    />
                  </div>
                  <Input
                    type="text"
                    placeholder="MM:SS"
                    value={msToTime(chapter.startMs)}
                    onChange={(e) => handleTimeChange(e.target.value, (ms) => 
                      setChapters(prev => 
                        prev.map(ch => 
                          ch.id === chapter.id 
                            ? { ...ch, startMs: ms }
                            : ch
                        )
                      )
                    )}
                    className="w-20"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleUpdateChapter(chapter.id, chapter)}
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingChapter(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <span className="font-medium text-slate-800">{chapter.title}</span>
                  </div>
                  <Badge variant="outline" className="text-slate-600">
                    {msToTime(chapter.startMs)}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingChapter(chapter.id)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteChapter(chapter.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Preview Player */}
      {recordingUrl && chapters.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium text-slate-800 mb-3">Preview</h4>
          <div className="bg-slate-100 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-2">
              Click on chapters to test seeking functionality
            </p>
            <div className="space-y-1">
              {chapters.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => {
                    // This would seek the player in a real implementation
                    console.log(`Seek to ${msToTime(chapter.startMs)}`)
                  }}
                  className="w-full text-left p-2 rounded border border-slate-200 hover:border-gold-300 hover:bg-gold-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{chapter.title}</span>
                    <span className="text-xs text-slate-500">{msToTime(chapter.startMs)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
