import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import VideoPlayer from '@/components/VideoPlayer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, Clock, Calendar, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function VideoPage({ params }: { params: { id: string } }) {
  // Test database query
  try {
    const videoCount = await prisma.video.count()
    console.log('Video count:', videoCount)
  } catch (error) {
    console.error('Database error:', error)
    notFound()
  }

  // Test actual video query
  let video = null
  try {
    video = await prisma.video.findUnique({
      where: { id: params.id },
      include: {
        uploader: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { views: true }
        }
      }
    })
    console.log('Found video:', video?.title)
  } catch (error) {
    console.error('Video query error:', error)
    notFound()
  }

  if (!video) {
    notFound()
  }

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

  // Increment view count (non-blocking - don't fail page load if this fails)
  try {
    await prisma.videoView.create({
      data: {
        videoId: video.id,
        userId: null, // Anonymous views supported
      }
    })
  } catch (error) {
    // Log but don't throw - view tracking failure shouldn't break page rendering
    console.error('Failed to track video view:', error)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      {/* Video Player */}
      <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl">
        <VideoPlayer
          src={`/api/video-serve?file=${video.filePath.split('/').pop()}`}
          title={video.title}
          className="w-full h-full"
        />
      </div>

      {/* Video Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-slate-50">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-3 text-slate-900 font-bold">{video.title}</CardTitle>
                  <div className="flex items-center space-x-6 text-sm text-slate-600">
                    <div className="flex items-center space-x-2">
                      <Eye className="w-5 h-5 text-slate-500" />
                      <span className="font-medium">{video._count.views} views</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-slate-500" />
                      <span className="font-medium">{formatDuration(video.duration)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-slate-500" />
                      <span className="font-medium">{formatDistanceToNow(video.createdAt)} ago</span>
                    </div>
                  </div>
                </div>
                <Badge
                  variant={video.status === 'ready' ? 'default' : 'secondary'}
                  className={`${video.status === 'ready' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-slate-100 text-slate-800'} px-3 py-1`}
                >
                  {video.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {video.description && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-800">Description</h3>
                  <p className="text-slate-600 leading-relaxed">{video.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Video Details */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-slate-50">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-slate-900">Video Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Duration</span>
                  <span className="font-semibold text-slate-900">{formatDuration(video.duration)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">File Size</span>
                  <span className="font-semibold text-slate-900">{formatFileSize(video.fileSize)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Format</span>
                  <span className="font-semibold text-slate-900">{video.mimeType}</span>
                </div>
                {video.resolution && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Resolution</span>
                    <span className="font-semibold text-slate-900">{video.resolution}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-600 font-medium">Visibility</span>
                  <Badge
                    variant="outline"
                    className={`${video.visibility === 'public' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'} px-3 py-1`}
                  >
                    {video.visibility}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Uploader Info */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-slate-50">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-slate-900">Uploaded By</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center shadow-sm">
                  <User className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-lg">{video.uploader.name}</p>
                  <p className="text-sm text-slate-600">{video.uploader.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
