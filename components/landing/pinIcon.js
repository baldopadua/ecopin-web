import L from 'leaflet'
import { getReportStatusHex } from '@/lib/helpers/statusHelpers'
import { resolvePrivateMedia } from '@/lib/api/private-media.mjs'

// No-photo placeholder icon (ImageOff style - square with diagonal line)
const NO_PHOTO_ICON = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iI0U1RTdFQiIvPgo8cGF0aCBkPSJNMTAgMTBoMjB2MjBIMTB6IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik04IDhsMjQgMjQiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+'

const pinIconCache = new Map()

class PhotoPinIcon extends L.DivIcon {
  createIcon(oldIcon) {
    const element = super.createIcon(oldIcon)
    const image = element.querySelector('img')
    image?.addEventListener('error', () => { image.src = NO_PHOTO_ICON }, { once: true })
    return element
  }
}

// Custom Pin Icon: high-visibility photo pin with pointer and status pip, no numbers
export const createPinIcon = (imageOrUrl, isSelected = false, isDark = false, status = null, isCluster = false) => {
  let imageUrl = imageOrUrl
  if (typeof imageOrUrl === 'object' && imageOrUrl !== null) {
    imageUrl = imageOrUrl?.image || null
    if (!status && imageOrUrl.status) status = imageOrUrl.status
  }

  // Use no-photo placeholder if no image available
  if (!imageUrl) {
    imageUrl = NO_PHOTO_ICON
  }

  const fallbackImage = NO_PHOTO_ICON
  let isPublicImage = false
  try {
    isPublicImage = ['http:', 'https:'].includes(new URL(imageUrl, window.location.origin).protocol) && resolvePrivateMedia(imageUrl, process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_BACKEND_API_URL) === undefined
  } catch {}
  const safeImageUrl = (isPublicImage && typeof imageUrl === 'string' && imageUrl.trim().length > 0 && !imageUrl.includes('<') && !imageUrl.includes('"'))
    ? imageUrl
    : fallbackImage

  const cacheKey = `${safeImageUrl}|${isSelected ? 1 : 0}|${isDark ? 1 : 0}|${status || ''}|${isCluster ? 1 : 0}`
  const cached = pinIconCache.get(cacheKey)
  if (cached) return cached

  const size = isSelected ? 50 : (isCluster ? 46 : 42)
  const pointerHeight = isSelected ? 8 : 7
  const pointerWidth = isSelected ? 12 : 10
  const totalHeight = size + pointerHeight

  const borderColor = isSelected 
    ? '#0052CC' 
    : (isCluster ? '#0052CC' : '#FFFFFF')

  const borderWidth = isSelected ? 3.5 : (isCluster ? 3 : 3)

  const shadow = isSelected
    ? '0 0 0 4px rgba(0, 82, 204, 0.45), 0 8px 24px rgba(0, 0, 0, 0.45)'
    : (isCluster
        ? '0 0 0 2px #FFFFFF, 0 4px 14px rgba(0, 0, 0, 0.35)'
        : '0 3px 12px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(0, 0, 0, 0.1)')

  // Status indicator dot (no text/numbers)
  const statusColor = status ? getReportStatusHex(status) : null

  const statusPip = statusColor ? `
    <div style="
      position: absolute;
      top: 1px;
      right: 1px;
      width: ${isSelected ? 11 : 9}px;
      height: ${isSelected ? 11 : 9}px;
      border-radius: 50%;
      background: ${statusColor};
      border: 2px solid #FFFFFF;
      box-shadow: 0 1px 3px rgba(0,0,0,0.35);
      z-index: 3;
    "></div>
  ` : ''

  const icon = new PhotoPinIcon({
    className: 'custom-pin-marker',
    html: `
      <div class="ecopin-pin-wrapper" style="
        position: relative;
        width: ${size}px;
        height: ${totalHeight}px;
        display: flex;
        flex-direction: column;
        align-items: center;
        filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.32));
        cursor: pointer;
      ">
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          border: ${borderWidth}px solid ${borderColor};
          background: ${isDark ? '#262626' : '#FFFFFF'};
          overflow: hidden;
          position: relative;
          box-sizing: border-box;
          box-shadow: ${shadow};
        ">
          <img 
            src="${safeImageUrl}" 
            alt=""
            loading="lazy"
            style="
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
              border-radius: 50%;
            "
          />
        </div>
        <div style="
          width: 0;
          height: 0;
          border-left: ${pointerWidth / 2}px solid transparent;
          border-right: ${pointerWidth / 2}px solid transparent;
          border-top: ${pointerHeight}px solid ${borderColor};
          margin-top: -1.5px;
        "></div>
        ${statusPip}
      </div>
    `,
    iconSize: [size, totalHeight],
    iconAnchor: [size / 2, totalHeight],
    popupAnchor: [0, -totalHeight - 4]
  })

  pinIconCache.set(cacheKey, icon)
  return icon
}


