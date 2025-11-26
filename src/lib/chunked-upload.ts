/**
 * Chunked file upload utility for handling large files
 * Splits files into chunks and uploads them sequentially
 */

const CHUNK_SIZE = 4 * 1024 * 1024 // 4MB chunks (under Vercel's 4.5MB limit)

export interface ChunkedUploadOptions {
  file: File
  endpoint: string
  onProgress?: (progress: number) => void
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void
}

export interface ChunkedUploadResult {
  success: boolean
  videoUrl?: string
  fileName?: string
  error?: string
}

export async function uploadFileInChunks({
  file,
  endpoint,
  onProgress,
  onChunkComplete
}: ChunkedUploadOptions): Promise<ChunkedUploadResult> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  const uploadId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

  try {
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)

      const formData = new FormData()
      formData.append('chunk', chunk)
      formData.append('chunkIndex', chunkIndex.toString())
      formData.append('totalChunks', totalChunks.toString())
      formData.append('fileName', file.name)
      formData.append('fileSize', file.size.toString())
      formData.append('uploadId', uploadId)

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        return {
          success: false,
          error: error.error || `Upload failed: HTTP ${response.status}`
        }
      }

      const result = await response.json()

      if (result.complete) {
        // Last chunk uploaded and file assembled
        onProgress?.(100)
        return {
          success: true,
          videoUrl: result.videoUrl,
          fileName: result.fileName
        }
      }

      // Update progress
      const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100)
      onProgress?.(progress)
      onChunkComplete?.(chunkIndex, totalChunks)
    }

    // Should not reach here, but handle edge case
    return {
      success: false,
      error: 'Upload completed but no final result received'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

