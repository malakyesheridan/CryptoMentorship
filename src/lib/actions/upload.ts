'use server'

import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'

export interface UploadResult {
  url: string
  filename: string
  size: number
}

export async function uploadFile(formData: FormData): Promise<UploadResult> {
  const file = formData.get('file') as File
  
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
  
  // Revalidate uploads path
  revalidatePath('/uploads')
  
  return {
    url: `/uploads/${filename}`,
    filename,
    size: buffer.length
  }
}
