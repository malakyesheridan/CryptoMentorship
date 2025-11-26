import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Serve files from /tmp in Vercel
export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filePath = process.env.VERCEL
      ? join('/tmp/uploads/episodes', params.filename)
      : join(process.cwd(), 'uploads/episodes', params.filename)

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const fileData = await readFile(filePath)
    
    // Determine content type from file extension
    const ext = params.filename.split('.').pop()?.toLowerCase()
    const contentType = ext === 'mp4' ? 'video/mp4' 
      : ext === 'webm' ? 'video/webm'
      : ext === 'mov' ? 'video/quicktime'
      : ext === 'avi' ? 'video/x-msvideo'
      : 'application/octet-stream'

    return new NextResponse(new Uint8Array(fileData), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileData.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    )
  }
}

