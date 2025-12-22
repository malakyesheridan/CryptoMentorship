import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-server'
import { put, del, list } from '@vercel/blob'
import { sanitizeFilename } from '@/lib/file-validation'

export const runtime = 'nodejs'
export const maxDuration = 300

const CHUNK_SIZE = 4 * 1024 * 1024 // 4MB chunks
const MAX_FILE_SIZE_NON_VIDEO = 1024 * 1024 * 1024 // 1GB max for non-video files
const MAX_FILE_SIZE_VIDEO = 1024 * 1024 * 1024 // 1GB max for video files

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['admin', 'editor'])
    
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
    
    // Upload chunk to blob storage
    await put(chunkBlobPath, buffer, {
      access: 'public',
      contentType: 'application/octet-stream',
      addRandomSuffix: false, // Keep predictable path for assembly
      token: blobToken,
    })

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
        
        // Now fetch all chunks in parallel
        const chunkPromises = chunkUrls.map(async (url, index) => {
          const chunkResponse = await fetch(url)
          if (!chunkResponse.ok) {
            throw new Error(`Failed to read chunk ${index} from blob storage: HTTP ${chunkResponse.status}`)
          }
          const chunkArrayBuffer = await chunkResponse.arrayBuffer()
          return Buffer.from(chunkArrayBuffer)
        })
        
        chunkBuffers.push(...await Promise.all(chunkPromises))

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
    console.error('Chunk upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}


