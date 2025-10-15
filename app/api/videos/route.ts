import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import {
  VIDEO_CONFIG,
  ensureUploadDirs,
  generateVideoFilename,
  validateVideoFile
} from '@/lib/video-storage'

export async function POST(req: NextRequest) {
  console.log('🚀 Video upload API called')
  
  try {
    // Ensure upload directories exist
    console.log('📁 Ensuring upload directories...')
    await ensureUploadDirs()
    console.log('✅ Upload directories ensured')
    
    console.log('📝 Processing form data...')
    const formData = await req.formData()
    const file = formData.get('video') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const visibility = formData.get('visibility') as string || 'member'
    
    console.log('📋 Form data received:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      title,
      description,
      visibility
    })
    
    if (!file) {
      console.log('❌ No file provided')
      return NextResponse.json(
        { ok: false, code: 'NO_FILE', message: 'No video file provided' },
        { status: 400 }
      )
    }
    
    if (!title) {
      console.log('❌ No title provided')
      return NextResponse.json(
        { ok: false, code: 'NO_TITLE', message: 'Title is required' },
        { status: 400 }
      )
    }
    
    console.log('🔍 Validating file...')
    // Validate file
    const validation = validateVideoFile(file)
    if (!validation.valid) {
      console.log('❌ File validation failed:', validation.error)
      return NextResponse.json(
        { ok: false, code: 'INVALID_FILE', message: validation.error },
        { status: 400 }
      )
    }
    console.log('✅ File validation passed')
    
    // Generate unique filename
    console.log('📝 Generating filename...')
    const filename = generateVideoFilename(file.name)
    const filePath = join(VIDEO_CONFIG.UPLOAD_DIR, filename)
    console.log(`📁 File path: ${filePath}`)
    
    // Convert file to buffer and save
    console.log('💾 Converting file to buffer...')
    try {
      const bytes = await file.arrayBuffer()
      console.log(`📊 File size: ${bytes.byteLength} bytes`)
      const buffer = Buffer.from(bytes)
      console.log('💾 Saving file to disk...')
      await writeFile(filePath, buffer)
      console.log('✅ File saved successfully')
    } catch (fileError) {
      console.error('❌ File save error:', fileError)
      throw new Error(`Failed to save file: ${fileError}`)
    }
    
    // Create demo user for upload (since we don't have auth yet)
    console.log('👤 Creating/updating demo user...')
    const demoUser = await prisma.user.upsert({
      where: { email: 'demo-admin@example.com' },
      update: {},
      create: {
        email: 'demo-admin@example.com',
        name: 'Demo Admin',
        role: 'admin',
      },
    })
    console.log(`✅ Demo user created/found: ${demoUser.id}`)
    
    // Create video record in database
    console.log('💾 Creating video record in database...')
    const video = await prisma.video.create({
      data: {
        title,
        description: description || null,
        filename: file.name,
        filePath: `/uploads/videos/${filename}`,
        fileSize: file.size,
        mimeType: file.type,
        status: 'ready', // For now, skip processing
        visibility,
        uploadedBy: demoUser.id,
      },
      include: {
        uploader: {
          select: { id: true, name: true, email: true }
        }
      }
    })
    console.log(`✅ Video record created: ${video.id}`)
    
    console.log('🎉 Upload successful! Returning response...')
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
    console.error('❌ Video upload error:', error)
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
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
    console.error('Video fetch error:', error)
    return NextResponse.json(
      { ok: false, code: 'FETCH_ERROR', message: 'Failed to fetch videos' },
      { status: 500 }
    )
  }
}
