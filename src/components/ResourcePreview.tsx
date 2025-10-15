'use client'

import { useState } from 'react'
import { FileText, Download, Eye, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/dates'

interface ResourcePreviewProps {
  resource: {
    id: string
    title: string
    description: string | null
    url: string
    locked: boolean
    publishedAt: Date | null
  }
  canView: boolean
}

export default function ResourcePreview({ resource, canView }: ResourcePreviewProps) {
  const [showPreview, setShowPreview] = useState(false)

  if (!canView) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">{resource.title}</h3>
            <p className="text-sm text-slate-600">Member Only Resource</p>
          </div>
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            Member Only
          </Badge>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">{resource.title}</h3>
          <p className="text-sm text-slate-600">
            {resource.description || 'No description available'}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <span>PDF Document</span>
            <span>•</span>
            <span>{resource.publishedAt ? formatDate(resource.publishedAt, 'MMM d, yyyy') : 'Unknown date'}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? 'Hide' : 'Preview'}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={resource.url} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4 mr-2" />
              Download
            </a>
          </Button>
        </div>
      </div>
      
      {showPreview && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-slate-900">PDF Preview</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 mb-3">
              PDF preview not available in this view
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href={resource.url} target="_blank" rel="noopener noreferrer">
                Open PDF in New Tab
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
