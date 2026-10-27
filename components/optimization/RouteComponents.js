'use client'
import React, { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Sun, CloudRain, CloudLightning, Circle, Ruler, Timer } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

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

import { calculateWorkloadMetrics } from '@/lib/helpers/workloadMetrics.mjs'

export function TaskTimeWorkloadGraph({ routes = [], title = "Task time workload" }) {
  if (!routes || routes.length === 0) return null

  const {
    metrics,
    maxVal,
    minVal,
    totalVal,
    avgVal,
    spread,
    chartMax,
    ticks
  } = calculateWorkloadMetrics(routes)

  const avgPct = Math.min(95, Math.max(5, (avgVal / chartMax) * 100))

  return (
    <div className="card p-4 border border-border bg-surface rounded-xl mb-6 shadow-sm">
      {/* Header with Title and Intelligence Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-border/60">
        <div>
          <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2 m-0">
            <Timer className="w-4 h-4 text-primary" />
            {title}
          </h3>
          <p className="text-xs text-text-muted mt-0.5 m-0">
            Workload distribution across assigned crews measured against shift time capacity
          </p>
        </div>

        {/* Comparative Stats Pills */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="px-2.5 py-1 bg-surface-elevated border border-border rounded-md font-sans text-text-secondary">
            Avg: <strong className="text-text-primary">{formatDuration(avgVal)}</strong>
          </span>
          {metrics.length > 1 && (
            <span className={`px-2.5 py-1 rounded-md font-sans border ${
              spread > 60
                ? 'bg-warning/10 border-warning/30 text-warning font-medium'
                : 'bg-surface-elevated border-border text-text-secondary'
            }`}>
              Spread: <strong className={spread > 60 ? 'text-warning' : 'text-text-primary'}>{formatDuration(spread)}</strong>
            </span>
          )}
          <span className="px-2.5 py-1 bg-surface-elevated border border-border rounded-md font-sans text-text-secondary">
            Total: <strong className="text-text-primary">{formatDuration(totalVal)}</strong>
          </span>
        </div>
      </div>

      {/* Chart Canvas with Y-Axis and Measured Bars */}
      <div className="relative pt-6 pb-2">
        <div className="flex gap-2 sm:gap-3">
          {/* Y-Axis Time Labels */}
          <div className="w-11 sm:w-12 h-44 flex flex-col justify-between items-end pr-1 text-[11px] font-sans text-text-muted select-none">
            {ticks.map((t, idx) => (
              <span key={idx} className="leading-none">{formatDuration(t)}</span>
            ))}
            <span className="leading-none">0m</span>
          </div>

          {/* Plot Area with Gridlines, Avg Line, and Dynamic Bars */}
          <div className="flex-1 relative h-44 flex flex-col justify-between">
            {/* Horizontal Gridlines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {ticks.map((_, idx) => (
                <div key={idx} className="w-full border-b border-border/40" />
              ))}
              <div className="w-full border-b border-border" />
            </div>

            {/* Team Average Reference Line */}
            {avgPct > 8 && avgPct < 92 && (
              <div 
                className="absolute w-full z-10 pointer-events-none flex items-center"
                style={{ bottom: `${avgPct}%` }}
              >
                <div className="w-full border-b-2 border-dashed border-primary/50" />
                <span className="absolute right-1 -top-3.5 px-1.5 py-0.5 rounded bg-primary text-white text-[9px] font-semibold tracking-wide uppercase shadow-sm">
                  Team Avg ({formatDuration(avgVal)})
                </span>
              </div>
            )}

            {/* Bars Container */}
            <div className="absolute inset-0 flex items-end gap-2 sm:gap-4 px-2 z-20">
              {metrics.map((m, i) => {
                const heightPct = Math.min(100, Math.max(8, (m.dur / chartMax) * 100))
                const diff = m.dur - avgVal

                return (
                  <div 
                    key={m.key} 
                    className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                  >
                    {/* Top Metric Header (Duration & Difference) */}
                    <div className="mb-1.5 text-center transition-transform group-hover:-translate-y-1 duration-200">
                      <div className="text-xs font-bold text-text-primary leading-tight font-sans">
                        {formatDuration(m.dur)}
                      </div>
                      <div className="text-[10px] text-text-muted font-sans flex items-center justify-center gap-1 mt-0.5">
                        <span className="hidden sm:inline">{m.tasks} {m.tasks === 1 ? 'task' : 'tasks'}</span>
                        {Math.abs(diff) > 5 && (
                          <span className={`font-semibold ${diff > 0 ? 'text-warning' : 'text-info'}`}>
                            {diff > 0 ? `+${formatDuration(diff)}` : `-${formatDuration(Math.abs(diff))}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Background Column Track (represents 100% capacity) */}
                    <div className="w-full max-w-[54px] h-full flex items-end bg-black/5 dark:bg-surface/5 rounded-t-md p-0.5 border-b border-border">
                      {/* Filled Progress Bar with Crew Color */}
                      <div
                        className="w-full rounded-t-sm transition-all duration-500 relative group-hover:brightness-110 shadow-sm"
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: m.color,
                        }}
                      >
                        {/* Top highlight cap */}
                        <div className="w-full h-1 bg-white/40 rounded-t-sm" />
                      </div>
                    </div>

                    {/* Crew Label Under the Bar */}
                    <span 
                      className="text-xs font-sans font-medium text-text-secondary mt-2 truncate w-full text-center max-w-[84px]"
                      title={m.crewName}
                    >
                      {m.crewName}
                    </span>

                    {/* Interactive Hover Tooltip */}
                    <div className="absolute bottom-full mb-8 hidden group-hover:flex flex-col p-2.5 bg-surface text-text-primary border border-border rounded-lg shadow-xl z-50 min-w-[170px] pointer-events-none text-xs">
                      <div className="font-semibold text-text-primary flex items-center gap-1.5 pb-1 border-b border-border/60">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: m.color }} />
                        {m.crewName}
                      </div>
                      <div className="space-y-1 pt-1.5 text-text-secondary">
                        <div className="flex justify-between">
                          <span>Total Workload:</span>
                          <strong className="text-text-primary">{formatDuration(m.dur)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Tasks Assigned:</span>
                          <strong className="text-text-primary">{m.tasks}</strong>
                        </div>
                        {m.dist > 0 && (
                          <div className="flex justify-between">
                            <span>Travel Distance:</span>
                            <span className="text-text-primary">{formatDistance(m.dist)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1 border-t border-border/40 text-[11px]">
                          <span>Shift Utilization:</span>
                          <span className="font-semibold text-text-primary">{Math.round((m.dur / chartMax) * 100)}%</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span>Vs Team Average:</span>
                          <span className={`font-semibold ${diff > 0 ? 'text-warning' : diff < 0 ? 'text-info' : 'text-text-muted'}`}>
                            {diff === 0 ? 'Balanced' : `${diff > 0 ? '+' : '-'}${formatDuration(Math.abs(diff))}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

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
    <div className="border border-border bg-surface-elevated">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col gap-2">
            <h4 className="font-semibold text-text-primary flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
              {crewName}
              <span className="text-xs text-text-muted font-sans">({route.task_count || taskWaypoints.length} tasks)</span>
            </h4>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 border font-semibold font-sans tracking-normal ${badgeStyle}`}>
                {badgeIcon} {dominantType} Route
              </span>
              <span className="text-xs font-sans text-text-muted normal-case tracking-normal">
                ({scoutingCount} Scout, {cleanupCount} Clean, {mixedCount} Mix)
              </span>
            </div>
          </div>
          <div className="flex gap-4 text-xs font-sans text-text-muted">
            <span className="flex items-center"><Ruler className="w-4 h-4 mr-1" /> {formatDistance(route.total_distance_meters)}</span>
            <span className="flex items-center"><Timer className="w-4 h-4 mr-1" /> {formatDuration(route.total_duration_min)}</span>
          </div>
        </div>
        
        {waypoints.length > 0 ? (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/30">
            {taskWaypoints.map((wp, wpIdx) => (
              <div key={wp.id} className="flex items-center gap-2 bg-surface border border-border px-2 py-1 rounded-sm">
                <span 
                  className="w-5 h-5 flex items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: color }}
                >
                  {wp.sequence_order || wpIdx + 1}
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-text-primary truncate block">
                    Task #{wp.cleanup_task_id?.slice(0, 8)}...
                  </span>
                  {wp.cleanup_tasks?.task_type && (
                    <span className={`text-xs normal-case font-semibold font-sans tracking-normal px-1.5 py-0.5 border ${
                      wp.cleanup_tasks.task_type === 'Scouting' ? 'bg-info/10 text-info border-info/20' :
                      wp.cleanup_tasks.task_type === 'Cleanup' ? 'bg-success/10 text-success border-success/20' :
                      'bg-purple/10 text-purple border-purple/20'
                    }`}>
                      {wp.cleanup_tasks.task_type}
                    </span>
                  )}
                </div>
                <span className="text-xs text-text-muted font-sans whitespace-nowrap">
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

export function RouteMapView({ routes, travelMode = 'DRIVING' }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    let cancelled = false
    import('@/lib/leaflet-fix').then(() => {
      if (!cancelled) setMounted(true)
    })
    return () => { cancelled = true }
  }, [])

  const routeData = useMemo(() => {
    if (!routes) return []
    return routes.map((route, idx) => ({
      ...route,
      travelMode: route.travel_mode || route.travelMode || travelMode,
      crewName: route.field_crews?.name || `Crew ${idx + 1}`,
      color: CREW_COLORS[idx % CREW_COLORS.length],
    }))
  }, [routes, travelMode])

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
      <RouteLayer routes={routeData} travelMode={travelMode} />
    </MapContainer>
  )
}
