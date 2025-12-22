import { NextRequest, NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { requireUploadRole } from '@/lib/upload-auth'
import { sanitizeFilename } from '@/lib/file-validation'

export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_CONTENT_TYPES = ['image/*']
const ALLOWED_FOLDER = 'covers'

function assertValidPathname(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length !== 2 || parts[0] !== ALLOWED_FOLDER) {
    throw new Error('Invalid upload path')
  }

  const filename = parts[1]
  const safeFilename = sanitizeFilename(filename)
  if (safeFilename !== filename) {
    throw new Error('Invalid filename')
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HandleUploadBody

    if (body.type === 'blob.generate-client-token') {
      const auth = await requireUploadRole(request, ['admin', 'editor'])
      if (auth instanceof NextResponse) {
        return auth
      }
    }

    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        assertValidPathname(pathname)
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: false,
          allowOverwrite: false,
        }
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
