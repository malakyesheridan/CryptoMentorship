'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileText, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import type { PdfResource } from '@/lib/learning/resources'
import { PDF_MAX_SIZE_BYTES, formatBytes } from '@/lib/upload-config'

interface PdfAttachmentsFieldProps {
  label?: string
  helperText?: string
  value: PdfResource[]
  onChange: (value: PdfResource[]) => void
  folder?: string
}

export function PdfAttachmentsField({
  label = 'PDF Attachments',
  helperText,
  value,
  onChange,
  folder = 'learning-pdfs'
}: PdfAttachmentsFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file')
      event.target.value = ''
      return
    }
    
    if (file.size > PDF_MAX_SIZE_BYTES) {
      toast.error(`PDF too large. Maximum size is ${formatBytes(PDF_MAX_SIZE_BYTES)}. Your file is ${formatBytes(file.size)}.`)
      event.target.value = ''
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const { uploadToBlob } = await import('@/lib/blob-upload')
      const uploadResult = await uploadToBlob({
        file,
        folder,
        onProgress: (progress) => {
          setUploadProgress(progress)
        }
      })

      if (!uploadResult.success || !uploadResult.url) {
        toast.error(uploadResult.error || 'PDF upload failed')
        return
      }

      const title = file.name.replace(/\.pdf$/i, '')
      onChange([...value, { title, url: uploadResult.url }])
      toast.success('PDF uploaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'PDF upload failed')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      event.target.value = ''
    }
  }

  const handleTitleChange = (index: number, newTitle: string) => {
    const next = value.map((item, itemIndex) =>
      itemIndex === index ? { ...item, title: newTitle } : item
    )
    onChange(next)
  }

  const handleRemove = (index: number) => {
    const next = value.filter((_, itemIndex) => itemIndex !== index)
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-600" />
          {label}
        </Label>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Upload PDF'}
          </Button>
          {isUploading && uploadProgress > 0 && (
            <span className="text-sm text-slate-500">{uploadProgress}%</span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
        </div>
        {helperText && (
          <p className="text-xs text-slate-500">{helperText}</p>
        )}
      </div>

      {value.length > 0 ? (
        <div className="space-y-2">
          {value.map((item, index) => (
            <div key={`${item.url}-${index}`} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
              <Input
                value={item.title}
                onChange={(e) => handleTitleChange(index, e.target.value)}
                placeholder="PDF title"
              />
              <div className="flex items-center justify-between gap-3 text-sm">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-yellow-600 hover:text-yellow-700 break-all"
                >
                  View PDF
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(index)}
                  aria-label="Remove PDF"
                >
                  <X className="h-4 w-4 text-slate-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">No PDFs attached yet.</p>
      )}
    </div>
  )
}
