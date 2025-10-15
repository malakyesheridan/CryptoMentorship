'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Video, Eye, Clock, Calendar, User, Search, Filter, MoreVertical, Edit, Trash2, Eye as ViewIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface Video {
  id: string
  title: string
  description: string | null
  filename: string
  filePath: string
  thumbnail: string | null
  duration: number | null
  fileSize: number | null
  mimeType: string
  status: string
  visibility: string
  uploadedBy: string | null
  viewCount: number
  createdAt: string
}

interface AdminVideosListProps {
  videos: Video[]
}

export default function AdminVideosList({ videos }: AdminVideosListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [visibilityFilter, setVisibilityFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

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

  // Filter and sort videos
  const filteredVideos = videos
    .filter(video => {
      const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           video.description?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || video.status === statusFilter
      const matchesVisibility = visibilityFilter === 'all' || video.visibility === visibilityFilter
      
      return matchesSearch && matchesStatus && matchesVisibility
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'title':
          return a.title.localeCompare(b.title)
        case 'views':
          return b.viewCount - a.viewCount
        case 'size':
          return (b.fileSize || 0) - (a.fileSize || 0)
        default:
          return 0
      }
    })

  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Refresh the page or update state
        window.location.reload()
      } else {
        alert('Failed to delete video')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete video')
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <Card className="card">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search videos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-32 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="ready">Ready</option>
                <option value="processing">Processing</option>
                <option value="error">Error</option>
              </select>

              <select 
                value={visibilityFilter} 
                onChange={(e) => setVisibilityFilter(e.target.value)}
                className="w-32 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Visibility</option>
                <option value="public">Public</option>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>

              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="w-40 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Title A-Z</option>
                <option value="views">Most Views</option>
                <option value="size">Largest Files</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Videos List */}
      <Card className="card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Videos ({filteredVideos.length})</span>
            <Link href="/admin/videos/upload">
              <Button className="btn-gold">
                <Video className="w-4 h-4 mr-2" />
                Upload New
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredVideos.length === 0 ? (
            <div className="text-center py-12">
              <Video className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No videos found</h3>
              <p className="text-slate-600 mb-4">
                {searchTerm || statusFilter !== 'all' || visibilityFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Upload your first video to get started'
                }
              </p>
              {(!searchTerm && statusFilter === 'all' && visibilityFilter === 'all') && (
                <Link href="/admin/videos/upload">
                  <Button className="btn-gold">
                    <Video className="w-4 h-4 mr-2" />
                    Upload Video
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVideos.map((video) => (
                <div key={video.id} className="flex items-center space-x-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                  <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Video className="w-8 h-8 text-slate-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-800 truncate">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-sm text-slate-600 truncate">
                        {video.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                      <span>Uploaded by {video.uploadedBy}</span>
                      <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
                      <span>{formatFileSize(video.fileSize)}</span>
                      <span>{formatDuration(video.duration)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant={video.status === 'ready' ? 'default' : 'secondary'}>
                      {video.status}
                    </Badge>
                    <Badge variant="outline">
                      {video.visibility}
                    </Badge>
                    <div className="flex items-center space-x-1 text-sm text-slate-500">
                      <Eye className="w-4 h-4" />
                      <span>{video.viewCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Link href={`/videos/${video.id}`}>
                      <Button variant="ghost" size="sm">
                        <ViewIcon className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(video.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
