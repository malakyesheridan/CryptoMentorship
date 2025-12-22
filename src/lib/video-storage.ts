import { writeFile, mkdir, stat } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Video storage configuration
export const VIDEO_CONFIG = {
  // Base directory for video storage
  UPLOAD_DIR: join(process.cwd(), 'uploads', 'videos'),
  THUMBNAIL_DIR: join(process.cwd(), 'uploads', 'thumbnails'),
  
  // File size limits (in bytes)
  MAX_FILE_SIZE: 1024 * 1024 * 1024, // 1GB
  
  // Allowed video formats
  ALLOWED_MIME_TYPES: [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo', // .avi
  ],
  
  // Video processing settings
  THUMBNAIL_TIME: 5, // Generate thumbnail at 5 seconds
  THUMBNAIL_SIZE: { width: 320, height: 180 }, // 16:9 aspect ratio
}

/**
 * Ensure upload directories exist
 */
export async function ensureUploadDirs() {
  try {
    if (!existsSync(VIDEO_CONFIG.UPLOAD_DIR)) {
      await mkdir(VIDEO_CONFIG.UPLOAD_DIR, { recursive: true })
    }
    
    if (!existsSync(VIDEO_CONFIG.THUMBNAIL_DIR)) {
      await mkdir(VIDEO_CONFIG.THUMBNAIL_DIR, { recursive: true })
    }
    
    console.log('✅ Upload directories created')
  } catch (error) {
    console.error('❌ Failed to create upload directories:', error)
    throw error
  }
}

/**
 * Generate unique filename to prevent conflicts
 */
export function generateVideoFilename(originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = originalName.split('.').pop() || 'mp4'
  return `${timestamp}-${random}.${extension}`
}

/**
 * Generate thumbnail filename
 */
export function generateThumbnailFilename(videoFilename: string): string {
  const baseName = videoFilename.replace(/\.[^/.]+$/, '')
  return `${baseName}-thumb.jpg`
}

/**
 * Validate video file
 */
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > VIDEO_CONFIG.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${VIDEO_CONFIG.MAX_FILE_SIZE / (1024 * 1024 * 1024)}GB`
    }
  }
  
  // Check MIME type
  if (!VIDEO_CONFIG.ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type. Allowed: ${VIDEO_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`
    }
  }
  
  return { valid: true }
}
