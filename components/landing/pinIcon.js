import L from 'leaflet'
import { resolvePrivateMedia } from '@/lib/api/private-media.mjs'

// Same cached icon structure, sizes, anchors and selection states as PublicMap.
const CATEGORY_IMAGES = { others: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=120&q=70' }
const getReportImage = report => report?.image || CATEGORY_IMAGES.others
const pinIconCache = new Map()

// Custom Pin Icon: high-visibility photo pin with pointer and status pip, no numbers
export const createPinIcon = (imageOrUrl, isSelected = false, isDark = false, status = null, isCluster = false) => {
  let imageUrl = imageOrUrl
  if (typeof imageOrUrl === 'object' && imageOrUrl !== null) {
    imageUrl = getReportImage(imageOrUrl)
    if (!status && imageOrUrl.status) status = imageOrUrl.status
  } else if (typeof imageOrUrl === 'number' || !imageOrUrl) {
    imageUrl = CATEGORY_IMAGES.others
  }

  const fallbackImage = CATEGORY_IMAGES.others
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
  let statusColor = null
  if (status === 'urgent') statusColor = '#EF4444'
  else if (status === 'resolved') statusColor = '#10B981'
  else if (status === 'in_progress') statusColor = '#3B82F6'
  else if (status === 'unresolved' || status === 'submitted' || status === 'pending') statusColor = '#F59E0B'

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

  const icon = L.divIcon({
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
            onerror="this.onerror=null;this.src='${fallbackImage}';"
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


