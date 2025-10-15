'use server'

import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { prisma } from '../prisma'
import { requireUser } from '../auth-server'

export interface MediaUploadResult {
  id: string
  url: string
  filename: string
  size: number
}

export async function uploadMedia(
  file: File,
  alt?: string,
  title?: string
): Promise<MediaUploadResult> {
  const user = await requireUser()
  
  if (!['admin', 'editor'].includes(user.role)) {
    throw new Error('Unauthorized: Only admins and editors can upload media')
  }

  if (!file) {
    throw new Error('No file provided')
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed')
  }

  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    throw new Error('File size must be less than 10MB')
  }

  // Generate unique filename
  const ext = file.name.split('.').pop() || ''
  const filename = `${randomBytes(16).toString('hex')}.${ext}`
  
  // Ensure directory exists
  const uploadDir = join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadDir, { recursive: true })
  
  // Write file
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const filepath = join(uploadDir, filename)
  await writeFile(filepath, buffer)
  
  // Save to database
  const media = await prisma.media.create({
    data: {
      url: `/uploads/${filename}`,
      filename: file.name,
      mime: file.type,
      size: buffer.length,
      alt: alt || null,
      title: title || null,
      uploadedById: user.id,
    },
  })
  
  // Revalidate media paths
  revalidatePath('/admin/media')
  
  return {
    id: media.id,
    url: media.url,
    filename: media.filename,
    size: media.size,
  }
}
