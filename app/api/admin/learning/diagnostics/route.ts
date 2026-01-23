import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import {
  UPLOAD_ALLOWED_MIME_TYPES,
  VIDEO_MAX_SIZE_BYTES,
  PDF_MAX_SIZE_BYTES,
  IMAGE_MAX_SIZE_BYTES,
  formatBytes
} from '@/lib/upload-config'

function parseMetadata(metadata: string | null) {
  if (!metadata) return null
  try {
    return JSON.parse(metadata)
  } catch {
    return { raw: metadata }
  }
}

export async function GET() {
  try {
    await requireAdmin()
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    throw error
  }

  const recentUploads = await prisma.audit.findMany({
    where: { subjectType: 'learning_upload' },
    orderBy: { createdAt: 'desc' },
    take: 10
  })

  return NextResponse.json({
    status: 'ok',
    storageProvider: 'vercel-blob',
    bucket: process.env.VERCEL_BLOB_STORE_ID || process.env.BLOB_STORE_ID || 'default',
    env: {
      BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET
    },
    maxUploadSizeBytes: {
      video: VIDEO_MAX_SIZE_BYTES,
      pdf: PDF_MAX_SIZE_BYTES,
      image: IMAGE_MAX_SIZE_BYTES
    },
    maxUploadSize: {
      video: formatBytes(VIDEO_MAX_SIZE_BYTES),
      pdf: formatBytes(PDF_MAX_SIZE_BYTES),
      image: formatBytes(IMAGE_MAX_SIZE_BYTES)
    },
    allowedMimeTypes: UPLOAD_ALLOWED_MIME_TYPES,
    recentUploadAttempts: recentUploads.map((entry) => ({
      id: entry.id,
      action: entry.action,
      subjectType: entry.subjectType,
      actorId: entry.actorId,
      createdAt: entry.createdAt,
      metadata: parseMetadata(entry.metadata)
    }))
  })
}
