'use client'
import { useMemo, useState } from 'react'
import { Polyline, Marker, Popup, Tooltip, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Buffer } from 'buffer'
import wkx from 'wkx'
import EcoPinMarker from './EcoPinMarker'
import { useUser } from '@/components/auth/UserContext'
import useMapPhotoEvidence from './useMapPhotoEvidence'
import { reportDiagnostic } from '../../lib/diagnostics.mjs';

// Parse WKB geometry
const parseGeometry = (geometry) => {
  if (!geometry) return null
  try {
    if (typeof geometry === 'string') {
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
    reportDiagnostic('error', 'map', 'Error parsing geometry:', error)
  }
  return null
}

const CREW_COLORS = [
  '#0052cc', '#FF0055', '#00FFFF', '#FF9900', '#9900FF', '#00FF66'
]

function getCrewColor(crewIdStr) {
  if (!crewIdStr) return '#888888'
  // Simple hash to consistently pick a color
  let hash = 0
  for (let i = 0; i < crewIdStr.length; i++) {
    hash = crewIdStr.charCodeAt(i) + ((hash << 5) - hash)
  }
  return CREW_COLORS[Math.abs(hash) % CREW_COLORS.length]
}

function createTaskReportIcon(label, color, isCompleted) {
  return L.divIcon({
    className: 'sub-waypoint-marker',
    html: `<div style="
      width: 24px;
      height: 24px;
      background-color: ${isCompleted ? '#1A1A1A' : color};
      border: 2px solid ${isCompleted ? color : 'white'};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
      color: ${isCompleted ? color : (color === '#00FFFF' || color === '#00FF66' ? 'black' : 'white')};
      box-shadow: 0 2px 4px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

export default function CrewTaskLayer({ tasks = [], basePath, photoPins = false, routeColor, reportLinks = false }) {
  const user = useUser()
  const map = useMapEvents({ moveend: () => { if (photoPins) setBounds(map.getBounds()) } })
  const [bounds, setBounds] = useState(() => map.getBounds())
  const visibleReports = useMemo(() => !photoPins ? [] : tasks.flatMap(task => task.reports || []).filter(report => {
    const coords = parseGeometry(report.location)
    return coords && bounds.contains(coords)
  }), [tasks, photoPins, bounds])
  const photos = useMapPhotoEvidence(visibleReports, photoPins)
  const defaultBasePath = user?.role === 'field_crew'
    ? '/dashboard/field-crew/operations'
    : '/dashboard/officer/operations'
  const effectiveBasePath = basePath || defaultBasePath

  const renderedTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return null

    return tasks.map((task) => {
      if (!task.reports || task.reports.length === 0) return null
      
      const crewId = task.assigned_crew_ids && task.assigned_crew_ids.length > 0 ? task.assigned_crew_ids[0] : null
      const color = routeColor || getCrewColor(crewId)
      const isTaskCompleted = task.status === 'completed' || task.status === 'resolved'

      // Extract coordinates for all reports in this task
      const positions = []
      const validReports = []
      
      task.reports.forEach((report, idx) => {
        const coords = parseGeometry(report.location)
        if (coords) {
          positions.push(coords)
          validReports.push({ report, coords, label: `T${task.id}-${idx + 1}` })
        }
      })

      if (validReports.length === 0) return null

      return (
        <div key={`task-${task.id}`}>
          {/* Dashed Line Connecting Reports if > 1 */}
          {positions.length > 1 && (
            <Polyline
              positions={positions}
              pathOptions={{
                color: color, 
                weight: 3, 
                opacity: 0.7, 
                dashArray: '5, 10'
              }}
            >
              <Tooltip sticky>
                Task micro-route ({color}): Connects cluster centroid to constituent report sub-pins
              </Tooltip>
            </Polyline>
          )}
          
          {/* Pins for Reports */}
          {validReports.map(({ report, coords, label }) => {
            return (
              <EcoPinMarker 
                key={report.id}
                report={report}
                photoPin={photoPins}
                photo={photos[report.id]}
                position={coords}
                customUrl={reportLinks ? `/dashboard/raw-data/${report.id}` : `${effectiveBasePath}/${task.id}`}
                buttonLabel={reportLinks ? 'View Report' : undefined}
              />
            )
          })}
        </div>
      )
    })
  }, [tasks, effectiveBasePath, photoPins, photos, routeColor, reportLinks])

  return <>{renderedTasks}</>
}
