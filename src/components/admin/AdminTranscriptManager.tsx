'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { FileText, Upload, FileInput, Search, Play } from 'lucide-react'
import { uploadTranscript, pasteTranscript } from '@/lib/actions/replay'
import { validatePlainFormat } from '@/lib/captions'

interface TranscriptSegment {
  id: string
  startMs: number
  endMs?: number | null
  text: string
  transcriptId: string
}

interface Transcript {
  id: string
  source: string
  segments: TranscriptSegment[]
  createdAt: Date
  eventId: string
  uploadedBy: string | null
}

interface AdminTranscriptManagerProps {
  eventId: string
  initialTranscript?: Transcript | null
  recordingUrl?: string
}

export function AdminTranscriptManager({ 
  eventId, 
  initialTranscript, 
  recordingUrl 
}: AdminTranscriptManagerProps) {
  const [transcript, setTranscript] = useState<Transcript | null>(initialTranscript || null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadMode, setUploadMode] = useState<'file' | 'paste'>('file')
  const [fileContent, setFileContent] = useState('')
  const [pasteContent, setPasteContent] = useState('')

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const content = await file.text()
      const source = file.name.endsWith('.vtt') ? 'vtt' : 
                    file.name.endsWith('.srt') ? 'srt' : 'manual'

      const result = await uploadTranscript({
        eventId,
        content,
        source: source as 'vtt' | 'srt' | 'manual'
      })

      if (result.error) {
        setError(result.error)
      } else if (result.transcript) {
        setTranscript(result.transcript)
        setFileContent('')
      }
    } catch (err) {
      setError('Failed to upload transcript file')
    } finally {
      setIsUploading(false)
    }
  }

  const handlePasteUpload = async () => {
    if (!pasteContent.trim() || isUploading) return

    // Validate format first
    const validationErrors = validatePlainFormat(pasteContent)
    if (validationErrors.length > 0) {
      setError(`Format validation failed:\n${validationErrors.join('\n')}`)
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const result = await pasteTranscript({
        eventId,
        lines: pasteContent.trim()
      })

      if (result.error) {
        setError(result.error)
      } else if (result.transcript) {
        setTranscript(result.transcript)
        setPasteContent('')
      }
    } catch (err) {
      setError('Failed to upload transcript')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSeekToSegment = (startMs: number) => {
    // This would seek the player in a real implementation
    console.log(`Seek to ${Math.floor(startMs / 1000)}s`)
  }

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm whitespace-pre-line">{error}</p>
        </div>
      )}

      {/* Upload Section */}
      {!transcript && (
        <div className="border border-slate-200 rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-slate-800">Upload Transcript</h4>
          
          {/* Upload Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={uploadMode === 'file' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUploadMode('file')}
            >
              <FileInput className="h-3 w-3 mr-1" />
              File Upload
            </Button>
            <Button
              variant={uploadMode === 'paste' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUploadMode('paste')}
            >
              <FileText className="h-3 w-3 mr-1" />
              Paste Text
            </Button>
          </div>

          {/* File Upload */}
          {uploadMode === 'file' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Upload VTT or SRT file
                </label>
                <input
                  type="file"
                  accept=".vtt,.srt"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gold-50 file:text-gold-700 hover:file:bg-gold-100"
                />
              </div>
              <p className="text-xs text-slate-500">
                Supported formats: WebVTT (.vtt) and SubRip (.srt)
              </p>
            </div>
          )}

          {/* Paste Text */}
          {uploadMode === 'paste' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Paste transcript with timestamps
                </label>
                <Textarea
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder="Format: MM:SS text content&#10;0:15 Welcome to today's session&#10;2:30 Let's discuss Bitcoin trends&#10;5:45 Here are the key points"
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">
                  Format: MM:SS text content (one per line)
                </p>
                <Button
                  size="sm"
                  onClick={handlePasteUpload}
                  disabled={!pasteContent.trim() || isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transcript Display */}
      {transcript && (
        <div className="space-y-4">
          {/* Transcript Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {transcript.source}
              </Badge>
              <span className="text-sm text-slate-600">
                {transcript.segments.length} segments
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTranscript(null)}
            >
              Replace Transcript
            </Button>
          </div>

          {/* Segments List */}
          <div className="max-h-96 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-4">
            {transcript.segments.map((segment) => (
              <button
                key={segment.id}
                onClick={() => handleSeekToSegment(segment.startMs)}
                className="w-full text-left p-2 rounded hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs text-slate-500 font-mono min-w-[50px]">
                    {formatTime(segment.startMs)}
                  </span>
                  <span className="text-sm text-slate-800 flex-1">
                    {segment.text}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Preview Player */}
          {recordingUrl && (
            <div className="mt-6">
              <h4 className="font-medium text-slate-800 mb-3">Preview</h4>
              <div className="bg-slate-100 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-2">
                  Click on transcript segments to test seeking functionality
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {transcript.segments.slice(0, 10).map((segment) => (
                    <button
                      key={segment.id}
                      onClick={() => handleSeekToSegment(segment.startMs)}
                      className="w-full text-left p-2 rounded border border-slate-200 hover:border-gold-300 hover:bg-gold-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Play className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-500 font-mono min-w-[50px]">
                          {formatTime(segment.startMs)}
                        </span>
                        <span className="text-sm text-slate-800 flex-1 truncate">
                          {segment.text}
                        </span>
                      </div>
                    </button>
                  ))}
                  {transcript.segments.length > 10 && (
                    <p className="text-xs text-slate-500 text-center py-2">
                      ... and {transcript.segments.length - 10} more segments
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Transcript State */}
      {!transcript && (
        <div className="text-center py-8 text-slate-500">
          <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p>No transcript uploaded yet</p>
          <p className="text-sm">Upload a transcript to enable searchable playback</p>
        </div>
      )}
    </div>
  )
}
