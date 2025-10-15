import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Video, Eye, Clock, Calendar, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function VideosPage() {
  const videos = await prisma.video.findMany({
    where: { status: 'ready' },
    orderBy: { createdAt: 'desc' },
    include: {
      uploader: {
        select: { id: true, name: true, email: true }
      },
      _count: {
        select: { views: true }
      }
    }
  })

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="heading-two-tone text-3xl mb-2">
          <span>Video</span> <span className="gold">Library</span>
        </h1>
        <p className="text-slate-600">Browse our collection of video lessons and content</p>
      </div>

      {/* Videos Grid */}
      {videos.length === 0 ? (
        <Card className="card">
          <CardContent className="py-12">
            <div className="text-center">
              <Video className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No videos available</h3>
              <p className="text-slate-600">Check back later for new video content</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <Link key={video.id} href={`/videos/${video.id}`}>
              <Card className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="aspect-video bg-slate-100 rounded-t-lg flex items-center justify-center">
                  <Video className="w-12 h-12 text-slate-400" />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-slate-800 mb-2 line-clamp-2">
                    {video.title}
                  </h3>
                  {video.description && (
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                      {video.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <Eye className="w-3 h-3" />
                        <span>{video._count.views}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(video.duration)}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {video.visibility}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 mt-3 text-xs text-slate-500">
                    <User className="w-3 h-3" />
                    <span>{video.uploader.name}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(video.createdAt)} ago</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
