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
        
        // If needsUpload flag is set, we need to upload the assembled file
        if (result.needsUpload && result.fileData) {
          // Convert base64 back to File
          const binaryString = atob(result.fileData)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          const blob = new Blob([bytes], { type: result.mimeType || 'video/mp4' })
          const assembledFile = new File([blob], result.fileName, { type: result.mimeType || 'video/mp4' })
          
          // Upload via regular endpoint
          const uploadFormData = new FormData()
          uploadFormData.append('video', assembledFile)
          uploadFormData.append('title', file.name.replace(/\.[^/.]+$/, '')) // Use original filename without extension
          uploadFormData.append('description', '')
          uploadFormData.append('slug', file.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim())
          
          const uploadResponse = await fetch('/api/admin/episodes', {
            method: 'POST',
            body: uploadFormData,
          })
          
          if (!uploadResponse.ok) {
            const error = await uploadResponse.json().catch(() => ({ error: `HTTP ${uploadResponse.status}` }))
            return {
              success: false,
              error: error.error || 'Failed to upload assembled file'
            }
          }
          
          const uploadResult = await uploadResponse.json()
          return {
            success: true,
            videoUrl: uploadResult.videoUrl,
            fileName: result.fileName
          }
        }
        
        // Direct file path (local development)
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

