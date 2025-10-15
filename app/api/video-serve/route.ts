import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { VIDEO_CONFIG } from '@/lib/video-storage'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const filename = url.searchParams.get('file')
    
    console.log(`🎥 Video serve request for file: ${filename}`)
    
    if (!filename) {
      console.log('❌ No filename provided')
      return NextResponse.json(
        { ok: false, message: 'No filename provided' },
        { status: 400 }
      )
    }
    
    // Security: Only allow files from our upload directory
    const filePath = join(VIDEO_CONFIG.UPLOAD_DIR, filename)
    console.log(`📁 Looking for file at: ${filePath}`)
    
    // Check if file exists and is within our directory
    if (!filePath.startsWith(VIDEO_CONFIG.UPLOAD_DIR)) {
      console.log('❌ Invalid file path - security check failed')
      return NextResponse.json(
        { ok: false, message: 'Invalid file path' },
        { status: 403 }
      )
    }
    
    try {
      const fileBuffer = await readFile(filePath)
      
      // Determine content type based on file extension
      const extension = filename.split('.').pop()?.toLowerCase()
      let contentType = 'video/mp4' // default
      
      switch (extension) {
        case 'mp4':
          contentType = 'video/mp4'
          break
        case 'webm':
          contentType = 'video/webm'
          break
        case 'mov':
          contentType = 'video/quicktime'
          break
        case 'avi':
          contentType = 'video/x-msvideo'
          break
        default:
          contentType = 'video/mp4'
      }
      
      console.log(`Serving video file: ${filename}, Content-Type: ${contentType}`)
      
      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
          'Accept-Ranges': 'bytes', // Enable range requests for video seeking
        },
      })
    } catch (error) {
      console.error(`❌ Error reading file ${filename}:`, error)
      return NextResponse.json(
        { ok: false, message: 'File not found' },
        { status: 404 }
      )
    }
    
  } catch (error) {
    console.error('Video serve error:', error)
    return NextResponse.json(
      { ok: false, message: 'Failed to serve video' },
      { status: 500 }
    )
  }
}
