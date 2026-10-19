'use client'

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Marker } from 'react-leaflet'
import L from 'leaflet'
import { ImageOff } from 'lucide-react'
import SecureImage from '@/components/ui/SecureImage'
import { REPORT_PIN_STATUSES, UNKNOWN_PIN_STATUS } from './reportPinStatus'
import styles from './ReportPhotoMarker.module.css'

function PinPhoto({ source }) {
  const [failed, setFailed] = useState(false)
  return <>
    <ImageOff size={20} aria-hidden="true" />
    {source && !failed && <SecureImage src={source} alt="" loading="lazy" onError={() => setFailed(true)} />}
  </>
}

// A React portal keeps private evidence on the existing authenticated image path.
export default function ReportPhotoMarker({ report, image, selected, removing, children, ...markerProps }) {
  const container = useMemo(() => document.createElement('div'), [])
  const icon = useMemo(() => L.divIcon({ html: container, className: styles.marker,
    iconSize: [50, 58], iconAnchor: [25, 58], popupAnchor: [0, -62] }), [container])
  const status = REPORT_PIN_STATUSES[report?.status] || UNKNOWN_PIN_STATUS
  const Icon = status.Icon
  const title = `${report?.title || 'Environmental report'} · ${status.label}`
  const effectiveImage = image || report?.photo_url || report?.file_url || report?.image_url || report?.image
  return <>
    <Marker {...markerProps} icon={icon} title={title} alt={title} zIndexOffset={selected ? 1000 : 0}>{children}</Marker>
    {createPortal(<div className={`${styles.pin} ${styles[status.tone]} ${selected ? styles.selected : ''} ${removing ? styles.removing : ''}`}>
      <div className={styles.photo}><PinPhoto key={effectiveImage || 'no-photo'} source={effectiveImage} /></div>
      <span className={styles.status} aria-hidden="true"><Icon size={14} strokeWidth={2.5} /></span>
    </div>, container)}
  </>
}
