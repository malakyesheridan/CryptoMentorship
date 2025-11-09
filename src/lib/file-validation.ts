// Note: file-type package will need to be installed
// npm install file-type

/**
 * Validate file content by checking magic bytes
 * This prevents MIME type spoofing attacks
 */
export async function validateFileContent(
  buffer: Buffer, 
  expectedMime: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Dynamic import to handle cases where package isn't installed
    const { fileTypeFromBuffer } = await import('file-type')
    const detected = await fileTypeFromBuffer(buffer)
    
    if (!detected) {
      return { valid: false, error: 'Unable to detect file type' }
    }

    const allowedTypes: Record<string, string[]> = {
      'application/pdf': ['pdf'],
      'video/mp4': ['mp4'],
      'video/webm': ['webm'],
      'video/quicktime': ['mov'],
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'image/webp': ['webp'],
    }

    const expectedTypes = allowedTypes[expectedMime]
    if (!expectedTypes || !expectedTypes.includes(detected.ext)) {
      return {
        valid: false,
        error: `File type mismatch. Expected ${expectedMime}, detected ${detected.mime}`,
      }
    }

    return { valid: true }
  } catch (error) {
    // If file-type is not installed, skip validation in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ file-type package not installed - skipping content validation')
      return { valid: true } // Allow in development
    }
    
    // In production, this is a critical check
    return {
      valid: false,
      error: 'File validation service unavailable',
    }
  }
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() || filename
  return base
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 255) // Max filename length
}

/**
 * Validate file size
 */
export function validateFileSize(buffer: Buffer, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return buffer.length <= maxSizeBytes
}

