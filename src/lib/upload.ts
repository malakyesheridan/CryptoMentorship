import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'

export interface UploadResult {
  url: string
  filename: string
  size: number
}

export async function uploadFile(
  file: File,
  folder: string = 'uploads'
): Promise<UploadResult> {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  
  // Generate unique filename
  const ext = file.name.split('.').pop() || ''
  const filename = `${randomBytes(16).toString('hex')}.${ext}`
  
  // Ensure directory exists
  const uploadDir = join(process.cwd(), 'public', folder)
  await mkdir(uploadDir, { recursive: true })
  
  // Write file
  const filepath = join(uploadDir, filename)
  await writeFile(filepath, buffer)
  
  return {
    url: `/${folder}/${filename}`,
    filename,
    size: buffer.length
  }
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

export function isImageFile(filename: string): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
  return imageExtensions.includes(getFileExtension(filename))
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
