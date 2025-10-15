'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Play, Search, Clock, FileText } from 'lucide-react'
import { seekPlayer, updateUrlWithTime, getTimeFromUrl, msToTime } from '@/lib/player'

interface Chapter {
  id: string
  title: string
  startMs: number
}

interface TranscriptSegment {
  id: string
  startMs: number
  endMs?: number
  text: string
}

interface Transcript {
  id: string
  source: string
  segments: TranscriptSegment[]
}

interface ReplaySectionProps {
  recordingUrl?: string
  chapters?: Chapter[]
  transcript?: Transcript
  eventTitle: string
}

export function ReplaySection({ recordingUrl, chapters = [], transcript, eventTitle }: ReplaySectionProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredSegments, setFilteredSegments] = useState<TranscriptSegment[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const playerRef = useRef<HTMLDivElement>(null)

  // Filter transcript segments based on search term
  useEffect(() => {
    if (!transcript?.segments) {
      setFilteredSegments([])
      return
    }

    if (!searchTerm.trim()) {
      setFilteredSegments(transcript.segments)
      return
    }

    const filtered = transcript.segments.filter(segment =>
      segment.text.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredSegments(filtered)
  }, [searchTerm, transcript])

  // Handle deep linking on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timeFromUrl = getTimeFromUrl(window.location.href)
      if (timeFromUrl && playerRef.current) {
        setTimeout(() => {
          seekPlayer(playerRef.current!, timeFromUrl)
          setCurrentTime(timeFromUrl)
        }, 1000) // Wait for player to load
      }
    }
  }, [])

  const handleChapterClick = (startMs: number) => {
    if (playerRef.current) {
      seekPlayer(playerRef.current, startMs)
      setCurrentTime(startMs)
      updateUrlWithTime(startMs)
    }
  }

  const handleSegmentClick = (startMs: number) => {
    if (playerRef.current) {
      seekPlayer(playerRef.current, startMs)
      setCurrentTime(startMs)
      updateUrlWithTime(startMs)
    }
  }

  const renderPlayer = () => {
    if (!recordingUrl) {
      return (
        <div className="bg-slate-100 rounded-lg aspect-video flex items-center justify-center">
          <div className="text-center text-slate-500">
            <Play className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>No recording available</p>
          </div>
        </div>
      )
    }

    // Check if it's a YouTube URL
    if (recordingUrl.includes('youtube.com') || recordingUrl.includes('youtu.be')) {
      const videoId = recordingUrl.includes('youtu.be') 
        ? recordingUrl.split('youtu.be/')[1]?.split('?')[0]
        : recordingUrl.split('v=')[1]?.split('&')[0]
      
      if (videoId) {
        return (
          <div ref={playerRef} className="aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title={eventTitle}
              className="w-full h-full rounded-lg"
              allowFullScreen
            />
          </div>
        )
      }
    }

    // Check if it's a Vimeo URL
    if (recordingUrl.includes('vimeo.com')) {
      const videoId = recordingUrl.split('vimeo.com/')[1]?.split('?')[0]
      
      if (videoId) {
        return (
          <div ref={playerRef} className="aspect-video">
            <iframe
              src={`https://player.vimeo.com/video/${videoId}`}
              title={eventTitle}
              className="w-full h-full rounded-lg"
              allowFullScreen
            />
          </div>
        )
      }
    }

    // Default to HTML5 video
    return (
      <div ref={playerRef} className="aspect-video">
        <video
          src={recordingUrl}
          controls
          className="w-full h-full rounded-lg"
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime * 1000)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Video Player */}
      <Card>
        <CardContent className="p-6">
          {renderPlayer()}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chapters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Chapters
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chapters.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No chapters available</p>
              </div>
            ) : (
              <div className="space-y-2">
                {chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    onClick={() => handleChapterClick(chapter.startMs)}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-gold-300 hover:bg-gold-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800">
                        {chapter.title}
                      </span>
                      <span className="text-sm text-slate-500">
                        {msToTime(chapter.startMs)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transcript */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Transcript
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!transcript ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No transcript available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search transcript..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Transcript Segments */}
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredSegments.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Search className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      <p>No matching segments found</p>
                    </div>
                  ) : (
                    filteredSegments.map((segment) => (
                      <button
                        key={segment.id}
                        onClick={() => handleSegmentClick(segment.startMs)}
                        className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-gold-300 hover:bg-gold-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm text-slate-600">
                            {msToTime(segment.startMs)}
                          </span>
                          <span className="text-slate-800 flex-1">
                            {searchTerm ? (
                              <span
                                dangerouslySetInnerHTML={{
                                  __html: segment.text.replace(
                                    new RegExp(`(${searchTerm})`, 'gi'),
                                    '<mark class="bg-yellow-200">$1</mark>'
                                  )
                                }}
                              />
                            ) : (
                              segment.text
                            )}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
