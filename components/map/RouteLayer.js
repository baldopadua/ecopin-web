'use client'
import React, { useMemo, useEffect, useState } from 'react'
import { Polyline, Marker, Popup, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { reportDiagnostic } from '../../lib/diagnostics.mjs';

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
 *   travelMode: string ('DRIVING', 'MOTORCYCLE', 'BICYCLE', 'WALKING')
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

const OSRM_PROFILE_MAP = {
  DRIVING: 'driving',
  MOTORCYCLE: 'driving',
  BICYCLE: 'bike',
  WALKING: 'walking',
}

function deduplicateCoords(coords) {
  if (!coords || coords.length === 0) return []
  const result = [coords[0]]
  for (let i = 1; i < coords.length; i++) {
    const prev = result[result.length - 1]
    const curr = coords[i]
    if (Math.abs(curr[0] - prev[0]) > 0.00002 || Math.abs(curr[1] - prev[1]) > 0.00002) {
      result.push(curr)
    }
  }
  return result
}

async function requestOsrm(profile, coordStr) {
  const res = await fetch(`https://router.project-osrm.org/route/v1/${profile}/${coordStr}?overview=full&geometries=geojson`, {
    signal: AbortSignal.timeout(6000)
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
    return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
  }
  return null
}

async function fetchStreetLevelRoute(coords, mode = 'DRIVING') {
  if (!coords || coords.length < 2) return null
  const cleanCoords = deduplicateCoords(coords)
  if (cleanCoords.length < 2) return cleanCoords.length === 1 ? [cleanCoords[0], cleanCoords[0]] : null

  const profile = OSRM_PROFILE_MAP[mode?.toUpperCase()] || 'driving'
  try {
    if (cleanCoords.length <= 25) {
      const coordStr = cleanCoords.map(c => `${c[1]},${c[0]}`).join(';') // lng,lat
      let points = await requestOsrm(profile, coordStr)
      if (!points && profile !== 'driving') {
        points = await requestOsrm('driving', coordStr)
      }
      return points
    }

    const allPoints = []
    const chunkSize = 20
    for (let i = 0; i < cleanCoords.length - 1; i += chunkSize - 1) {
      const chunk = cleanCoords.slice(i, i + chunkSize)
      if (chunk.length < 2) break
      const coordStr = chunk.map(c => `${c[1]},${c[0]}`).join(';')
      let segPoints = await requestOsrm(profile, coordStr)
      if (!segPoints && profile !== 'driving') {
        segPoints = await requestOsrm('driving', coordStr)
      }
      if (segPoints && segPoints.length > 0) {
        allPoints.push(...(allPoints.length > 0 ? segPoints.slice(1) : segPoints))
      }
    }
    return allPoints.length > 0 ? allPoints : null
  } catch (err) {
    reportDiagnostic('warn', 'map', '[RouteLayer] OSRM street route fetch error:', err.message)
    return null
  }
}

export default function RouteLayer({ routes = [], travelMode = 'DRIVING' }) {
  const map = useMap()
  const [streetRoutes, setStreetRoutes] = useState({})

  // Fetch actual street-level road routes asynchronously (just like the mobile client)
  useEffect(() => {
    let cancelled = false

    async function loadStreetRoutes() {
      if (!routes || routes.length === 0) return

      for (const [routeIdx, route] of routes.entries()) {
        const effectiveMode = (route.travel_mode || route.travelMode || travelMode || 'DRIVING').toUpperCase()
        const baseKey = route.id || route.crewId || route.vehicle_id || `route-${routeIdx}`
        const cacheKey = `${baseKey}-${effectiveMode}`
        const waypoints = route.waypoints || []

        const hasExistingPolyline = waypoints.some(wp => Array.isArray(wp.polyline) && wp.polyline.length > 0)
        if (hasExistingPolyline) continue
        if (streetRoutes[cacheKey]?.length > 0) continue

        const coords = waypoints
          .filter(wp => Number.isFinite(parseFloat(wp.latitude)) && Number.isFinite(parseFloat(wp.longitude)))
          .map(wp => [parseFloat(wp.latitude), parseFloat(wp.longitude)])

        if (coords.length < 2) continue

        const streetPoints = await fetchStreetLevelRoute(coords, effectiveMode)
        if (!cancelled && streetPoints && streetPoints.length > 0) {
          setStreetRoutes(prev => ({
            ...prev,
            [cacheKey]: streetPoints,
            [baseKey]: streetPoints
          }))
        }
      }
    }

    loadStreetRoutes()
    return () => { cancelled = true }
  }, [routes, travelMode])

  useEffect(() => {
    if (!routes || routes.length === 0 || !map) return
    const allPositions = []
    routes.forEach((r, idx) => {
      const effectiveMode = (r.travel_mode || r.travelMode || travelMode || 'DRIVING').toUpperCase()
      const baseKey = r.id || r.crewId || r.vehicle_id || `route-${idx}`
      const cacheKey = `${baseKey}-${effectiveMode}`
      const activeStreet = streetRoutes[cacheKey] || streetRoutes[baseKey]

      if (activeStreet?.length > 0) {
        allPositions.push(...activeStreet)
      } else {
        (r.waypoints || []).forEach(wp => {
          if (wp.polyline && wp.polyline.length > 0) {
            wp.polyline.forEach(p => {
              if (p.latitude && p.longitude) allPositions.push([parseFloat(p.latitude), parseFloat(p.longitude)])
            })
          } else if (wp.latitude && wp.longitude) {
            allPositions.push([parseFloat(wp.latitude), parseFloat(wp.longitude)])
          }
        })
      }
    })
    if (allPositions.length > 0) {
      try {
        const bounds = L.latLngBounds(allPositions)
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
        }
      } catch (err) {
        reportDiagnostic('warn', 'map', 'fitBounds warning:', err)
      }
    }
  }, [map, routes, streetRoutes, travelMode])

  const renderedRoutes = useMemo(() => {
    if (!routes || routes.length === 0) return null

    return routes.map((route, routeIdx) => {
      const color = route.color || ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'][routeIdx % 4]
      const waypoints = route.waypoints || []

      if (waypoints.length === 0) return null

      const effectiveMode = (route.travel_mode || route.travelMode || travelMode || 'DRIVING').toUpperCase()
      const routeKey = route.id || route.crewId || route.vehicle_id || `route-${routeIdx}`
      const baseKey = routeKey
      const cacheKey = `${baseKey}-${effectiveMode}`
      const hasExistingPolyline = waypoints.some(wp => Array.isArray(wp.polyline) && wp.polyline.length > 0)

      // Build polyline positions: prefer rich existing polyline, then fetched street route, then waypoint endpoints
      let positions = []
      const activeStreet = streetRoutes[cacheKey] || streetRoutes[baseKey]

      if (hasExistingPolyline) {
        waypoints.forEach((wp) => {
          if (wp.polyline && wp.polyline.length > 0) {
            positions.push(...wp.polyline.map(p => [parseFloat(p.latitude), parseFloat(p.longitude)]))
          } else if (wp.latitude && wp.longitude) {
            positions.push([parseFloat(wp.latitude), parseFloat(wp.longitude)])
          }
        })
      } else if (activeStreet && activeStreet.length > 0) {
        positions = activeStreet
      } else {
        waypoints.forEach((wp) => {
          if (wp.latitude && wp.longitude) {
            positions.push([parseFloat(wp.latitude), parseFloat(wp.longitude)])
          }
        })
      }

      const depotWaypoints = waypoints.filter(wp => wp.waypoint_type === 'depot_start')
      const taskWaypoints = waypoints.filter(wp => wp.waypoint_type === 'task')

      return (
        <React.Fragment key={routeKey}>
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
        </React.Fragment>
      )
    })
  }, [routes, streetRoutes, travelMode])

  return <>{renderedRoutes}</>
}
