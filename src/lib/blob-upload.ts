import { upload } from '@vercel/blob/client'
import { sanitizeFilename } from '@/lib/file-validation'
import {
  UPLOAD_ALLOWED_MIME_TYPES,
  formatBytes,
  getMaxSizeForMime
} from '@/lib/upload-config'

export interface BlobUploadOptions {
  file: File
  folder?: string
  onProgress?: (progress: number) => void
}

export interface BlobUploadResult {
  success: boolean
  url?: string
  path?: string
  contentType?: string
  size?: number
  originalName?: string
  requestId?: string
  error?: string
}

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function getFriendlyUploadError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message || 'Upload failed'
    if (message.includes('401') || message.toLowerCase().includes('unauthorized')) {
      return 'You must be signed in as an admin or editor to upload.'
    }
    if (message.includes('403') || message.toLowerCase().includes('forbidden')) {
      return 'Your account does not have permission to upload.'
    }
    if (message.includes('BLOB_READ_WRITE_TOKEN')) {
      return 'Upload storage is not configured. Please set BLOB_READ_WRITE_TOKEN in the environment.'
    }
    if (message.toLowerCase().includes('file too large')) {
      return message
    }
    if (message.toLowerCase().includes('unsupported file type')) {
      return message
    }
    return message
  }
  return 'Upload failed. Please try again.'
}

/**
 * Upload file directly to Vercel Blob Storage using client uploads.
 * This avoids Vercel serverless body size limits and supports large files.
 */
export async function uploadToBlob({
  file,
  folder = 'uploads',
  onProgress
}: BlobUploadOptions): Promise<BlobUploadResult> {
  const requestId = createRequestId()

  try {
    if (!file) {
      return { success: false, error: 'No file provided', requestId }
    }

    if (!UPLOAD_ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        success: false,
        error: 'Unsupported file type. Please upload a supported video, PDF, or image file.',
        requestId
      }
    }

    const maxSize = getMaxSizeForMime(file.type)
    if (maxSize && file.size > maxSize) {
      return {
        success: false,
        error: `File too large. Maximum size is ${formatBytes(maxSize)}. Your file is ${formatBytes(file.size)}.`,
        requestId
      }
    }

    const safeFilename = sanitizeFilename(file.name || 'upload')
    const timestamp = Date.now()
    const blobPath = `${folder}/${timestamp}-${safeFilename}`

    const result = await upload(blobPath, file, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
      handleUploadUrl: '/api/upload/learning',
      multipart: file.size > 10 * 1024 * 1024,
      clientPayload: JSON.stringify({
        requestId,
        folder,
        originalName: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size
      }),
      onUploadProgress: (progress) => {
        if (progress?.percentage !== undefined) {
          onProgress?.(Math.round(progress.percentage))
        }
      }
    })

    onProgress?.(100)

    return {
      success: true,
      url: result.url,
      path: result.pathname,
      contentType: result.contentType,
      size: file.size,
      originalName: file.name,
      requestId
    }
  } catch (error) {
    return {
      success: false,
      error: getFriendlyUploadError(error),
      requestId
    }
  }
}

