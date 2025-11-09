import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { validateFileContent, sanitizeFilename, validateFileSize } from '@/lib/file-validation'

export async function POST(req: NextRequest) {
  logger.info('Simple video upload API called')
  
  let file: File | null = null
  let title: string | null = null
  
  try {
    logger.debug('Testing prisma connection')
    const userCount = await prisma.user.count()
    logger.debug('Prisma connection verified', { userCount })
    
    // Ensure upload directories exist
    const uploadDir = join(process.cwd(), 'uploads', 'videos')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
      logger.debug('Created upload directory')
    }
    
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
      logger.warn('Simple video upload attempted without file')
      return NextResponse.json(
        { ok: false, code: 'NO_FILE', message: 'No video file provided' },
        { status: 400 }
      )
    }
    
    if (!title) {
      logger.warn('Simple video upload attempted without title')
      return NextResponse.json(
        { ok: false, code: 'NO_TITLE', message: 'Title is required' },
        { status: 400 }
      )
    }
    
    // Convert file to buffer for validation
    logger.debug('Converting file to buffer for validation')
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    logger.debug('File converted', { size: bytes.byteLength })
    
    // ✅ Validate file size (max 100MB for videos)
    if (!validateFileSize(buffer, 100)) {
      logger.warn('File too large', { size: buffer.length })
      return NextResponse.json(
        { ok: false, error: 'File too large (max 100MB)' },
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
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const extension = safeFilename.split('.').pop() || 'mp4'
    const filename = `${timestamp}-${random}.${extension}`
    const filePath = join(uploadDir, filename)
    
    logger.debug('Saving file', { filePath: filename })
    
    // Save file to disk
    try {
      await writeFile(filePath, buffer)
      logger.debug('File saved successfully')
    } catch (fileError) {
      logger.error(
        'File save error',
        fileError instanceof Error ? fileError : new Error(String(fileError)),
        { filePath }
      )
      throw new Error(`Failed to save file: ${fileError}`)
    }
    
    // ✅ Require authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      logger.warn('Simple video upload attempted without authentication')
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
        status: 'ready',
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
    
    logger.info('Simple video upload successful')
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
      'Simple video upload error',
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
    return NextResponse.json({ ok: true, items: videos })
  } catch (error) {
    logger.error(
      'Error fetching videos',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      { ok: false, message: 'Failed to fetch videos' },
      { status: 500 }
    )
  }
}
