import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { validateFileContent, sanitizeFilename, validateFileSize } from '@/lib/file-validation'
import {
  VIDEO_CONFIG,
  ensureUploadDirs,
  generateVideoFilename,
  validateVideoFile
} from '@/lib/video-storage'

export async function POST(req: NextRequest) {
  logger.info('Video upload API called')
  
  let file: File | null = null
  let title: string | null = null
  
  try {
    // Ensure upload directories exist
    logger.debug('Ensuring upload directories')
    await ensureUploadDirs()
    logger.debug('Upload directories ensured')
    
    logger.debug('Processing form data')
    const formData = await req.formData()
    file = formData.get('video') as File
    title = formData.get('title') as string
    const description = formData.get('description') as string
    const visibility = formData.get('visibility') as string || 'member'
    
    logger.debug('Form data received', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      hasTitle: !!title,
      visibility
    })
    
    if (!file) {
      logger.warn('Video upload attempted without file')
      return NextResponse.json(
        { ok: false, code: 'NO_FILE', message: 'No video file provided' },
        { status: 400 }
      )
    }
    
    if (!title) {
      logger.warn('Video upload attempted without title')
      return NextResponse.json(
        { ok: false, code: 'NO_TITLE', message: 'Title is required' },
        { status: 400 }
      )
    }
    
    logger.debug('Validating file')
    // Validate file (basic validation)
    const validation = validateVideoFile(file)
    if (!validation.valid) {
      logger.warn('File validation failed', { error: validation.error })
      return NextResponse.json(
        { ok: false, code: 'INVALID_FILE', message: validation.error },
        { status: 400 }
      )
    }
    logger.debug('File validation passed')
    
    // Convert file to buffer for content validation
    logger.debug('Converting file to buffer for validation')
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    logger.debug('File converted', { size: bytes.byteLength })
    
    // ✅ Validate file size (max 200MB for videos)
    if (!validateFileSize(buffer, 200)) {
      logger.warn('File too large', { size: buffer.length })
      return NextResponse.json(
        { ok: false, error: 'File too large (max 200MB)' },
        { status: 400 }
      )
    }
    
    // ✅ Verify content matches MIME type (magic bytes)
    const contentValidation = await validateFileContent(buffer, file.type)
    if (!contentValidation.valid) {
      logger.warn('File content validation failed', { error: contentValidation.error })
      return NextResponse.json(
        { ok: false, error: contentValidation.error || 'File type verification failed' },
        { status: 400 }
      )
    }
    logger.debug('File content validation passed')
    
    // ✅ Sanitize filename
    const safeFilename = sanitizeFilename(file.name)
    logger.debug('Filename sanitized', { original: file.name, sanitized: safeFilename })
    
    // Generate unique filename using sanitized name
    logger.debug('Generating unique filename')
    const filename = generateVideoFilename(safeFilename)
    const filePath = join(VIDEO_CONFIG.UPLOAD_DIR, filename)
    logger.debug('File path generated', { filePath: filename })
    
    // Save file to disk
    logger.debug('Saving file to disk')
    try {
      await writeFile(filePath, buffer)
      logger.debug('File saved successfully')
    } catch (fileError) {
      logger.error('File save error', fileError instanceof Error ? fileError : new Error(String(fileError)), {
        filePath
      })
      throw new Error(`Failed to save file: ${fileError}`)
    }
    
    // ✅ Require authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      logger.warn('Video upload attempted without authentication')
      return NextResponse.json(
        { ok: false, error: 'Authentication required' },
        { status: 401 },
      )
    }
    
    // Create video record in database
    logger.debug('Creating video record in database')
    const video = await prisma.video.create({
      data: {
        title,
        description: description || null,
        filename: safeFilename, // ✅ Use sanitized filename
        filePath: `/uploads/videos/${filename}`,
        fileSize: file.size,
        mimeType: file.type,
        status: 'ready', // For now, skip processing
        visibility,
        uploadedBy: session.user.id, // ✅ Use authenticated user
      },
      include: {
        uploader: {
          select: { id: true, name: true, email: true }
        }
      }
    })
    logger.info('Video record created', { videoId: video.id, title })
    
    logger.info('Video upload successful')
    return NextResponse.json({
      ok: true,
      video: {
        id: video.id,
        title: video.title,
        description: video.description,
        filename: video.filename,
        filePath: video.filePath,
        fileSize: video.fileSize,
        mimeType: video.mimeType,
        status: video.status,
        visibility: video.visibility,
        uploadedBy: video.uploader.name,
        createdAt: video.createdAt.toISOString(),
      }
    })
    
  } catch (error) {
    logger.error(
      'Video upload error',
      error instanceof Error ? error : new Error(String(error)),
      {
        hasFile: !!file,
        hasTitle: !!title,
      }
    )
    return NextResponse.json(
      { 
        ok: false, 
        code: 'UPLOAD_ERROR', 
        message: error instanceof Error ? error.message : 'Failed to upload video' 
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const videos = await prisma.video.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { views: true }
        }
      }
    })
    
    return NextResponse.json({
      ok: true,
      videos: videos.map(video => ({
        id: video.id,
        title: video.title,
        description: video.description,
        filename: video.filename,
        filePath: video.filePath,
        thumbnail: video.thumbnail,
        duration: video.duration,
        fileSize: video.fileSize,
        mimeType: video.mimeType,
        status: video.status,
        visibility: video.visibility,
        uploadedBy: video.uploader.name,
        viewCount: video._count.views,
        createdAt: video.createdAt.toISOString(),
      }))
    })
    
  } catch (error) {
    logger.error(
      'Video fetch error',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      { ok: false, code: 'FETCH_ERROR', message: 'Failed to fetch videos' },
      { status: 500 }
    )
  }
}
