import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Video, Upload, Eye, Clock, HardDrive } from 'lucide-react'
import Link from 'next/link'
import AdminVideosList from '@/components/admin/AdminVideosList'

export const dynamic = 'force-dynamic'

export default async function AdminVideosPage() {
  const videos = await prisma.video.findMany({
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

  // Transform videos for the component
  const transformedVideos = videos.map(video => ({
    id: video.id,
    title: video.title,
    description: video.description,
    filename: video.filename,
    filePath: video.filePath,
    thumbnail: video.thumbnail,
    duration: video.duration,
    fileSize: video.fileSize,
    mimeType: video.mimeType,
    status: video.status,
    visibility: video.visibility,
    uploadedBy: video.uploader.name,
    viewCount: video._count.views,
    createdAt: video.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-two-tone text-3xl mb-2">
            <span>Video</span> <span className="gold">Management</span>
          </h1>
          <p className="text-slate-600">Upload and manage video content</p>
        </div>
        <Link href="/admin/videos/upload">
          <Button className="btn-gold">
            <Upload className="w-4 h-4 mr-2" />
            Upload Video
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Video className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Videos</p>
                <p className="text-2xl font-bold text-slate-800">{videos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Views</p>
                <p className="text-2xl font-bold text-slate-800">
                  {videos.reduce((sum, video) => sum + video._count.views, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Duration</p>
                <p className="text-2xl font-bold text-slate-800">
                  {formatDuration(videos.reduce((sum, video) => sum + (video.duration || 0), 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Size</p>
                <p className="text-2xl font-bold text-slate-800">
                  {formatFileSize(videos.reduce((sum, video) => sum + (video.fileSize || 0), 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Videos List */}
      <AdminVideosList videos={transformedVideos} />
    </div>
  )
}
