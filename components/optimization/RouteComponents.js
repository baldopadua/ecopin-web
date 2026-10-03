'use client'
import React, { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Sun, CloudRain, CloudLightning, Circle, Ruler, Timer } from 'lucide-react'

export const WEATHER_OPTIONS = [
  { value: 'normal', label: 'Normal', icon: <Sun className="w-4 h-4 text-warning" /> },
  { value: 'heavy_rain', label: 'Heavy Rain', icon: <CloudRain className="w-4 h-4 text-info" /> },
  { value: 'storm', label: 'Storm', icon: <CloudLightning className="w-4 h-4 text-purple" /> },
]

export const TRAFFIC_OPTIONS = [
  { value: 'low', label: 'Low', icon: <Circle className="w-4 h-4 text-success fill-success" /> },
  { value: 'moderate', label: 'Moderate', icon: <Circle className="w-4 h-4 text-warning fill-warning" /> },
  { value: 'heavy', label: 'Heavy', icon: <Circle className="w-4 h-4 text-error fill-error" /> },
]

export const PRIORITY_STYLES = {
  urgent: 'bg-error/20 text-error border-error/30',
  high: 'bg-warning/20 text-warning border-warning/30',
  medium: 'bg-info/20 text-info border-info/30',
  low: 'bg-success/20 text-success border-success/30',
}

export const STATUS_STYLES = {
  proposed: 'bg-warning/20 text-warning border-warning/30',
  approved: 'bg-success/20 text-success border-success/30',
  discarded: 'bg-text-muted/20 text-text-muted border-text-muted/30',
  draft: 'bg-info/20 text-info border-info/30',
  failed: 'bg-error/20 text-error border-error/30',
}

export const CREW_COLORS = ['#0052CC', '#60A5FA', '#EF4444', '#F9A825', '#8B5CF6']

export function formatDistance(meters) {
  if (!meters) return '—'
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}

export function formatDuration(minutes) {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// Dynamic import for Leaflet components (SSR-incompatible)
const MapContainer = dynamic(
  () => import('react-leaflet').then(m => m.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then(m => m.TileLayer),
  { ssr: false }
)
const RouteLayer = dynamic(
  () => import('@/components/map/RouteLayer'),
  { ssr: false }
)

export function CrewRouteCard({ route, index, color }) {
  const crewName = route.field_crews?.name || `Crew ${index + 1}`
  const waypoints = route.waypoints || []
  const taskWaypoints = waypoints.filter(w => w.waypoint_type === 'task')

  let scoutingCount = 0
  let cleanupCount = 0
  let mixedCount = 0

  taskWaypoints.forEach(wp => {
    const type = wp.cleanup_tasks?.task_type || 'Cleanup'
    if (type === 'Scouting') scoutingCount++
    else if (type === 'Cleanup') cleanupCount++
    else mixedCount++
  })

  let dominantType = 'Cleanup'
  let badgeStyle = 'bg-success/20 text-success border-success/30'
  let badgeIcon = '🚛'
  
  if (scoutingCount > 0 && cleanupCount === 0 && mixedCount === 0) {
    dominantType = 'Scouting'
    badgeStyle = 'bg-info/20 text-info border-info/30'
    badgeIcon = '🔍'
  } else if (cleanupCount > 0 && scoutingCount === 0 && mixedCount === 0) {
    dominantType = 'Cleanup'
  } else if (taskWaypoints.length > 0) {
    dominantType = 'Mixed'
    badgeStyle = 'bg-purple/20 text-purple border-purple/30'
    badgeIcon = '🔄'
  }

  return (
    <div className="border-2 border-border bg-surface-elevated">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col gap-2">
            <h4 className="font-bold text-text-primary flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
              {crewName}
              <span className="text-xs text-text-muted font-mono">({route.task_count || taskWaypoints.length} tasks)</span>
            </h4>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 border font-bold font-mono tracking-wide ${badgeStyle}`}>
                {badgeIcon} {dominantType} Route
              </span>
              <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                ({scoutingCount} Scout, {cleanupCount} Clean, {mixedCount} Mix)
              </span>
            </div>
          </div>
          <div className="flex gap-4 text-xs font-mono text-text-muted">
            <span className="flex items-center"><Ruler className="w-4 h-4 mr-1" /> {formatDistance(route.total_distance_meters)}</span>
            <span className="flex items-center"><Timer className="w-4 h-4 mr-1" /> {formatDuration(route.total_duration_min)}</span>
          </div>
        </div>
        
        {waypoints.length > 0 ? (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/30">
            {taskWaypoints.map((wp, wpIdx) => (
              <div key={wp.id} className="flex items-center gap-2 bg-surface border border-border px-2 py-1 rounded-sm">
                <span 
                  className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {wp.sequence_order || wpIdx + 1}
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-text-primary truncate block">
                    Task #{wp.cleanup_task_id?.slice(0, 8)}...
                  </span>
                  {wp.cleanup_tasks?.task_type && (
                    <span className={`text-[10px] uppercase font-bold font-mono tracking-wider px-1.5 py-0.5 border ${
                      wp.cleanup_tasks.task_type === 'Scouting' ? 'bg-info/10 text-info border-info/20' :
                      wp.cleanup_tasks.task_type === 'Cleanup' ? 'bg-success/10 text-success border-success/20' :
                      'bg-purple/10 text-purple border-purple/20'
                    }`}>
                      {wp.cleanup_tasks.task_type}
                    </span>
                  )}
                </div>
                <span className="text-xs text-text-muted font-mono whitespace-nowrap">
                  +{formatDistance(wp.distance_from_previous_meters)} | +{formatDuration(wp.estimated_time_from_previous_min)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted">Route waypoint details not loaded</p>
        )}
      </div>
    </div>
  )
}

const PLP_CENTER = [14.561433, 121.075636]

export function RouteMapView({ routes }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    import('@/lib/leaflet-fix')
    setMounted(true)
  }, [])

  const routeData = useMemo(() => {
    if (!routes) return []
    return routes.map((route, idx) => ({
      ...route,
      crewName: route.field_crews?.name || `Crew ${idx + 1}`,
      color: CREW_COLORS[idx % CREW_COLORS.length],
    }))
  }, [routes])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full bg-surface-elevated text-text-muted">
        Loading map...
      </div>
    )
  }

  return (
    <MapContainer
      center={PLP_CENTER}
      zoom={14}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
      />
      <RouteLayer routes={routeData} />
    </MapContainer>
  )
}
