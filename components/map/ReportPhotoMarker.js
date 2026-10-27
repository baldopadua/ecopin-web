'use client'

import { useMemo, useState, forwardRef } from 'react'
import { createPortal } from 'react-dom'
import { Marker } from 'react-leaflet'
import L from 'leaflet'
import { ImageOff, Play } from 'lucide-react'
import SecureImage from '@/components/ui/SecureImage'
import { isVideoResource, getVideoPosterUrl } from '@/lib/helpers/mediaHelpers'
import { REPORT_PIN_STATUSES, UNKNOWN_PIN_STATUS } from './reportPinStatus'
import styles from './ReportPhotoMarker.module.css'

function PinPhoto({ source }) {
  const [failed, setFailed] = useState(false)
  const isVideo = isVideoResource(source)
  const isPosterImage = Boolean(source && /\.(jpg|jpeg|png|webp)$/i.test(source.split('?')[0]))
  const posterUrl = isVideo ? getVideoPosterUrl(source) : null

  if (!source || failed) {
    return <ImageOff size={20} aria-hidden="true" />
  }

  // If this is a video or a video poster image
  if (isVideo || (isPosterImage && source.includes('/video/upload/'))) {
    const thumbUrl = posterUrl || (isPosterImage ? source : null)
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {thumbUrl ? (
          <SecureImage
            src={thumbUrl}
            alt=""
            loading="lazy"
            style={{ position: 'absolute', inset: 0 }}
            onError={() => setFailed(true)}
          />
        ) : (
          <video
            src={source.includes('#t=') ? source : `${source}#t=0.001`}
            preload="metadata"
            muted
            playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
            onError={() => setFailed(true)}
          />
        )}
        <span
          className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none"
          aria-hidden="true"
        >
          <Play size={12} className="text-white fill-white drop-shadow" />
        </span>
      </div>
    )
  }

  return (
    <SecureImage
      src={source}
      alt=""
      loading="lazy"
      style={{ position: 'absolute', inset: 0 }}
      onError={() => setFailed(true)}
    />
  )
}

// A React portal keeps private evidence on the existing authenticated image path.
const ReportPhotoMarker = forwardRef(function ReportPhotoMarker({ report, image, selected, removing, children, ...markerProps }, ref) {
  const container = useMemo(() => document.createElement('div'), [])
  const icon = useMemo(() => L.divIcon({ html: container, className: styles.marker,
    iconSize: [50, 58], iconAnchor: [25, 58], popupAnchor: [0, -62] }), [container])
  const status = REPORT_PIN_STATUSES[report?.status] || UNKNOWN_PIN_STATUS
  const Icon = status.Icon
  const title = `${report?.title || 'Environmental report'} · ${status.label}`
  const effectiveImage = image || report?.photo_url || report?.file_url || report?.image_url || report?.image || report?.before_photo_url || report?.video_url

  return <>
    <Marker ref={ref} {...markerProps} icon={icon} title={title} alt={title} zIndexOffset={selected ? 1000 : 0}>{children}</Marker>
    {createPortal(<div className={`${styles.pin} ${styles[status.tone]} ${selected ? styles.selected : ''} ${removing ? styles.removing : ''}`}>
      <div className={styles.photo}><PinPhoto key={effectiveImage || 'no-photo'} source={effectiveImage} /></div>
      <span className={styles.status} aria-hidden="true"><Icon size={14} strokeWidth={2.5} /></span>
    </div>, container)}
  </>
})

export default ReportPhotoMarker

