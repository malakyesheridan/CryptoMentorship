import { upload } from '@vercel/blob/client'
import { sanitizeFilename } from '@/lib/file-validation'

export interface CryptoCompassUploadOptions {
  file: File
  onProgress?: (progress: number) => void
}

export interface CryptoCompassUploadResult {
  success: boolean
  url?: string
  error?: string
}

export async function uploadCryptoCompassVideo({
  file,
  onProgress,
}: CryptoCompassUploadOptions): Promise<CryptoCompassUploadResult> {
  try {
    const safeFilename = sanitizeFilename(file.name)
    const timestamp = Date.now()
    const pathname = `episodes/${timestamp}-${safeFilename}`

    const result = await upload(pathname, file, {
      access: 'public',
      handleUploadUrl: '/api/crypto-compass/upload',
      contentType: file.type || 'video/mp4',
      multipart: file.size >= 5 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => {
        if (typeof percentage === 'number') {
          onProgress?.(Math.round(percentage))
        }
      },
    })

    return {
      success: true,
      url: result.url,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    }
  }
}
