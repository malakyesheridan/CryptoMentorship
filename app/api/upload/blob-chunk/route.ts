import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-server'
import { put } from '@vercel/blob'
import { writeFile, readFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { sanitizeFilename } from '@/lib/file-validation'

export const runtime = 'nodejs'
export const maxDuration = 300

const CHUNK_SIZE = 4 * 1024 * 1024 // 4MB chunks
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
    const folder = (formData.get('folder') as string) || 'uploads'
    const contentType = (formData.get('contentType') as string) || null

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

    // Use /tmp for temporary chunk storage (only writable directory on Vercel)
    const uploadDir = '/tmp/uploads/chunks'
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save chunk to temporary file
    const chunkFileName = `${uploadId}-chunk-${chunkIndex}`
    const chunkPath = join(uploadDir, chunkFileName)
    
    const bytes = await chunk.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(chunkPath, buffer)

    // If this is the last chunk, assemble the file and upload to Blob Storage
    if (chunkIndex === totalChunks - 1) {
      const safeFilename = sanitizeFilename(fileName)
      const timestamp = Date.now()
      const finalFileName = `${timestamp}-${safeFilename}`
      const blobPath = `${folder}/${finalFileName}`
      
      const finalPath = join('/tmp/uploads', finalFileName)

      try {
        // Assemble chunks
        for (let i = 0; i < totalChunks; i++) {
          const currentChunkPath = join(uploadDir, `${uploadId}-chunk-${i}`)
          if (existsSync(currentChunkPath)) {
            const chunkData = await readFile(currentChunkPath)
            if (i === 0) {
              await writeFile(finalPath, chunkData)
            } else {
              const existingData = await readFile(finalPath)
              await writeFile(finalPath, Buffer.concat([existingData, chunkData]))
            }
            // Clean up chunk file
            await unlink(currentChunkPath).catch(() => {})
          } else {
            throw new Error(`Missing chunk ${i} of ${totalChunks}`)
          }
        }

        // Read the assembled file
        const finalFileData = await readFile(finalPath)
        
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
        
        // Upload to Vercel Blob Storage
        try {
          const blob = await put(blobPath, finalFileData, {
            access: 'public',
            contentType: detectedContentType,
          })

          // Clean up temp file
          await unlink(finalPath).catch(() => {})

          return NextResponse.json({
            success: true,
            url: blob.url,
            path: blob.pathname,
            fileName: finalFileName,
            complete: true
          })
        } catch (blobError) {
          console.error('Vercel Blob upload error:', blobError)
          
          // Clean up temp file
          await unlink(finalPath).catch(() => {})
          
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
        // Cleanup on error
        for (let i = 0; i < totalChunks; i++) {
          const currentChunkPath = join(uploadDir, `${uploadId}-chunk-${i}`)
          if (existsSync(currentChunkPath)) {
            await unlink(currentChunkPath).catch(() => {})
          }
        }
        if (existsSync(finalPath)) {
          await unlink(finalPath).catch(() => {})
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

