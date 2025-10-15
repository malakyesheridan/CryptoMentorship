'use client'

import { useState, useEffect } from 'react'
import VideoPlayer from '@/components/VideoPlayer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Video, Eye, Clock } from 'lucide-react'

interface VideoEmbedProps {
  videoId: string
  title?: string
  showDetails?: boolean
  className?: string
}

export default function VideoEmbed({ 
  videoId, 
  title, 
  showDetails = true,
  className = '' 
}: VideoEmbedProps) {
  const [video, setVideo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch video details
  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const response = await fetch(`/api/videos/${videoId}`)
        const data = await response.json()
        
        if (data.ok) {
          setVideo(data.video)
        } else {
          setError('Video not found')
        }
      } catch (error) {
        console.error('Failed to fetch video:', error)
        setError('Failed to load video')
      } finally {
        setIsLoading(false)
      }
    }

    fetchVideo()
  }, [videoId])

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <Card className={`card ${className}`}>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading video...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !video) {
    return (
      <Card className={`card ${className}`}>
        <CardContent className="py-12">
          <div className="text-center">
            <Video className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Video unavailable</h3>
            <p className="text-slate-600">{error || 'This video could not be loaded'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`card ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Video className="w-5 h-5" />
          <span>{title || video.title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Player */}
        <div className="aspect-video">
          <VideoPlayer
            src={`/api/video-serve?file=${video.filename}`}
            title={video.title}
            className="w-full h-full"
          />
        </div>

        {/* Video Details */}
        {showDetails && (
          <div className="space-y-3">
            {video.description && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-2">Description</h4>
                <p className="text-slate-600 leading-relaxed">{video.description}</p>
              </div>
            )}
            
            <div className="flex items-center space-x-4 text-sm text-slate-600">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(video.duration)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{video.viewCount || 0} views</span>
              </div>
              <Badge variant="outline">{video.visibility}</Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}