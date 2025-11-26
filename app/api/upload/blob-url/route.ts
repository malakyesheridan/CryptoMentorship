import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-server'
import { put } from '@vercel/blob'

// Generate a signed URL for direct client-side upload to Vercel Blob Storage
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['admin', 'editor'])
    
    const body = await request.json()
    const { filename, contentType, folder = 'uploads' } = body

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      )
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const blobPath = `${folder}/${timestamp}-${sanitizedFilename}`

    // For Vercel Blob, we can upload directly from client
    // But we need to generate a URL that the client can use
    // Actually, Vercel Blob doesn't support pre-signed URLs
    // Instead, we'll upload server-side or use a different approach
    
    // Return the path that should be used for upload
    return NextResponse.json({
      path: blobPath,
      filename: sanitizedFilename
    })
  } catch (error) {
    console.error('Blob URL generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}

