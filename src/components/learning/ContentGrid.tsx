'use client'

import Link from 'next/link'
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
        <div className="w-24 h-24 bg-[#1a1815] rounded-full flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-12 h-12 text-[var(--text-muted)]" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--text-strong)] mb-2">No content available</h3>
        <p className="text-[var(--text-muted)]">Check back soon for new content.</p>
      </div>
    )
  }

  return (
    <div data-tour="learning-track-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item, index) => {
        const isCourse = item.type === 'course'
        const href = item.url || (isCourse ? `/learn/${item.slug || item.id}` : `/content/${item.slug || item.id}`)
        const isFirstCourse = isCourse && index === 0

        return (
          <Link
            key={item.id}
            href={href}
            onClick={() => onItemClick?.(item)}
            data-tour={isFirstCourse ? "learning-track-card" : undefined}
          >
            <article className="group bg-[var(--bg-panel)] rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-[var(--border-subtle)] overflow-hidden hover:-translate-y-0.5">
              {/* Cover Image */}
              <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-[#1a1815] to-[#2a2520]">
                {item.coverUrl ? (
                  <Image
                    src={item.coverUrl}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {isCourse ? (
                      <BookOpen className="w-12 h-12 text-white/40" />
                    ) : (
                      <FileText className="w-12 h-12 text-white/40" />
                    )}
                  </div>
                )}
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                {/* Type badge top-left */}
                <div className="absolute top-3 left-3">
                  <Badge className={`text-xs px-2 py-0.5 font-medium ${
                    item.locked
                      ? 'bg-blue-600 text-white border-blue-700'
                      : 'bg-[#1a2e1a] text-[#4a7c3f] border-[#1a2e1a]'
                  }`}>
                    {item.locked ? 'Member' : 'Public'}
                  </Badge>
                </div>
                {/* Lesson count badge bottom-right */}
                {isCourse && item.totalLessons && item.totalLessons > 0 && (
                  <div className="absolute bottom-3 right-3">
                    <span className="bg-black/80 text-white text-xs px-2 py-1 rounded font-medium">
                      {item.totalLessons} {item.totalLessons === 1 ? 'lesson' : 'lessons'}
                    </span>
                  </div>
                )}
                {/* Admin dropdown */}
                {isAdmin && isCourse && onEditTrack && (
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="bg-black/50 hover:bg-black/70 text-white h-8 w-8 p-0"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                {/* Play icon on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Play className="w-6 h-6 text-white ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-base font-semibold text-[var(--text-strong)] mb-2 line-clamp-2 group-hover:text-yellow-500 transition-colors leading-snug">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-sm text-[var(--text-muted)] mb-3 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                )}

                {/* Progress Bar */}
                {showProgress && isCourse && item.progressPct !== undefined && item.progressPct > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[var(--text-muted)]">
                        {item.progressPct === 100 ? (
                          <span className="flex items-center gap-1 text-[#4a7c3f]">
                            <CheckCircle className="h-3 w-3" />
                            Completed
                          </span>
                        ) : (
                          'In Progress'
                        )}
                      </span>
                      <span className="font-medium text-[var(--text-strong)]">{item.progressPct}%</span>
                    </div>
                    <div className="w-full bg-[#2a2520] rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          item.progressPct === 100 ? 'bg-[#4a7c3f]' : 'bg-gold-500'
                        }`}
                        style={{ width: `${item.progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                  {item.durationMin && item.durationMin > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {item.durationMin >= 60
                          ? `${Math.floor(item.durationMin / 60)}h ${item.durationMin % 60}m`
                          : `${item.durationMin}m`
                        }
                      </span>
                    </div>
                  )}
                  {item.publishedAt && (
                    <span>{formatContentDate(item.publishedAt)}</span>
                  )}
                </div>
              </div>

              {/* Lock Overlay */}
              {item.locked && (
                <div className="absolute inset-0 bg-[#141210]/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="text-center">
                    <Lock className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                    <p className="text-sm font-medium text-[var(--text-strong)]">Member Only</p>
                  </div>
                </div>
              )}
            </article>
          </Link>
        )
      })}
    </div>
  )
}
