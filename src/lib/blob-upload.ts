/**
 * Vercel Blob Storage upload utility
 * Handles direct client-side uploads to Vercel Blob Storage
 */

export interface BlobUploadOptions {
  file: File
  folder?: string
  onProgress?: (progress: number) => void
}

export interface BlobUploadResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Upload file directly to Vercel Blob Storage via API route
 * This is the recommended approach for Vercel serverless functions
 */
export async function uploadToBlob({
  file,
  folder = 'uploads',
  onProgress
}: BlobUploadOptions): Promise<BlobUploadResult> {
  try {
    // Validate file size (100MB limit)
    const maxFileSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxFileSize) {
      return {
        success: false,
        error: `File too large. Maximum size is 100MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`
      }
    }

    // For files larger than 4MB, we need to use chunked upload
    // For smaller files, we can upload directly
    const useChunkedUpload = file.size > 4 * 1024 * 1024

    if (useChunkedUpload) {
      return await uploadChunkedToBlob(file, folder, onProgress)
    } else {
      return await uploadDirectToBlob(file, folder, onProgress)
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Direct upload for small files (< 4MB)
 */
async function uploadDirectToBlob(
  file: File,
  folder: string,
  onProgress?: (progress: number) => void
): Promise<BlobUploadResult> {
  try {
    onProgress?.(10)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)

    const response = await fetch('/api/upload/blob', {
      method: 'POST',
      body: formData,
    })

    onProgress?.(90)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
      return {
        success: false,
        error: error.error || `Upload failed: HTTP ${response.status}`
      }
    }

    const result = await response.json()
    onProgress?.(100)

    return {
      success: true,
      url: result.url
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Chunked upload for large files (> 4MB)
 */
async function uploadChunkedToBlob(
  file: File,
  folder: string,
  onProgress?: (progress: number) => void
): Promise<BlobUploadResult> {
  const CHUNK_SIZE = 4 * 1024 * 1024 // 4MB chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  const uploadId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

  try {
    // Upload chunks
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)

      const chunkFormData = new FormData()
      chunkFormData.append('chunk', chunk)
      chunkFormData.append('chunkIndex', chunkIndex.toString())
      chunkFormData.append('totalChunks', totalChunks.toString())
      chunkFormData.append('fileName', file.name)
      chunkFormData.append('fileSize', file.size.toString())
      chunkFormData.append('uploadId', uploadId)
      chunkFormData.append('folder', folder)
      chunkFormData.append('contentType', file.type || 'video/mp4')

      const response = await fetch('/api/upload/blob-chunk', {
        method: 'POST',
        body: chunkFormData,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        return {
          success: false,
          error: error.error || `Chunk upload failed: HTTP ${response.status}`
        }
      }

      const result = await response.json()

      if (result.complete && result.url) {
        onProgress?.(100)
        return {
          success: true,
          url: result.url
        }
      }

      // Update progress
      const progress = Math.round(((chunkIndex + 1) / totalChunks) * 90) // Reserve 10% for final processing
      onProgress?.(progress)
    }

    return {
      success: false,
      error: 'Upload completed but no final URL received'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Chunked upload failed'
    }
  }
}

