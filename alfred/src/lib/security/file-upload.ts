// File upload security: MIME validation, size limits, safe naming, metadata stripping

import { createHash } from 'crypto'

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo']
export const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_VIDEO_SIZE = 1024 * 1024 * 1024 // 1GB (Reels max)

// Magic bytes for MIME type validation
const MAGIC_BYTES: Record<string, string[]> = {
  'image/jpeg': ['ffd8ff'],
  'image/png': ['89504e47'],
  'image/webp': ['52494646'],
  'image/gif': ['47494638'],
  'video/mp4': ['00000018', '00000020', '66747970'],
}

export async function validateFile(
  file: File,
  allowedTypes: string[] = ALLOWED_MEDIA_TYPES
): Promise<{ valid: boolean; error?: string }> {
  // Check size
  const maxSize = ALLOWED_VIDEO_TYPES.some(t => allowedTypes.includes(t))
    ? MAX_VIDEO_SIZE
    : MAX_IMAGE_SIZE

  if (file.size > maxSize) {
    return { valid: false, error: `File too large. Max: ${maxSize / (1024 * 1024)}MB` }
  }

  if (file.size === 0) {
    return { valid: false, error: 'Empty file' }
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} not allowed` }
  }

  // Validate magic bytes
  const buffer = await file.arrayBuffer()
  const header = Buffer.from(buffer.slice(0, 12))
  const hexHeader = header.toString('hex')

  const expectedMagicBytes = MAGIC_BYTES[file.type]
  if (expectedMagicBytes) {
    const hasValidMagicByte = expectedMagicBytes.some(mb => hexHeader.startsWith(mb))
    if (!hasValidMagicByte) {
      return { valid: false, error: 'File content does not match declared type' }
    }
  }

  // Check for SVG with embedded scripts
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    const content = new TextDecoder().decode(buffer)
    if (/<script|on\w+\s*=/i.test(content)) {
      return { valid: false, error: 'SVG contains embedded scripts' }
    }
  }

  return { valid: true }
}

export function generateSafeFilename(originalName: string, userId: string): string {
  // Strip path traversal and special characters
  const sanitizedName = originalName
    .replace(/[^\w\-.]/g, '_')
    .replace(/\.{2,}/g, '_')
    .replace(/^\./, '_')

  const timestamp = Date.now()
  const hash = createHash('sha256')
    .update(`${userId}-${timestamp}-${sanitizedName}`)
    .digest('hex')
    .slice(0, 12)

  const ext = sanitizedName.split('.').pop() || 'bin'
  return `${hash}.${ext}`
}

export function stripExifData(buffer: Buffer): Buffer {
  // For JPEG: strip EXIF by removing APP1 marker
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let i = 2
    while (i < buffer.length - 1) {
      if (buffer[i] === 0xff) {
        const marker = buffer[i + 1]
        if (marker === 0xe1) { // APP1 (EXIF)
          const length = buffer.readUInt16BE(i + 2)
          return Buffer.concat([buffer.slice(0, i), buffer.slice(i + 2 + length)])
        }
        i += 2
      } else {
        i++
      }
    }
  }
  return buffer
}

export function getFilePath(userId: string, filename: string): string {
  // Path structure: media/{userId}/{year}/{month}/{filename}
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `media/${userId}/${year}/${month}/${filename}`
}
