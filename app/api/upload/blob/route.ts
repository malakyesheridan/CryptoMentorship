import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-server'
import { put } from '@vercel/blob'
import { sanitizeFilename } from '@/lib/file-validation'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['admin', 'editor'])
    
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

    // Validate file size (100MB limit)
    const maxFileSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 100MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB` },
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
    console.error('Blob upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

