/**
 * Media helper functions for detecting video resources and generating poster thumbnails.
 */

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v', '.ogv']

/**
 * Determine if a resource is a video based on resource_type, format, or URL extension
 */
export function isVideoResource(url, resourceType) {
  if (resourceType === 'video') return true
  if (resourceType === 'image') return false
  if (!url || typeof url !== 'string') return false
  const cleanUrl = url.split('?')[0].toLowerCase()
  if (VIDEO_EXTENSIONS.some(ext => cleanUrl.endsWith(ext))) return true
  if (url.includes('/video/upload/')) {
    // If transformed to a poster image extension (.jpg, .png, etc.), it's an image
    if (/\.(jpg|jpeg|png|webp)$/i.test(cleanUrl)) return false
    return true
  }
  return false
}

/**
 * Generate a thumbnail/poster frame URL for videos (particularly Cloudinary-hosted)
 */
export function getVideoPosterUrl(url) {
  if (!url || typeof url !== 'string') return null

  // Cloudinary video URL transform:
  // e.g. https://res.cloudinary.com/cloud/video/upload/v1234/sample.mp4 -> .jpg
  // e.g. https://res.cloudinary.com/cloud/video/upload/v1234/sample -> sample.jpg
  if (url.includes('/video/upload/')) {
    if (/\.(mp4|mov|webm|m4v|ogv)(\?.*)?$/i.test(url)) {
      return url.replace(/\.(mp4|mov|webm|m4v|ogv)(\?.*)?$/i, '.jpg$2')
    }
    const [base, query] = url.split('?')
    if (!/\.(jpg|jpeg|png|webp)$/i.test(base)) {
      return `${base}.jpg${query ? `?${query}` : ''}`
    }
    return url
  }

  return null
}

