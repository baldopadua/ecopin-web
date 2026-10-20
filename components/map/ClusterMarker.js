'use client'

import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Marker } from 'react-leaflet'
import L from 'leaflet'
import { Layers, TriangleAlert } from 'lucide-react'
import styles from './ClusterMarker.module.css'

export default function ClusterMarker({ count, selectedCount = 0, overdue, label, children, ...markerProps }) {
  const container = useMemo(() => document.createElement('div'), [])
  const icon = useMemo(() => L.divIcon({ html: container, className: styles.marker,
    iconSize: [54, 62], iconAnchor: [27, 62], popupAnchor: [0, -66] }), [container])
  const title = `${label} · ${count} reports${selectedCount ? ` · ${selectedCount} selected` : ''}${overdue ? ' · Overdue reports' : ''}`
  const Badge = overdue ? TriangleAlert : Layers
  return <>
    <Marker {...markerProps} icon={icon} title={title} alt={title} zIndexOffset={selectedCount ? 1000 : 0}>{children}</Marker>
    {createPortal(<div className={`${styles.pin} ${overdue ? styles.overdue : ''} ${selectedCount ? styles.selected : ''} ${selectedCount > 0 && selectedCount < count ? styles.partial : ''}`}>
      <span className={styles.stack} aria-hidden="true" />
      <div className={styles.face} aria-hidden="true">
        <strong className={styles.count}>{count}</strong>
        <span className={styles.caption}>reports</span>
      </div>
      <span className={styles.badge} aria-hidden="true"><Badge size={14} strokeWidth={2.5} /></span>
    </div>, container)}
  </>
}
