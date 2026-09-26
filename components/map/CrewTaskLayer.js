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

const CREW_COLORS = [
  '#ccff00', '#FF0055', '#00FFFF', '#FF9900', '#9900FF', '#00FF66'
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
      color: ${isCompleted ? color : (color === '#ccff00' || color === '#00FFFF' || color === '#00FF66' ? 'black' : 'white')};
      box-shadow: 0 2px 4px rgba(0,0,0,0.4);
    ">${label}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

export default function CrewTaskLayer({ tasks = [] }) {
  const renderedTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return null

    return tasks.map((task) => {
      if (!task.reports || task.reports.length === 0) return null
      
      const crewId = task.assigned_crew_ids && task.assigned_crew_ids.length > 0 ? task.assigned_crew_ids[0] : null
      const color = getCrewColor(crewId)
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
            />
          )}
          
          {/* Pins for Reports */}
          {validReports.map(({ report, coords, label }) => {
            const isCompleted = isTaskCompleted || report.status === 'resolved' || report.validation_status === 'validated'
            return (
              <Marker
                key={report.id}
                position={coords}
                icon={createTaskReportIcon(label, color, isCompleted)}
              >
                <Popup className="cyber-popup">
                  <div className="p-3 bg-surface border-2 border-[#1A1A1A] rounded-none" style={{ boxShadow: '4px 4px 0px 0px #1A1A1A' }}>
                    <div className="text-xs font-mono font-bold tracking-widest text-text-muted mb-1">TASK #{task.id}</div>
                    <strong className="block text-sm uppercase font-mono mb-2 text-text-primary border-b-2 border-border pb-1">
                      {report.issue_type?.replace(/_/g, ' ')}
                    </strong>
                    <div className="text-xs space-y-1 font-mono">
                      <div><span className="text-text-muted">TASK STATUS:</span> <span className="font-bold">{task.status.toUpperCase()}</span></div>
                      <div><span className="text-text-muted">REPORT ID:</span> <span className="font-bold">#{report.id}</span></div>
                    </div>
                    <div className="mt-3">
                      <a 
                        href={`/dashboard/field-crew/operations/${task.id}`}
                        className="block text-center w-full bg-[#1A1A1A] text-[#ccff00] font-bold text-xs py-2 uppercase hover:bg-[#333] transition-colors"
                      >
                        View Operation
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </div>
      )
    })
  }, [tasks])

  return <>{renderedTasks}</>
}
