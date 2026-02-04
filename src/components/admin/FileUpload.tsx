'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { uploadImage } from '@/lib/image-upload'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

interface FileUploadProps {
  value?: string
  onChange: (url: string) => void
  label?: string
  accept?: string
  folder?: string
}

export function FileUpload({
  value,
  onChange,
  label = 'Upload Image',
  accept = 'image/*',
  folder = 'covers'
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const result = await uploadImage({ file, folder })
      if (!result.success || !result.url) {
        throw new Error(result.error || 'Upload failed')
      }
      onChange(result.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = () => {
    onChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {value ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-3 border border-[var(--border-subtle)] rounded-lg">
            <ImageIcon className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-strong)] flex-1 truncate">
              {value.split('/').pop()}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-[var(--danger)] hover:text-[var(--danger)]"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Preview"
              className="w-full h-32 object-cover rounded-lg border border-[var(--border-subtle)]"
            />
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-[var(--border-subtle)] rounded-lg p-6 text-center">
          <Upload className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
          <p className="text-sm text-[var(--text-muted)] mb-2">
            Click to upload or drag and drop
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Choose File'}
          </Button>
        </div>
      )}

      <Input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <p className="text-sm text-[var(--danger)]">{error}</p>
      )}
    </div>
  )
}
