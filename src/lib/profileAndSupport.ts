import { SupportTechnicalContext } from '../types';

/**
 * Sanitizes user input string by stripping potential HTML tags, scripts, and limiting length.
 */
export function sanitizeInput(text: string, maxLength?: number): string {
  if (!text) return '';
  // Strip HTML tags and script elements
  let cleaned = text.replace(/<[^>]*>?/gm, '').trim();
  if (maxLength && maxLength > 0 && cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
  }
  return cleaned;
}

/**
 * Detects browser and OS safely without capturing private cookies or tokens.
 */
export function getSafeTechnicalContext(currentSection: string = 'User Portal'): SupportTechnicalContext {
  if (typeof window === 'undefined') {
    return { currentSection };
  }

  const userAgent = navigator.userAgent || '';
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  // Detect OS
  if (/windows phone/i.test(userAgent)) {
    os = 'Windows Phone';
  } else if (/android/i.test(userAgent)) {
    os = 'Android';
  } else if (/ipad|iphone|ipod/i.test(userAgent)) {
    os = 'iOS';
  } else if (/macintosh|mac os x/i.test(userAgent)) {
    os = 'macOS';
  } else if (/windows nt/i.test(userAgent)) {
    os = 'Windows';
  } else if (/linux/i.test(userAgent)) {
    os = 'Linux';
  }

  // Detect Browser
  if (/edg/i.test(userAgent)) {
    browser = 'Microsoft Edge';
  } else if (/chrome|crios/i.test(userAgent) && !/opr|opera/i.test(userAgent)) {
    browser = 'Google Chrome';
  } else if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) {
    browser = 'Apple Safari';
  } else if (/firefox|fxios/i.test(userAgent)) {
    browser = 'Mozilla Firefox';
  } else if (/opr|opera/i.test(userAgent)) {
    browser = 'Opera';
  }

  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(userAgent) || window.innerWidth < 768;
  const device = isMobile ? 'Mobile / Tablet' : 'Desktop';
  const screen = `${window.innerWidth}x${window.innerHeight} (${Math.round(window.devicePixelRatio || 1)}x)`;

  return {
    browser,
    os,
    device,
    screen,
    currentSection,
  };
}

/**
 * Validates, securely resizes and compresses an image file to a base64 data URI.
 * Enforces file type allowlist and file size limits.
 */
export async function processImageUpload(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    maxSizeBytes?: number;
    quality?: number;
  } = {}
): Promise<string> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    maxSizeBytes = 2.5 * 1024 * 1024, // 2.5MB max input
    quality = 0.82,
  } = options;

  // Validate MIME type against strict image allowlist
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    throw new Error('Invalid file type. Only JPEG, PNG, WEBP, or GIF images are allowed.');
  }

  // Validate file size limit
  if (file.size > maxSizeBytes) {
    const mbLimit = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    throw new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is ${mbLimit}MB.`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image data.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not initialize canvas context.'));
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to high-efficiency WebP or JPEG
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
