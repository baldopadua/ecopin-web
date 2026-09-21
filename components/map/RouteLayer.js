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
    className: 'depot-marker',
    html: `<div style="
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #ccff00, #a3cc00);
      border: 3px solid #1a1a1a;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 2px 2px 0 #1a1a1a;
    ">🏢</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

function createWaypointIcon(sequenceNumber, color) {
  return L.divIcon({
    className: 'waypoint-marker',
    html: `<div style="
      width: 28px;
      height: 28px;
      background-color: ${color};
      border: 2px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      color: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.4);
    ">${sequenceNumber}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
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
      const positions = waypoints
        .filter(wp => wp.latitude && wp.longitude)
        .map(wp => [parseFloat(wp.latitude), parseFloat(wp.longitude)])

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
                  <div className="p-2">
                    <strong className="block text-sm">🏢 SWMO Depot</strong>
                    <p className="text-xs text-gray-500 mt-1">
                      {wp.waypoint_type === 'depot_start' ? 'Route Start' : 'Route End'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      {parseFloat(wp.latitude).toFixed(6)}, {parseFloat(wp.longitude).toFixed(6)}
                    </p>
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
                  <div className="p-2">
                    <strong className="block text-sm" style={{ color }}>
                      {route.crewName || `Crew ${routeIdx + 1}`} — Stop #{seq}
                    </strong>
                    {wp.cleanup_task_id && (
                      <p className="text-xs text-gray-500 mt-1 font-mono">
                        Task: {wp.cleanup_task_id.slice(0, 8)}...
                      </p>
                    )}
                    <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                      {wp.distance_from_previous_meters && (
                        <p>📏 {formatDistance(wp.distance_from_previous_meters)} from previous</p>
                      )}
                      {wp.estimated_time_from_previous_min && (
                        <p>⏱️ ~{formatDuration(wp.estimated_time_from_previous_min)} travel</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      {parseFloat(wp.latitude).toFixed(6)}, {parseFloat(wp.longitude).toFixed(6)}
                    </p>
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
                <div className="p-2">
                  <strong className="block text-sm" style={{ color }}>
                    {route.crewName || `Crew ${routeIdx + 1}`}
                  </strong>
                  <p className="text-xs text-gray-500 mt-1">
                    {taskWaypoints.length} tasks | {formatDistance(route.totalDistance || route.total_distance_meters)} | {formatDuration(route.totalDuration || route.total_duration_min)}
                  </p>
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
