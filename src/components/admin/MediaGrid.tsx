'use client'

import { useState } from 'react'
import { formatDate } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Image as ImageIcon, 
  File, 
  Download, 
  Trash2, 
  Copy,
  Eye,
  Check
} from 'lucide-react'
import { toast } from 'sonner'

interface MediaItem {
  id: string
  url: string
  filename: string
  mime: string
  size: number
  alt: string | null
  title: string | null
  createdAt: Date
  uploader: {
    name: string | null
    email: string
  }
}

interface MediaGridProps {
  media: MediaItem[]
}

export function MediaGrid({ media }: MediaGridProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return ImageIcon
    return File
  }

  const copyToClipboard = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      toast.success('URL copied to clipboard')
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      toast.error('Failed to copy URL')
    }
  }

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedItems.size === media.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(media.map(item => item.id)))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media item?')) return
    
    try {
      const response = await fetch(`/api/admin/media/${id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        toast.success('Media deleted successfully')
        window.location.reload()
      } else {
        toast.error('Failed to delete media')
      }
    } catch (error) {
      toast.error('Failed to delete media')
    }
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {media.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedItems.size === media.length}
                onChange={handleSelectAll}
                className="rounded"
              />
              <span className="text-sm text-[var(--text-strong)]">
                Select All ({selectedItems.size} selected)
              </span>
            </label>
          </div>
          
          {selectedItems.size > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Download Selected
              </Button>
              <Button variant="destructive" size="sm">
                Delete Selected
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Media Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {media.map((item) => {
          const FileIcon = getFileIcon(item.mime)
          const isImage = item.mime.startsWith('image/')
          
          return (
            <div key={item.id} className="card p-4 group">
              <div className="relative">
                {/* Preview */}
                <div className="aspect-square bg-slate-100 rounded-lg mb-3 overflow-hidden">
                  {isImage ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.alt || item.filename}
                        className="w-full h-full object-cover"
                      />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileIcon className="w-12 h-12 text-[var(--text-muted)]" />
                    </div>
                  )}
                </div>

                {/* Overlay Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyToClipboard(item.url, item.id)}
                      className="h-8 w-8 p-0"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.open(item.url, '_blank')}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Selection Checkbox */}
                <div className="absolute top-2 left-2">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => handleSelect(item.id)}
                    className="rounded"
                  />
                </div>
              </div>

              {/* File Info */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-[var(--text-strong)] truncate">
                  {item.title || item.filename}
                </h3>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {item.mime.split('/')[0]}
                  </Badge>
                  <span className="text-xs text-[var(--text-muted)]">
                    {formatFileSize(item.size)}
                  </span>
                </div>

                <div className="text-xs text-[var(--text-muted)]">
                  <div>Uploaded by {item.uploader.name}</div>
                  <div>{formatDate(item.createdAt, 'MMM d, yyyy')}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
