'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Marker, Popup } from 'react-leaflet'
import { formatReportAddress } from '@/lib/format-location.mjs'
import { createPinIcon } from './pinIcon'

export default function PhotoReportMarker({ report, position, image, selected, isCluster, isDark, onSelect, children }) {
  const markerRef = useRef(null)
  const icon = useMemo(() => createPinIcon(image, selected, isDark, report.status, isCluster), [image, selected, isDark, report.status, isCluster])
  const address = formatReportAddress(report)
  useEffect(() => {
    if (!selected || !markerRef.current || markerRef.current.isPopupOpen()) return
    const timer = setTimeout(() => markerRef.current?.openPopup(), 50)
    return () => clearTimeout(timer)
  }, [selected])
  return <Marker ref={markerRef} position={position} icon={icon} title={address ? `${report.title || 'Environmental concern'} • ${address}` : (report.title || 'Environmental concern')} zIndexOffset={selected ? 1000 : 0} eventHandlers={{ click: onSelect }}>
    <Popup closeButton autoPan={false}>{children}</Popup>
  </Marker>
}
