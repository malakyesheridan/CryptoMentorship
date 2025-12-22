import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth-server'
import { put, del, list } from '@vercel/blob'
import { sanitizeFilename } from '@/lib/file-validation'

export const runtime = 'nodejs'
export const maxDuration = 300

const CHUNK_SIZE = 4 * 1024 * 1024 // 4MB chunks
const MAX_FILE_SIZE_NON_VIDEO = 1024 * 1024 * 1024 // 1GB max for non-video files
const MAX_FILE_SIZE_VIDEO = 1024 * 1024 * 1024 // 1GB max for video files

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'POST, OPTIONS',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    await requireRoleAPI(['admin', 'editor'])
    
    // Check for BLOB_READ_WRITE_TOKEN early
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN
    if (!blobToken) {
      return NextResponse.json(
        { 
          error: 'Vercel Blob Storage is not configured. Please set BLOB_READ_WRITE_TOKEN environment variable.',
          details: 'Get your token from https://vercel.com/dashboard/stores'
        },
        { status: 500 }
      )
    }
    
    const formData = await request.formData()
    const chunk = formData.get('chunk') as File
    const chunkIndex = parseInt(formData.get('chunkIndex') as string)
    const totalChunks = parseInt(formData.get('totalChunks') as string)
    const fileName = formData.get('fileName') as string
    const fileSize = parseInt(formData.get('fileSize') as string)
    const uploadId = formData.get('uploadId') as string
    const folder = (formData.get('folder') as string) || 'uploads'
    const contentType = (formData.get('contentType') as string) || null

    if (!chunk || chunkIndex === undefined || totalChunks === undefined || !fileName || !uploadId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate total file size - 1GB for all files
    const isVideoFile = contentType?.startsWith('video/') || false
    const maxFileSize = isVideoFile ? MAX_FILE_SIZE_VIDEO : MAX_FILE_SIZE_NON_VIDEO
    const maxSizeGB = 1
    if (fileSize > maxFileSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxSizeGB}GB. Your file is ${(fileSize / (1024 * 1024 * 1024)).toFixed(2)}GB` },
        { status: 400 }
      )
    }

    // Upload chunk to Vercel Blob Storage as a temporary file
    // This ensures chunks are accessible across different serverless function instances
    const chunkBlobPath = `chunks/${uploadId}-chunk-${chunkIndex}`
    
    const bytes = await chunk.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Upload chunk to blob storage with retry logic
    let uploadSuccess = false
    let lastUploadError: Error | null = null
    const MAX_UPLOAD_RETRIES = 3
    
    for (let attempt = 0; attempt < MAX_UPLOAD_RETRIES; attempt++) {
      try {
        await put(chunkBlobPath, buffer, {
          access: 'public',
          contentType: 'application/octet-stream',
          addRandomSuffix: false, // Keep predictable path for assembly
          token: blobToken,
        })
        uploadSuccess = true
        break
      } catch (uploadError) {
        lastUploadError = uploadError instanceof Error ? uploadError : new Error(String(uploadError))
        
        // Don't retry on the last attempt
        if (attempt < MAX_UPLOAD_RETRIES - 1) {
          // Exponential backoff: wait 500ms, 1s, 2s
          const backoffMs = 500 * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, backoffMs))
          continue
        }
      }
    }
    
    if (!uploadSuccess) {
      throw new Error(`Failed to upload chunk ${chunkIndex} after ${MAX_UPLOAD_RETRIES} attempts: ${lastUploadError?.message || 'Unknown error'}`)
    }

    // If this is the last chunk, assemble the file and upload to Blob Storage
    if (chunkIndex === totalChunks - 1) {
      const safeFilename = sanitizeFilename(fileName)
      const timestamp = Date.now()
      const finalFileName = `${timestamp}-${safeFilename}`
      const blobPath = `${folder}/${finalFileName}`

      // Store chunk URLs for cleanup
      const chunkUrls: string[] = []
      
      try {
        // Read all chunks from Blob Storage and assemble
        const chunkBuffers: Buffer[] = []
        
        // First, collect all chunk URLs with retry logic
        for (let i = 0; i < totalChunks; i++) {
          const currentChunkPath = `chunks/${uploadId}-chunk-${i}`
          
          // Retry logic: chunks might not be immediately available
          let chunkBlob = null
          let retries = 3
          while (retries > 0 && !chunkBlob) {
            const blobs = await list({
              prefix: currentChunkPath,
              limit: 1,
              token: blobToken,
            })
            
            if (blobs.blobs.length > 0) {
              chunkBlob = blobs.blobs[0]
              break
            }
            
            // Wait a bit before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 500 * (4 - retries)))
            retries--
          }
          
          if (!chunkBlob) {
            throw new Error(`Missing chunk ${i} of ${totalChunks} (uploadId: ${uploadId})`)
          }
          
          chunkUrls.push(chunkBlob.url)
        }
        
        // Fetch chunks with retry logic and timeout handling
        // For large files, fetch in smaller batches to avoid connection issues
        const BATCH_SIZE = 10 // Fetch 10 chunks at a time
        const FETCH_TIMEOUT = 30000 // 30 second timeout per chunk
        const MAX_RETRIES = 3
        
        const fetchChunkWithRetry = async (url: string, index: number): Promise<Buffer> => {
          let lastError: Error | null = null
          
          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
              // Create abort controller for timeout
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
              
              try {
                const chunkResponse = await fetch(url, {
                  signal: controller.signal,
                  headers: {
                    'Accept': 'application/octet-stream',
                  }
                })
                
                clearTimeout(timeoutId)
                
                if (!chunkResponse.ok) {
                  throw new Error(`HTTP ${chunkResponse.status}: ${chunkResponse.statusText}`)
                }
                
                const chunkArrayBuffer = await chunkResponse.arrayBuffer()
                return Buffer.from(chunkArrayBuffer)
              } catch (fetchError) {
                clearTimeout(timeoutId)
                
                if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                  throw new Error(`Timeout fetching chunk ${index} after ${FETCH_TIMEOUT}ms`)
                }
                throw fetchError
              }
            } catch (error) {
              lastError = error instanceof Error ? error : new Error(String(error))
              
              // Don't retry on the last attempt
              if (attempt < MAX_RETRIES - 1) {
                // Exponential backoff: wait 1s, 2s, 4s
                const backoffMs = 1000 * Math.pow(2, attempt)
                await new Promise(resolve => setTimeout(resolve, backoffMs))
                continue
              }
            }
          }
          
          throw new Error(`Failed to fetch chunk ${index} after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`)
        }
        
        // Fetch chunks in batches to avoid overwhelming connections
        for (let batchStart = 0; batchStart < chunkUrls.length; batchStart += BATCH_SIZE) {
          const batchEnd = Math.min(batchStart + BATCH_SIZE, chunkUrls.length)
          const batch = chunkUrls.slice(batchStart, batchEnd)
          
          const batchPromises = batch.map((url, batchIndex) => 
            fetchChunkWithRetry(url, batchStart + batchIndex)
          )
          
          const batchBuffers = await Promise.all(batchPromises)
          chunkBuffers.push(...batchBuffers)
        }

        // Assemble all chunks
        const finalFileData = Buffer.concat(chunkBuffers)
        
        // Detect content type from file extension if not provided
        let detectedContentType = contentType
        if (!detectedContentType) {
          const ext = fileName.split('.').pop()?.toLowerCase()
          const mimeTypes: Record<string, string> = {
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'mov': 'video/quicktime',
            'avi': 'video/x-msvideo',
            'mkv': 'video/x-matroska',
          }
          detectedContentType = mimeTypes[ext || ''] || 'video/mp4'
        }
        
        // Upload final file to Vercel Blob Storage
        try {
          const blob = await put(blobPath, finalFileData, {
            access: 'public',
            contentType: detectedContentType,
            token: blobToken,
          })

          // Clean up temporary chunk blobs (non-blocking)
          // Use the URLs we already collected during assembly
          chunkUrls.forEach(url => {
            del(url, { token: blobToken }).catch(() => {}) // Ignore cleanup errors
          })

          return NextResponse.json({
            success: true,
            url: blob.url,
            path: blob.pathname,
            fileName: finalFileName,
            complete: true
          })
        } catch (blobError) {
          console.error('Vercel Blob upload error:', blobError)
          
          if (!process.env.BLOB_READ_WRITE_TOKEN) {
            return NextResponse.json(
              { 
                error: 'Vercel Blob Storage is not configured. Please set BLOB_READ_WRITE_TOKEN environment variable.',
                details: 'Get your token from https://vercel.com/dashboard/stores'
              },
              { status: 500 }
            )
          }

          return NextResponse.json(
            { 
              error: 'Failed to upload to Vercel Blob Storage',
              details: blobError instanceof Error ? blobError.message : 'Unknown error'
            },
            { status: 500 }
          )
        }
      } catch (error) {
        // Cleanup chunks on error (non-blocking)
        // First, try to clean up chunks we already found
        chunkUrls.forEach(url => {
          del(url, { token: blobToken }).catch(() => {})
        })
        
        // Also try to find and clean up any remaining chunks
        for (let i = 0; i < totalChunks; i++) {
          const currentChunkPath = `chunks/${uploadId}-chunk-${i}`
          list({
            prefix: currentChunkPath,
            limit: 1,
            token: blobToken,
          }).then(blobs => {
            if (blobs.blobs.length > 0) {
              return del(blobs.blobs[0].url, { token: blobToken }).catch(() => {})
            }
          }).catch(() => {})
        }
        throw error
      }
    }

    return NextResponse.json({
      success: true,
      chunkIndex,
      complete: false
    })
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Chunk upload error:', error)
    
    // Provide more helpful error messages
    let errorMessage = 'Upload failed'
    if (error instanceof Error) {
      if (error.message.includes('ECONNRESET') || error.message.includes('terminated')) {
        errorMessage = 'Connection error during upload. Please try again. If the problem persists, try uploading a smaller file or check your internet connection.'
      } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        errorMessage = 'Upload timed out. Please try again with a smaller file or better internet connection.'
      } else if (error.message.includes('Missing chunk')) {
        errorMessage = 'Some upload chunks are missing. Please try uploading again.'
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}


