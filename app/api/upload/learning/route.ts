import { NextRequest, NextResponse } from 'next/server'
import { handleUpload } from '@vercel/blob/client'
import { nanoid } from 'nanoid'
import { requireUploadRole } from '@/lib/upload-auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { logger } from '@/lib/logger'
import {
  UPLOAD_ALLOWED_MIME_TYPES,
  formatBytes,
  getMaxSizeForMime,
  inferMimeTypeFromFilename
} from '@/lib/upload-config'

export const runtime = 'nodejs'
export const maxDuration = 300

function parseClientPayload(payload: string | null): {
  requestId?: string
  folder?: string
  originalName?: string
  contentType?: string
  size?: number
} | null {
  if (!payload) return null
  try {
    return JSON.parse(payload)
  } catch {
    return null
  }
}

function createRequestId() {
  return `lh_upload_${nanoid(10)}`
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || createRequestId()
  let userId: string | null = null

  try {
    const auth = await requireUploadRole(request, ['admin', 'editor'])
    if (auth instanceof NextResponse) {
      return auth
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          error: 'Vercel Blob Storage is not configured. Please set BLOB_READ_WRITE_TOKEN environment variable.',
          requestId
        },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body', requestId }, { status: 400 })
    }

    const user = auth.user
    userId = user.id || null

    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = parseClientPayload(clientPayload)
        const contentType = payload?.contentType || inferMimeTypeFromFilename(pathname)

        if (!contentType || !UPLOAD_ALLOWED_MIME_TYPES.includes(contentType)) {
          throw new Error('Unsupported file type. Please upload a supported video, PDF, or image file.')
        }

        const maxSize = getMaxSizeForMime(contentType)
        if (payload?.size && maxSize && payload.size > maxSize) {
          throw new Error(
            `File too large. Maximum size is ${formatBytes(maxSize)}. Your file is ${formatBytes(payload.size)}.`
          )
        }

        const tokenPayload = JSON.stringify({
          requestId,
          userId: user.id,
          contentType,
          size: payload?.size || null,
          originalName: payload?.originalName || null,
          pathname
        })

        logger.info('Learning upload token requested', {
          requestId,
          userId: user.id,
          contentType,
          size: payload?.size || null,
          pathname
        })

        logAudit(prisma, user.id || 'unknown', 'upload_request', 'learning_upload', undefined, {
          requestId,
          contentType,
          size: payload?.size || null,
          pathname,
          originalName: payload?.originalName || null
        }).catch(() => {})

        return {
          allowedContentTypes: [contentType],
          maximumSizeInBytes: maxSize || undefined,
          tokenPayload
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        let parsedPayload: any = null
        try {
          parsedPayload = tokenPayload ? JSON.parse(tokenPayload) : null
        } catch {
          parsedPayload = null
        }

        logger.info('Learning upload completed', {
          requestId: parsedPayload?.requestId || requestId,
          blobPath: blob.pathname,
          blobUrl: blob.url,
          contentType: blob.contentType
        })

        await logAudit(
          prisma,
          parsedPayload?.userId || user.id || 'unknown',
          'upload_complete',
          'learning_upload',
          undefined,
          {
            requestId: parsedPayload?.requestId || requestId,
            blobPath: blob.pathname,
            blobUrl: blob.url,
            contentType: blob.contentType,
            originalName: parsedPayload?.originalName || null,
            size: parsedPayload?.size || null
          }
        )
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    logger.error('Learning upload handle failed', error instanceof Error ? error : undefined, {
      requestId
    })

    if (userId) {
      logAudit(prisma, userId, 'upload_error', 'learning_upload', undefined, {
        requestId,
        error: message
      }).catch(() => {})
    }

    return NextResponse.json({ error: message, requestId }, { status: 500 })
  }
}
