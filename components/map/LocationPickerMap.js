'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const createCustomIcon = () => {
  return L.divIcon({
    className: 'custom-picker-marker',
    html: `<div style="background-color: #2563eb; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  })
}

function LocationMarker({ position, onChange }) {
  const icon = createCustomIcon()
  
  useMapEvents({
    click(e) {
      onChange(e.latlng)
    },
  })

  return position === null ? null : (
    <Marker 
      position={position}
      draggable={true}
      icon={icon}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target
          onChange(marker.getLatLng())
        },
      }}
    />
  )
}

export default function LocationPickerMap({ position, onChange }) {
  const [isMounted, setIsMounted] = useState(false)
  const [map, setMap] = useState(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])



  if (!isMounted) return <div className="h-[400px] bg-surface-elevated animate-pulse border border-border" />

  const center = position?.lat && position?.lng ? [position.lat, position.lng] : [14.561433, 121.075636] // Default Pasig

  return (
    <div className="h-[400px] w-full border border-border relative z-0">
      <MapContainer 
        center={center} 
        zoom={14} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
        ref={setMap}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <LocationMarker 
          position={position?.lat ? position : null} 
          onChange={onChange} 
        />
      </MapContainer>
      <div className="absolute top-4 left-4 z-[400] bg-surface border border-border p-2 shadow-sm text-sm font-medium">
        Click anywhere or drag pin to set location
      </div>
    </div>
  )
}
