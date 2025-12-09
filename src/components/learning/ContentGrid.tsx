'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  FileText, 
  Clock, 
  Lock, 
  Play, 
  ArrowRight,
  CheckCircle,
  Award,
  Edit,
  MoreVertical
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Image from 'next/image'
import { formatContentDate } from '@/lib/content-utils'

interface ContentItem {
  id: string
  slug?: string
  title: string
  description?: string | null
  coverUrl?: string | null
  type: 'course' | 'resource'
  locked?: boolean
  progressPct?: number
  publishedAt?: Date | null
  durationMin?: number
  totalLessons?: number
  tags?: string | null
  url?: string
}

interface ContentGridProps {
  items: ContentItem[]
  showProgress?: boolean
  onItemClick?: (item: ContentItem) => void
  userRole?: string
  onEditTrack?: (trackId: string) => void
  onManageTrack?: (trackId: string) => void
}

export function ContentGrid({ items, showProgress = false, onItemClick, userRole, onEditTrack }: ContentGridProps) {
  const isAdmin = userRole === 'admin' || userRole === 'editor'
  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-12 h-12 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">No content available</h3>
        <p className="text-slate-600">Check back soon for new content.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => {
        const isCourse = item.type === 'course'
        const isResource = item.type === 'resource'
        const href = item.url || (isCourse ? `/learn/${item.slug || item.id}` : `/content/${item.slug || item.id}`)
        
        return (
          <Card 
            key={item.id} 
            className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 relative overflow-hidden"
          >
            {/* Cover Image */}
            {item.coverUrl && (
              <div className="aspect-video relative mb-4 rounded-t-2xl overflow-hidden">
                <Image
                  src={item.coverUrl}
                  alt={item.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
            )}

            <CardHeader className="pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isCourse ? 'bg-blue-100' : 'bg-purple-100'
                  }`}>
                    {isCourse ? (
                      <BookOpen className="w-5 h-5 text-blue-600" />
                    ) : (
                      <FileText className="w-5 h-5 text-purple-600" />
                    )}
                  </div>
                  <Badge className={`text-xs px-2 py-1 ${
                    item.locked 
                      ? 'bg-blue-100 text-blue-700 border-blue-200' 
                      : 'bg-green-100 text-green-700 border-green-200'
                  }`}>
                    {item.locked ? 'Member' : 'Public'}
                  </Badge>
                </div>
                {isAdmin && isCourse && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      {onEditTrack && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onEditTrack(item.id)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Track
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <CardTitle className="text-xl font-semibold mb-2 text-slate-900 group-hover:text-yellow-600 transition-colors line-clamp-2">
                {item.title}
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 line-clamp-2">
                {item.description || 'No description available.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Progress Bar (for courses) */}
              {showProgress && isCourse && item.progressPct !== undefined && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">Progress</span>
                    <span className="font-medium">{item.progressPct}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${item.progressPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                {isCourse && item.totalLessons && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{item.totalLessons} lessons</span>
                  </div>
                )}
                {item.durationMin && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{Math.round(item.durationMin / 60)}h {item.durationMin % 60}m</span>
                  </div>
                )}
                {item.publishedAt && (
                  <div className="flex items-center gap-1">
                    <span>{formatContentDate(item.publishedAt)}</span>
                  </div>
                )}
              </div>

              {/* Status Badge */}
              {isCourse && item.progressPct !== undefined && (
                <div className="mb-4">
                  <Badge 
                    variant={item.progressPct === 100 ? 'default' : 'secondary'}
                    className={item.progressPct === 100 ? 'bg-green-600' : ''}
                  >
                    {item.progressPct === 100 ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </>
                    ) : (
                      'In Progress'
                    )}
                  </Badge>
                </div>
              )}

              {/* Action Button */}
              <Link href={href} className="block" onClick={() => onItemClick?.(item)}>
                <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white">
                  {isCourse && item.progressPct === 100 ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Watch Again
                    </>
                  ) : isCourse ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      {item.progressPct && item.progressPct > 0 ? 'Continue Learning' : 'Start Learning'}
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      View Resource
                    </>
                  )}
                </Button>
              </Link>
            </CardContent>

            {/* Lock Overlay */}
            {item.locked && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="text-center">
                  <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">Member Only</p>
                </div>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

