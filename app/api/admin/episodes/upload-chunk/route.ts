import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-server'
import { writeFile, appendFile, mkdir, readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { sanitizeFilename } from '@/lib/file-validation'

// Configure route for chunked uploads
export const runtime = 'nodejs'
export const maxDuration = 300

const CHUNK_SIZE = 4 * 1024 * 1024 // 4MB chunks (under Vercel's 4.5MB limit)
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB max

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['admin', 'editor'])
    
    const formData = await request.formData()
    const chunk = formData.get('chunk') as File
    const chunkIndex = parseInt(formData.get('chunkIndex') as string)
    const totalChunks = parseInt(formData.get('totalChunks') as string)
    const fileName = formData.get('fileName') as string
    const fileSize = parseInt(formData.get('fileSize') as string)
    const uploadId = formData.get('uploadId') as string

    if (!chunk || chunkIndex === undefined || totalChunks === undefined || !fileName || !uploadId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate total file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 100MB. Your file is ${(fileSize / (1024 * 1024)).toFixed(2)}MB` },
        { status: 400 }
      )
    }

    // Use /tmp for Vercel serverless (only writable directory)
    // In production, files are ephemeral but sufficient for chunk assembly
    const uploadDir = process.env.VERCEL ? '/tmp/uploads/episodes/chunks' : join(process.cwd(), 'uploads', 'episodes', 'chunks')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save chunk to temporary file
    const chunkFileName = `${uploadId}-chunk-${chunkIndex}`
    const chunkPath = join(uploadDir, chunkFileName)
    
    const bytes = await chunk.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(chunkPath, buffer)

    // If this is the last chunk, assemble the file
    if (chunkIndex === totalChunks - 1) {
      const safeFilename = sanitizeFilename(fileName)
      const timestamp = Date.now()
      const finalFileName = `${timestamp}-${safeFilename}`
      // Use /tmp for Vercel, regular path for local dev
      const finalDir = process.env.VERCEL ? '/tmp/uploads/episodes' : join(process.cwd(), 'uploads', 'episodes')
      if (!existsSync(finalDir)) {
        await mkdir(finalDir, { recursive: true })
      }
      const finalPath = join(finalDir, finalFileName)
      
      // For Vercel, we need to upload to a persistent storage after assembly
      // For now, we'll store the file data and return it to be saved via the regular upload endpoint

      try {
        // Assemble chunks
        for (let i = 0; i < totalChunks; i++) {
          const currentChunkPath = join(uploadDir, `${uploadId}-chunk-${i}`)
          if (existsSync(currentChunkPath)) {
            const chunkData = await readFile(currentChunkPath)
            if (i === 0) {
              await writeFile(finalPath, chunkData)
            } else {
              await appendFile(finalPath, chunkData)
            }
            // Clean up chunk file
            await unlink(currentChunkPath)
          } else {
            // Missing chunk - cleanup and fail
            throw new Error(`Missing chunk ${i} of ${totalChunks}`)
          }
        }

        // Read the assembled file
        const finalFileData = await readFile(finalPath)
        
        // Try to use Vercel Blob Storage if available
        let videoUrl: string | null = null
        let needsUpload = false
        
        if (process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN) {
          try {
            const { put } = await import('@vercel/blob')
            const blob = await put(`episodes/${finalFileName}`, finalFileData, {
              access: 'public',
              contentType: 'video/mp4',
            })
            videoUrl = blob.url
          } catch (blobError) {
            console.error('Vercel Blob upload failed, falling back to base64:', blobError)
            // Fall back to base64 method
            needsUpload = true
          }
        } else if (process.env.VERCEL) {
          // No blob storage configured, use base64 method
          needsUpload = true
        } else {
          // Local development - use regular file path
          videoUrl = `/uploads/episodes/${finalFileName}`
        }
        
        // Clean up temp files
        try {
          await unlink(finalPath)
        } catch (e) {
          // Ignore cleanup errors
        }
        
        if (needsUpload) {
          // Return base64 data for client to upload
          const base64Data = finalFileData.toString('base64')
          return NextResponse.json({
            success: true,
            fileName: finalFileName,
            fileData: base64Data,
            fileSize: finalFileData.length,
            mimeType: 'video/mp4',
            complete: true,
            needsUpload: true
          })
        }
        
        return NextResponse.json({
          success: true,
          videoUrl,
          fileName: finalFileName,
          complete: true
        })
      } catch (error) {
        // Cleanup on error - remove any remaining chunks
        for (let i = 0; i < totalChunks; i++) {
          const currentChunkPath = join(uploadDir, `${uploadId}-chunk-${i}`)
          if (existsSync(currentChunkPath)) {
            try {
              await unlink(currentChunkPath)
            } catch (cleanupError) {
              console.error(`Failed to cleanup chunk ${i}:`, cleanupError)
            }
          }
        }
        // Remove partial file if it exists
        if (existsSync(finalPath)) {
          try {
            await unlink(finalPath)
          } catch (cleanupError) {
            console.error('Failed to cleanup partial file:', cleanupError)
          }
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

