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

    // Ensure upload directory exists
    const uploadDir = join(process.cwd(), 'uploads', 'episodes', 'chunks')
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
      const finalDir = join(process.cwd(), 'uploads', 'episodes')
      if (!existsSync(finalDir)) {
        await mkdir(finalDir, { recursive: true })
      }
      const finalPath = join(finalDir, finalFileName)

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

        const videoUrl = `/uploads/episodes/${finalFileName}`
        
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

