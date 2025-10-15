import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'

// Configure upload directory
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'resources')

export async function POST(req: NextRequest) {
  console.log('🚀 Resource upload API called')

  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    console.log('🔐 Session check:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      userEmail: session?.user?.email
    })
    
    if (!session?.user?.id) {
      console.log('❌ No session or user ID found')
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ ok: false, message: 'Admin access required' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const visibility = formData.get('visibility') as string
    const tags = formData.get('tags') as string
    const kind = formData.get('kind') as string

    console.log('📋 Upload data:', {
      hasFile: !!file,
      title,
      description,
      visibility,
      tags,
      kind,
      fileSize: file?.size,
      fileType: file?.type
    })

    if (!file || !title) {
      return NextResponse.json({ ok: false, message: 'Missing required fields' }, { status: 400 })
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ ok: false, message: 'Only PDF files are allowed' }, { status: 400 })
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ ok: false, message: 'File size must be less than 50MB' }, { status: 400 })
    }

    // Ensure upload directory exists
    try {
      await mkdir(UPLOAD_DIR, { recursive: true })
    } catch (error) {
      console.error('Failed to create upload directory:', error)
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const fileExtension = file.name.split('.').pop() || 'pdf'
    const filename = `${timestamp}-${randomSuffix}.${fileExtension}`
    const filepath = join(UPLOAD_DIR, filename)

    console.log('📁 Saving file to:', filepath)

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    console.log('💾 File saved successfully')

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    // Process tags
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : []

    // Create database record
    const resource = await prisma.content.create({
      data: {
        kind: 'resource',
        title,
        excerpt: description || null,
        body: null, // Resources don't have body content
        coverUrl: null, // We'll use a default icon
        publishedAt: new Date(),
        locked: visibility !== 'public',
        minTier: visibility === 'admin' ? 'T3' : visibility === 'member' ? 'T1' : null,
        tags: JSON.stringify(tagsArray),
        slug,
      }
    })

    console.log('📝 Database record created:', resource.id)

    return NextResponse.json({
      ok: true,
      message: 'Resource uploaded successfully',
      resource: {
        id: resource.id,
        title: resource.title,
        slug: resource.slug,
        kind: resource.kind
      }
    })

  } catch (error) {
    console.error('❌ Upload error:', error)
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : 'Upload failed'
    }, { status: 500 })
  }
}
