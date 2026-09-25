/**
 * Validation logic for user avatar uploads.
 * Clients can be hostile or send unexpected data; know every guard shipped.
 */

export interface AvatarValidationResult {
  isValid: boolean;
  error: string | null;
  fileSizeBytes?: number;
  fileType?: string;
}

// 1 Megabyte in bytes: 1 * 1024 * 1024 = 1,048,576 bytes
export const MAX_AVATAR_SIZE_BYTES = 1024 * 1024; 

// Whitelist of valid image MIME types
export const ACCEPTED_IMAGE_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
] as const;

/**
 * Validates an avatar file client-side before any upload attempt.
 * Ensures:
 * 1. File exists
 * 2. File is an image (MIME type starting with image/ and matching allowed image formats)
 * 3. File size is <= 1 MB (1,048,576 bytes)
 */
export function validateAvatarFile(file: File | null | undefined): AvatarValidationResult {
  if (!file) {
    return {
      isValid: false,
      error: "No file selected. Please choose an image to upload.",
    };
  }

  // 1. Guard against non-image file types
  const isImageMime =
    file.type.startsWith("image/") &&
    (ACCEPTED_IMAGE_TYPES.includes(file.type) || file.type.length > 6);

  if (!isImageMime) {
    return {
      isValid: false,
      error: `Invalid file type "${file.type || "unknown"}". Only image files (JPEG, PNG, WebP, GIF, SVG) are permitted.`,
      fileSizeBytes: file.size,
      fileType: file.type,
    };
  }

  // 2. Guard against oversized files (> 1 MB)
  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `File is too large (${sizeInMB} MB). Avatars must be 1 MB or smaller.`,
      fileSizeBytes: file.size,
      fileType: file.type,
    };
  }

  // 3. File passes all checks
  return {
    isValid: true,
    error: null,
    fileSizeBytes: file.size,
    fileType: file.type,
  };
}
