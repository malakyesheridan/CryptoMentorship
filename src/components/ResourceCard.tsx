'use client'

import Link from 'next/link'
import { Calendar, ArrowRight, FileText, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/dates'

interface Resource {
  id: string
  slug: string
  title: string
  description: string | null
  url: string
  coverUrl: string
  tags: string | null
  publishedAt: Date | null
  locked: boolean
  kind: string
  minTier: string | null
}

interface ResourceCardProps {
  resource: Resource
  canView: boolean
}

export default function ResourceCard({ resource, canView }: ResourceCardProps) {
  return (
    <Link href={resource.url}>
      <article className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200 relative">
        {/* Resource Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-red-600" />
                </div>
                <Badge className={`text-xs px-2 py-1 ${resource.locked ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                  {resource.locked ? 'Member' : 'Public'}
                </Badge>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-yellow-600 transition-colors line-clamp-2">
                {resource.title}
              </h3>
              <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                {resource.description || 'No description available.'}
              </p>
              
              {/* Tags/Categories */}
              {resource.tags && (() => {
                try {
                  const tags = JSON.parse(resource.tags)
                  if (Array.isArray(tags) && tags.length > 0) {
                    return (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {tags.slice(0, 3).map((tag: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs px-2 py-0.5">
                            {tag}
                          </Badge>
                        ))}
                        {tags.length > 3 && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5">
                            +{tags.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )
                  }
                } catch (e) {
                  // Ignore invalid JSON
                }
                return null
              })()}
            </div>
          </div>

          {/* Resource Metadata */}
          <div className="flex items-center justify-between text-sm text-slate-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{resource.publishedAt ? formatDate(resource.publishedAt, 'MMM d, yyyy') : 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>PDF</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-400 group-hover:text-yellow-500 transition-colors">
              <span className="font-medium">View</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </div>
        </div>

        {/* Access Control Overlay */}
        {!canView && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">Member Only</p>
              <p className="text-xs text-slate-500">Upgrade to access</p>
            </div>
          </div>
        )}

        {/* Hover Effect Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      </article>
    </Link>
  )
}
