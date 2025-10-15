import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  console.log('🚀 SIMPLE Video upload API called')
  
  try {
    console.log('🧪 Testing prisma connection...')
    const userCount = await prisma.user.count()
    console.log('✅ Prisma working, user count:', userCount)
    
    // Ensure upload directories exist
    const uploadDir = join(process.cwd(), 'uploads', 'videos')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
      console.log('✅ Created upload directory')
    }
    
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
    
    // Generate unique filename
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop() || 'mp4'
    const filename = `${timestamp}-${random}.${extension}`
    const filePath = join(uploadDir, filename)
    
    console.log(`📁 Saving file to: ${filePath}`)
    
    // Convert file to buffer and save
    try {
      const bytes = await file.arrayBuffer()
      console.log(`📊 File size: ${bytes.byteLength} bytes`)
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)
      console.log('✅ File saved successfully')
    } catch (fileError) {
      console.error('❌ File save error:', fileError)
      throw new Error(`Failed to save file: ${fileError}`)
    }
    
    // Create demo user for upload
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
        filename: filename, // Use the generated unique filename
        filePath: `/uploads/videos/${filename}`,
        fileSize: file.size,
        mimeType: file.type,
        status: 'ready',
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
    return NextResponse.json({ ok: true, items: videos })
  } catch (error) {
    console.error('Error fetching videos:', error)
    return NextResponse.json(
      { ok: false, message: 'Failed to fetch videos' },
      { status: 500 }
    )
  }
}
