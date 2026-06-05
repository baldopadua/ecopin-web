'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import wkx from 'wkx'
import { Buffer } from 'buffer'
import { fetchPublicReports } from '@/lib/api'

// Polyfill Buffer for browser environment
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer
}

const PLP_CENTER = [14.561433, 121.075636]
const DEFAULT_ZOOM = 15

const createRedIcon = () => {
  return L.divIcon({
    className: 'custom-marker',
    html: '<div style="background-color: #EF4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

const createGreenIcon = () => {
  return L.divIcon({
    className: 'custom-marker',
    html: '<div style="background-color: #ADFF2F; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

export default function EcoPinMap() {
  const [mounted, setMounted] = useState(false)
  const [reports, setReports] = useState([])

  useEffect(() => {
    import('@/lib/leaflet-fix')
    setMounted(true)
    
    // Fetch reports when component mounts
    fetchPublicReports().then(data => {
      setReports(data)
    })
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
      <Marker position={PLP_CENTER} icon={createGreenIcon()}>
        <Popup>Pamantasan ng Lungsod ng Pasig</Popup>
      </Marker>
      {reports.map((report) => {
        let latitude, longitude
        
        // Parse PostGIS binary location using wkx library
        if (report.location) {
          try {
            // Handle hex string format - convert to Buffer first
            if (typeof report.location === 'string') {
              const buffer = Buffer.from(report.location, 'hex')
              const geometry = wkx.Geometry.parse(buffer)
              if (geometry && geometry.x && geometry.y) {
                longitude = geometry.x
                latitude = geometry.y
              }
            }
            // Handle Buffer format
            else if (Buffer.isBuffer(report.location)) {
              const geometry = wkx.Geometry.parse(report.location)
              if (geometry && geometry.x && geometry.y) {
                longitude = geometry.x
                latitude = geometry.y
              }
            }
          } catch (error) {
            console.error('Error parsing location for report', report.id, ':', error)
          }
        }

        if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
          return (
            <Marker 
              key={report.id} 
              position={[latitude, longitude]} 
              icon={createRedIcon()}
            >
              <Popup>
                <div>
                  <strong>{report.title}</strong>
                  <br />
                  {report.description}
                  <br />
                  <small>Status: {report.status}</small>
                </div>
              </Popup>
            </Marker>
          )
        }
        return null
      })}
    </MapContainer>
  )
}