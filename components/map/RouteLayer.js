'use client'
import { useMemo } from 'react'
import { Polyline, Marker, Popup, CircleMarker } from 'react-leaflet'
import L from 'leaflet'

/**
 * RouteLayer — Renders route polylines and numbered waypoint markers
 * on the existing EcoPinMap Leaflet map.
 *
 * Props:
 *   routes: Array of route objects, each with:
 *     - crewName: string
 *     - color: string (hex)
 *     - waypoints: array of { sequence_order, latitude, longitude, waypoint_type, cleanup_task_id, ... }
 *     - totalDistance: number (meters)
 *     - totalDuration: number (minutes)
 */

function formatDistance(meters) {
  if (!meters) return '—'
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}

function formatDuration(minutes) {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function createDepotIcon() {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: #0052CC;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    ">🏢</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

function createWaypointIcon(sequenceNumber, color) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      position: relative;
      background-color: ${color};
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <img src="/pin-icon.svg" alt="pin" style="width: 20px; height: 20px;" />
      <span style="
        position: absolute;
        top: -4px;
        right: -4px;
        background: #111827;
        color: white;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        font-size: 10px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
      ">${sequenceNumber}</span>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

export default function RouteLayer({ routes = [] }) {
  const renderedRoutes = useMemo(() => {
    if (!routes || routes.length === 0) return null

    return routes.map((route, routeIdx) => {
      const color = route.color || ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'][routeIdx % 4]
      const waypoints = route.waypoints || []

      if (waypoints.length === 0) return null

      // Build polyline positions from waypoints
      const positions = []
      waypoints.forEach((wp) => {
        if (wp.polyline && wp.polyline.length > 0) {
          positions.push(...wp.polyline.map(p => [parseFloat(p.latitude), parseFloat(p.longitude)]))
        } else if (wp.latitude && wp.longitude) {
          positions.push([parseFloat(wp.latitude), parseFloat(wp.longitude)])
        }
      })

      const depotWaypoints = waypoints.filter(wp => wp.waypoint_type === 'depot_start' || wp.waypoint_type === 'depot_end')
      const taskWaypoints = waypoints.filter(wp => wp.waypoint_type === 'task')

      return (
        <div key={route.id || `route-${routeIdx}`}>
          {/* Route Polyline */}
          {positions.length > 1 && (
            <Polyline
              positions={positions}
              pathOptions={{
                color: color,
                weight: 4,
                opacity: 0.8,
                dashArray: route.isDraft ? '8 8' : undefined,
              }}
            />
          )}

          {/* Depot Markers */}
          {depotWaypoints.map((wp, wpIdx) => {
            if (!wp.latitude || !wp.longitude) return null
            return (
              <Marker
                key={`depot-${routeIdx}-${wpIdx}`}
                position={[parseFloat(wp.latitude), parseFloat(wp.longitude)]}
                icon={createDepotIcon()}
              >
                <Popup>
                  <div className="p-1 min-w-[180px]">
                    <div className="text-xs font-semibold text-blue-600 mb-1 tracking-wider uppercase">SWMO DEPOT</div>
                    <strong className="block text-sm text-gray-800 mb-2">
                      {wp.waypoint_type === 'depot_start' ? 'Route Start' : 'Route End'}
                    </strong>
                    <div className="text-sm space-y-1 text-text-secondary">
                      <div><span className="text-text-muted">Lat:</span> <span className="font-medium text-gray-800">{parseFloat(wp.latitude).toFixed(6)}</span></div>
                      <div><span className="text-text-muted">Lng:</span> <span className="font-medium text-gray-800">{parseFloat(wp.longitude).toFixed(6)}</span></div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {/* Task Waypoint Markers (Numbered) */}
          {taskWaypoints.map((wp, wpIdx) => {
            if (!wp.latitude || !wp.longitude) return null
            const seq = wp.sequence_order || wpIdx + 1
            return (
              <Marker
                key={`task-wp-${routeIdx}-${wpIdx}`}
                position={[parseFloat(wp.latitude), parseFloat(wp.longitude)]}
                icon={createWaypointIcon(seq, color)}
              >
                <Popup>
                  <div className="p-1 min-w-[200px]">
                    <div className="text-xs font-semibold text-blue-600 mb-1 tracking-wider uppercase">STOP #{seq}</div>
                    <strong className="block text-sm text-gray-800 mb-2">
                      {route.crewName || `Crew ${routeIdx + 1}`}
                    </strong>
                    {wp.cleanup_task_id && (
                      <div className="text-sm mb-2 text-text-secondary">
                        <span className="text-text-muted">Task ID:</span> <span className="font-medium text-gray-800">#{wp.cleanup_task_id.slice(0, 8)}</span>
                      </div>
                    )}
                    <div className="text-sm space-y-1 text-text-secondary">
                      {wp.distance_from_previous_meters && (
                        <div><span className="text-text-muted">Dist:</span> <span className="font-medium text-gray-800">{formatDistance(wp.distance_from_previous_meters)}</span></div>
                      )}
                      {wp.estimated_time_from_previous_min && (
                        <div><span className="text-text-muted">Time:</span> <span className="font-medium text-gray-800">~{formatDuration(wp.estimated_time_from_previous_min)}</span></div>
                      )}
                      <div><span className="text-text-muted">Loc:</span> <span className="font-medium text-gray-800">{parseFloat(wp.latitude).toFixed(6)}, {parseFloat(wp.longitude).toFixed(6)}</span></div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {/* Route summary label at the midpoint */}
          {positions.length > 2 && (
            <CircleMarker
              center={positions[Math.floor(positions.length / 2)]}
              radius={0}
              pathOptions={{ opacity: 0 }}
            >
              <Popup>
                <div className="p-1 min-w-[200px]">
                  <div className="text-xs font-semibold text-blue-600 mb-1 tracking-wider uppercase">ROUTE SUMMARY</div>
                  <strong className="block text-sm text-gray-800 mb-2">
                    {route.crewName || `Crew ${routeIdx + 1}`}
                  </strong>
                  <div className="text-sm space-y-1 text-text-secondary">
                    <div><span className="text-text-muted">Tasks:</span> <span className="font-medium text-gray-800">{taskWaypoints.length}</span></div>
                    <div><span className="text-text-muted">Distance:</span> <span className="font-medium text-gray-800">{formatDistance(route.totalDistance || route.total_distance_meters)}</span></div>
                    <div><span className="text-text-muted">Duration:</span> <span className="font-medium text-gray-800">{formatDuration(route.totalDuration || route.total_duration_min)}</span></div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )}
        </div>
      )
    })
  }, [routes])

  return <>{renderedRoutes}</>
}
