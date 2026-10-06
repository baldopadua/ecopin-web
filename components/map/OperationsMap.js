'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import CrewTaskLayer from './CrewTaskLayer'
import OutlierClusterLayer from './OutlierClusterLayer'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import wkx from 'wkx'
import { Buffer } from 'buffer'

// PASIG BOUNDS
const PASIG_BOUNDS = [
  [14.52, 121.02],
  [14.62, 121.12]
]
const PLP_CENTER = [14.561433, 121.075636]

const parseGeometry = (geometry) => {
  if (!geometry) return null
  try {
    if (typeof geometry === 'string' && geometry.startsWith('{')) {
       const parsed = JSON.parse(geometry)
       if (parsed.type === 'Point') return [parsed.coordinates[1], parsed.coordinates[0]]
    } else if (typeof geometry === 'string') {
      const buffer = Buffer.from(geometry, 'hex')
      const parsed = wkx.Geometry.parse(buffer)
      if (parsed && parsed.x && parsed.y) {
        return [parsed.y, parsed.x] 
      }
    } else if (typeof geometry === 'object' && geometry.type === 'Point') {
      const [lng, lat] = geometry.coordinates
      return [lat, lng]
    }
  } catch (error) {
    console.error('Error parsing geometry:', error)
  }
  return null
}

export default function OperationsMap({ tasks, clusters = [], selectedTemplate = 'standard' }) {
  const [mounted, setMounted] = useState(false)

  // Find exact center from tasks
  let mapCenter = PLP_CENTER;
  let hasExactPin = false;
  if (tasks && tasks.length > 0) {
    const firstTask = tasks[0];
    if (firstTask.reports && firstTask.reports.length > 0) {
      const firstReport = firstTask.reports.find(r => r.location || (r.latitude && r.longitude));
      if (firstReport) {
         if (firstReport.latitude && firstReport.longitude) {
            mapCenter = [firstReport.latitude, firstReport.longitude];
            hasExactPin = true;
         } else if (firstReport.location) {
            const coords = parseGeometry(firstReport.location);
            if (coords) {
                mapCenter = coords;
                hasExactPin = true;
            }
         }
      }
    }
  }

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
      center={mapCenter}
      zoom={hasExactPin ? 17 : 14}
      style={{ height: '100%', width: '100%', zIndex: 0 }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <CrewTaskLayer tasks={tasks} />
      <OutlierClusterLayer clusters={clusters} selectedTemplate={selectedTemplate} />
    </MapContainer>
  )
}
