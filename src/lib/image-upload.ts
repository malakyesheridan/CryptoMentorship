import { upload } from '@vercel/blob/client'
import { sanitizeFilename } from '@/lib/file-validation'

export interface ImageUploadOptions {
  file: File
  folder?: string
  onProgress?: (progress: number) => void
}

export interface ImageUploadResult {
  success: boolean
  url?: string
  error?: string
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

export async function uploadImage({
  file,
  folder = 'covers',
  onProgress,
}: ImageUploadOptions): Promise<ImageUploadResult> {
  try {
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Only image files are allowed' }
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return { success: false, error: 'File size must be less than 10MB' }
    }

    const safeFilename = sanitizeFilename(file.name)
    const pathname = `${folder}/${Date.now()}-${safeFilename}`

    const result = await upload(pathname, file, {
      access: 'public',
      handleUploadUrl: '/api/upload/image',
      contentType: file.type || 'image/jpeg',
      multipart: file.size >= 5 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => {
        if (typeof percentage === 'number') {
          onProgress?.(Math.round(percentage))
        }
      },
    })

    return { success: true, url: result.url }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    }
  }
}
