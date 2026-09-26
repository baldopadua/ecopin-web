'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import CrewTaskLayer from './CrewTaskLayer'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// PASIG BOUNDS
const PASIG_BOUNDS = [
  [14.52, 121.02],
  [14.62, 121.12]
]
const PLP_CENTER = [14.561433, 121.075636]

export default function OperationsMap({ tasks }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Fix leafet icon issues
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, [])

  if (!mounted) return null

  return (
    <MapContainer
      bounds={PASIG_BOUNDS}
      center={PLP_CENTER}
      zoom={14}
      style={{ height: '100%', width: '100%', zIndex: 0 }}
      zoomControl={false}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <CrewTaskLayer tasks={tasks} />
    </MapContainer>
  )
}
