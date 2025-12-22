import { NextRequest, NextResponse } from 'next/server'
import { sanitizeFilename } from '@/lib/file-validation'
import { requireUploadRole } from '@/lib/upload-auth'

export const runtime = 'nodejs'
export const maxDuration = 300

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
    const auth = await requireUploadRole(request, ['admin', 'editor'])
    if (auth instanceof NextResponse) {
      return auth
    }
    
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
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'uploads'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const { put } = await import('@vercel/blob')

    // Validate file size - 1GB for all files
    const isVideoFile = file.type.startsWith('video/')
    const maxFileSize = 1024 * 1024 * 1024 // 1GB for all files
    const maxSizeGB = 1
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxSizeGB}GB. Your file is ${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB` },
        { status: 400 }
      )
    }

    // Generate unique filename
    const safeFilename = sanitizeFilename(file.name)
    const timestamp = Date.now()
    const filename = `${timestamp}-${safeFilename}`
    const blobPath = `${folder}/${filename}`

    // Read file as buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Vercel Blob Storage
    try {
      const blob = await put(blobPath, buffer, {
        access: 'public',
        contentType: file.type || 'application/octet-stream',
        token: blobToken,
      })

      return NextResponse.json({
        success: true,
        url: blob.url,
        path: blob.pathname
      })
    } catch (blobError) {
      console.error('Vercel Blob upload error:', blobError)
      
      // Check if BLOB_READ_WRITE_TOKEN is configured
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
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Blob upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

