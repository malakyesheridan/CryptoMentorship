'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Video, Search, Check, X } from 'lucide-react'

interface Video {
  id: string
  title: string
  description: string | null
  duration: number | null
  fileSize: number | null
  status: string
  visibility: string
  createdAt: string
}

interface VideoSelectorProps {
  selectedVideoId?: string
  onVideoSelect: (video: Video | null) => void
  onClose: () => void
  className?: string
}

export default function VideoSelector({ 
  selectedVideoId, 
  onVideoSelect, 
  onClose,
  className = '' 
}: VideoSelectorProps) {
  const [videos, setVideos] = useState<Video[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)

  const fetchVideos = useCallback(async () => {
    try {
      const response = await fetch('/api/videos')
      const data = await response.json()
      
      if (data.ok) {
        setVideos(data.videos.filter((video: Video) => video.status === 'ready'))
        
        // Set initially selected video
        if (selectedVideoId) {
          const initialVideo = data.videos.find((video: Video) => video.id === selectedVideoId)
          if (initialVideo) {
            setSelectedVideo(initialVideo)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedVideoId])

  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video)
  }

  const handleConfirm = () => {
    onVideoSelect(selectedVideo)
    onClose()
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const filteredVideos = videos.filter(video =>
    video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${className}`}>
      <Card className="card w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Select Video</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search videos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Videos List */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-slate-600">Loading videos...</p>
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="text-center py-8">
                <Video className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600">No videos found</p>
              </div>
            ) : (
              filteredVideos.map((video) => (
                <div
                  key={video.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedVideo?.id === video.id
                      ? 'border-gold-500 bg-gold-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  onClick={() => handleVideoSelect(video)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-800 truncate">
                        {video.title}
                      </h3>
                      {video.description && (
                        <p className="text-sm text-slate-600 truncate">
                          {video.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-3 mt-1 text-xs text-slate-500">
                        <span>{formatDuration(video.duration)}</span>
                        <Badge variant="outline" className="text-xs">
                          {video.visibility}
                        </Badge>
                      </div>
                    </div>
                    {selectedVideo?.id === video.id && (
                      <Check className="w-5 h-5 text-gold-600" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              className="btn-gold"
              disabled={!selectedVideo}
            >
              Select Video
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
