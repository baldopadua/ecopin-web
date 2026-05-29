'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'

const PLP_CENTER = [14.561433, 121.075636]
const DEFAULT_ZOOM = 15

export default function EcoPinMap() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    import('@/lib/leaflet-fix')
    setMounted(true)
  }, [])

  if (!mounted) return <p>Loading map...</p>

  return (
    <MapContainer
      key="ecopin-map"
      center={PLP_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100vh', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
      />
      <Marker position={PLP_CENTER}>
        <Popup>Pamantasan ng Lungsod ng Pasig</Popup>
      </Marker>
    </MapContainer>
  )
}