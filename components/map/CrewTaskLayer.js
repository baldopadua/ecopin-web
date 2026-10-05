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
    "></div>`,
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
            const isCompleted = isTaskCompleted || report.status === 'resolved' || report.validation_status === 'approved' || report.validation_status === 'validated'
            return (
              <Marker
                key={report.id}
                position={coords}
                icon={createTaskReportIcon(label, color, isCompleted)}
              >
                <Popup>
                  <div className="p-1 min-w-[200px]">
                    <div className="text-xs font-semibold text-blue-600 mb-1 tracking-wider uppercase">TASK #{task.id}</div>
                    <strong className="block text-sm text-gray-800 mb-2 truncate">
                      {report.issue_type?.replace(/_/g, ' ')}
                    </strong>
                    <div className="text-sm space-y-1 text-gray-600">
                      <div><span className="text-gray-500">Task Status:</span> <span className="font-medium text-gray-800">{task.status.toUpperCase()}</span></div>
                      <div><span className="text-gray-500">Report ID:</span> <span className="font-medium text-gray-800">#{report.id}</span></div>
                    </div>
                    <div className="mt-4">
                      <a 
                        href={`/dashboard/field-crew/operations/${task.id}`}
                        className="block text-center w-full bg-blue-600 text-white font-medium text-sm py-2 rounded shadow-sm hover:bg-blue-700 transition-colors"
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
