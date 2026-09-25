'use client'
import { useMemo } from 'react'
import { Polyline, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { Buffer } from 'buffer'
import wkx from 'wkx'

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
    console.error('Error parsing geometry:', error)
  }
  return null
}

function createSubWaypointIcon(sequenceLabel, validationStatus) {
  const isPending = validationStatus === 'pending'
  const bgColor = isPending ? '#0288D1' : '#2E7D32' // theme info vs success
  return L.divIcon({
    className: 'sub-waypoint-marker',
    html: `<div style="
      width: 24px;
      height: 24px;
      background-color: ${bgColor};
      border: 2px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
      color: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.4);
    ">${sequenceLabel}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

export default function MicroRouteLayer({ tasks = [], routeWaypoints = [] }) {
  const renderedSubRoutes = useMemo(() => {
    if (!tasks || tasks.length === 0) return null

    return tasks.map((task) => {
      if (!task.reports || task.reports.length === 0 || !task.report_sequence) return null
      
      // Find the main waypoint for this task to get the sequence number
      const waypoint = routeWaypoints.find(wp => wp.cleanup_task_id === task.id)
      const taskSequenceOrder = waypoint ? waypoint.sequence_order : '?'
      const centerCoords = waypoint && waypoint.latitude && waypoint.longitude 
        ? [parseFloat(waypoint.latitude), parseFloat(waypoint.longitude)] 
        : null
        
      if (!centerCoords) return null

      // Order reports based on report_sequence
      let orderedReports = [...task.reports]
      orderedReports.sort((a, b) => {
        let idxA = task.report_sequence.indexOf(a.id)
        let idxB = task.report_sequence.indexOf(b.id)
        if (idxA === -1) idxA = 999
        if (idxB === -1) idxB = 999
        return idxA - idxB
      })

      // Extract coordinates for the line (Center -> Report 1 -> Report 2 ...)
      const positions = [centerCoords]
      const validReports = []
      
      orderedReports.forEach((report, idx) => {
        const coords = parseGeometry(report.location)
        if (coords) {
          positions.push(coords)
          validReports.push({ report, coords, label: `${taskSequenceOrder}.${idx + 1}` })
        }
      })

      if (positions.length <= 1) return null

      return (
        <div key={`micro-route-${task.id}`}>
          {/* Dashed Line Connecting Reports */}
          <Polyline
            positions={positions}
            pathOptions={{
              color: '#ccff00', 
              weight: 3, 
              opacity: 0.7, 
              dashArray: '5, 10'
            }}
          />
          
          {/* Numbered Sub-Pins for Reports */}
          {validReports.map(({ report, coords, label }) => (
            <Marker
              key={report.id}
              position={coords}
              icon={createSubWaypointIcon(label, report.validation_status)}
            >
              <Popup>
                <div className="p-2">
                  <strong className="block text-sm">{label} - {report.issue_type?.replace(/_/g, ' ').toUpperCase()}</strong>
                  <p className="text-xs text-text-muted mt-1">{report.description?.substring(0, 100)}...</p>
                  <div className="mt-2 flex gap-2">
                    <span className="text-[10px] font-bold font-mono tracking-wider px-2 py-1 border bg-surface-elevated uppercase">
                      Status: {report.status}
                    </span>
                    <span className={`text-[10px] font-bold font-mono tracking-wider px-2 py-1 border uppercase ${
                      report.validation_status === 'pending' ? 'bg-info/10 text-info border-info/30' : 'bg-success/10 text-success border-success/30'
                    }`}>
                      {report.validation_status === 'pending' ? 'Needs Validation' : 'Validated'}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </div>
      )
    })
  }, [tasks, routeWaypoints])

  return <>{renderedSubRoutes}</>
}
