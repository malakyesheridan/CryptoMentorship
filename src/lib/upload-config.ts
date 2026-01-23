export const VIDEO_UPLOAD_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo'
]

export const PDF_UPLOAD_MIME_TYPES = ['application/pdf']

export const IMAGE_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]

export const VIDEO_MAX_SIZE_BYTES = 1024 * 1024 * 1024 // 1GB
export const PDF_MAX_SIZE_BYTES = 25 * 1024 * 1024 // 25MB
export const IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

export const UPLOAD_ALLOWED_MIME_TYPES = [
  ...VIDEO_UPLOAD_MIME_TYPES,
  ...PDF_UPLOAD_MIME_TYPES,
  ...IMAGE_UPLOAD_MIME_TYPES
].filter((value, index, self) => self.indexOf(value) === index)

export type UploadCategory = 'video' | 'pdf' | 'image'

const EXTENSION_MIME_MAP: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif'
}

export function inferMimeTypeFromFilename(filename: string): string | null {
  const extension = filename.split('.').pop()?.toLowerCase()
  if (!extension) return null
  return EXTENSION_MIME_MAP[extension] || null
}

export function getUploadCategory(mimeType?: string | null): UploadCategory | null {
  if (!mimeType) return null
  if (VIDEO_UPLOAD_MIME_TYPES.includes(mimeType)) return 'video'
  if (PDF_UPLOAD_MIME_TYPES.includes(mimeType)) return 'pdf'
  if (IMAGE_UPLOAD_MIME_TYPES.includes(mimeType)) return 'image'
  return null
}

export function getMaxSizeForMime(mimeType?: string | null): number | null {
  const category = getUploadCategory(mimeType)
  if (!category) return null
  switch (category) {
    case 'video':
      return VIDEO_MAX_SIZE_BYTES
    case 'pdf':
      return PDF_MAX_SIZE_BYTES
    case 'image':
      return IMAGE_MAX_SIZE_BYTES
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
}
