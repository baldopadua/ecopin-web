'use client'
import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getActiveRoutes } from '@/lib/api/optimization'
import { fetchCleanupTasks } from '@/lib/api/cleanupTasks'
import { useUser } from '@/components/auth/UserContext'
import { FieldCrewGuard } from '@/components/auth/RequireRole'
import PageHeader from '@/components/layout/PageHeader'
import RouteLayer from '@/components/map/RouteLayer'

const MicroRouteLayer = dynamic(() => import('@/components/map/MicroRouteLayer'), { ssr: false })

// Dynamically import the map to avoid SSR issues
const EcoPinMap = dynamic(() => import('@/components/map/EcoPinMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-surface-elevated animate-pulse flex items-center justify-center border-2 border-border">
      <div className="text-text-muted font-mono font-bold tracking-widest">LOADING MAP...</div>
    </div>
  )
})

export default function MyRoutePage() {
  const router = useRouter()
  const user = useUser()
  const [loading, setLoading] = useState(true)
  const [myRoute, setMyRoute] = useState(null)
  const [tasks, setTasks] = useState([])
  
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        // 1. Fetch all active routes
        const { routes } = await getActiveRoutes()
        
        if (!routes || routes.length === 0) {
          setMyRoute(null)
          return
        }

        // 2. Fetch tasks assigned to this crew member
        // fetchCleanupTasks(true) passes assignedToMe = true
        const assignedTasks = await fetchCleanupTasks(true)
        setTasks(assignedTasks)

        // 3. Find which route belongs to the user
        let userRoute = null
        if (assignedTasks.length > 0) {
          const crewRouteId = assignedTasks.find(t => t.crew_route_id)?.crew_route_id
          if (crewRouteId) {
            userRoute = routes.find(r => r.id === crewRouteId)
          }
        }
        
        // If we still can't find it (maybe no tasks), try finding a route assigned to their crew_id if known
        // We'll just assume they don't have a route if we can't link it via tasks.
        setMyRoute(userRoute)
      } catch (err) {
        console.error('Failed to load route details:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Prepare map data
  let mapCenterLat = 14.561433;
  let mapCenterLng = 121.075636;
  
  if (myRoute?.start_depot && typeof myRoute.start_depot === 'string' && myRoute.start_depot.startsWith('POINT')) {
    const match = myRoute.start_depot.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (match) {
      mapCenterLng = parseFloat(match[1]);
      mapCenterLat = parseFloat(match[2]);
    }
  }

  const routeLayerData = useMemo(() => {
    if (!myRoute) return []
    return [{
      id: myRoute.id,
      crewName: myRoute.field_crews?.name || 'My Crew',
      color: '#ccff00', // Our signature neon green for the active route!
      waypoints: myRoute.waypoints || [],
      totalDistance: myRoute.total_distance_meters,
      totalDuration: myRoute.total_duration_min
    }]
  }, [myRoute])

  const formatDistance = (meters) => {
    if (!meters) return '—'
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
  }

  const formatDuration = (minutes) => {
    if (!minutes) return '—'
    const h = Math.floor(minutes / 60)
    const m = Math.round(minutes % 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  // Filter task waypoints
  const taskWaypoints = myRoute?.waypoints?.filter(wp => wp.waypoint_type === 'task') || []

  return (
    <FieldCrewGuard>
      <div className="flex flex-col h-screen max-h-screen">
        <div className="p-6 pb-2 shrink-0">
          <PageHeader
            title="My Route"
            subtitle="Follow the optimal sequence. Map paths are aligned with live TomTom traffic."
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard/field-crew' },
              { label: 'My Route' }
            ]}
          />
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-6 p-6 pt-2">
          {/* Timeline / Sequence Panel */}
          <div className="w-full md:w-1/3 max-w-sm flex flex-col gap-4 overflow-y-auto pr-2 scrollbar-hide">
            {loading ? (
              <div className="card animate-pulse space-y-4">
                <div className="h-6 bg-border w-1/2 mb-4"></div>
                <div className="h-20 bg-border"></div>
                <div className="h-20 bg-border"></div>
                <div className="h-20 bg-border"></div>
              </div>
            ) : !myRoute ? (
              <div className="card bg-surface-elevated flex flex-col items-center justify-center p-8 h-full border-2 border-border text-center">
                <div className="text-4xl mb-4">📭</div>
                <h3 className="font-bold text-text-primary mb-2">No Active Route</h3>
                <p className="text-sm text-text-muted">You do not have an active route assigned for today, or it has not been approved yet.</p>
              </div>
            ) : (
              <>
                <div className="card bg-surface border-2 border-border p-4 sticky top-0 z-10 shadow-sm">
                  <h3 className="font-bold text-lg text-text-primary mb-1">Route Summary</h3>
                  <div className="flex justify-between text-sm font-mono text-text-secondary">
                    <span>Stops: {taskWaypoints.length}</span>
                    <span>ETA: {formatDuration(myRoute.total_duration_min)}</span>
                    <span>Dist: {formatDistance(myRoute.total_distance_meters)}</span>
                  </div>
                </div>

                <div className="space-y-4 relative">
                  {/* Vertical connecting line */}
                  <div className="absolute left-6 top-6 bottom-6 w-1 bg-border z-0"></div>

                  {myRoute.waypoints.map((wp, idx) => {
                    if (wp.waypoint_type === 'depot_start' || wp.waypoint_type === 'depot_end') {
                      return (
                        <div key={idx} className="relative z-10 flex gap-4 opacity-70">
                          <div className="w-12 h-12 rounded-full bg-border border-4 border-surface flex items-center justify-center text-xl shrink-0">
                            🏢
                          </div>
                          <div className="flex-1 flex flex-col justify-center">
                            <h4 className="font-bold text-text-primary">SWMO Depot</h4>
                            <p className="text-xs text-text-muted">{wp.waypoint_type === 'depot_start' ? 'Start shift' : 'End shift'}</p>
                          </div>
                        </div>
                      )
                    }

                    const taskInfo = tasks.find(t => t.id === wp.cleanup_task_id)
                    const isCompleted = taskInfo?.status === 'completed'
                    const inProgress = taskInfo?.status === 'in_progress'

                    return (
                      <div key={idx} className="relative z-10 flex gap-4">
                        <div className={`w-12 h-12 rounded-full border-4 border-surface flex items-center justify-center font-bold text-lg shrink-0 transition-colors ${
                          isCompleted ? 'bg-success text-white' : 
                          inProgress ? 'bg-warning text-black' : 
                          'bg-[#ccff00] text-black'
                        }`}>
                          {isCompleted ? '✓' : wp.sequence_order}
                        </div>
                        
                        <div className={`flex-1 card p-4 border-2 ${
                          isCompleted ? 'border-success/30 bg-success/5' : 
                          inProgress ? 'border-warning/50 bg-warning/5' : 
                          'border-border hover:border-text-muted'
                        }`}>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-text-primary text-sm leading-tight flex-1 mr-2">
                              {taskInfo?.title || `Task #${wp.sequence_order}`}
                            </h4>
                          </div>
                          
                          <div className="flex gap-4 text-xs font-mono text-text-muted mb-3">
                            <span className="flex items-center gap-1">
                              <span className="text-lg">📏</span> {formatDistance(wp.distance_from_previous_meters)}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="text-lg">⏱️</span> {formatDuration(wp.estimated_time_from_previous_min)}
                            </span>
                          </div>

                          {taskInfo?.reports && taskInfo.reports.length > 0 && (
                            <div className="mb-4 mt-2 border-t-2 border-border pt-3">
                              <h5 className="text-xs font-bold font-mono tracking-widest mb-2 text-text-muted">MICRO-ROUTE SEQUENCE</h5>
                              <ul className="space-y-2">
                                {(()=>{
                                  let orderedReports = [...taskInfo.reports];
                                  if (taskInfo.report_sequence && taskInfo.report_sequence.length > 0) {
                                    orderedReports.sort((a, b) => {
                                      let idxA = taskInfo.report_sequence.indexOf(a.id);
                                      let idxB = taskInfo.report_sequence.indexOf(b.id);
                                      if (idxA === -1) idxA = 999;
                                      if (idxB === -1) idxB = 999;
                                      return idxA - idxB;
                                    });
                                  }
                                  return orderedReports.map((r, rIdx) => (
                                    <li key={r.id} className="flex flex-col gap-1 text-xs mb-3">
                                      <div className="flex gap-2 items-start">
                                        <span className={`font-bold font-mono border px-1.5 py-0.5 rounded min-w-[24px] text-center shrink-0 ${
                                          r.validation_status === 'pending' ? 'bg-info text-white border-info' : 'bg-success text-white border-success'
                                        }`}>
                                          {wp.sequence_order}.{rIdx + 1}
                                        </span>
                                        <span className={r.status === 'resolved' ? 'line-through text-text-muted flex-1' : 'text-text-primary uppercase flex-1 font-bold'}>
                                          {r.issue_type?.replace(/_/g, ' ')}
                                        </span>
                                      </div>
                                      <div className="ml-8 mt-1">
                                        {r.validation_status === 'pending' ? (
                                           <span className="inline-flex items-center gap-1 px-2 py-1 bg-info/10 text-info font-mono font-bold text-[10px] uppercase border border-info/30 rounded-sm">
                                             🔍 Acknowledge & Validate
                                           </span>
                                        ) : (
                                           <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success font-mono font-bold text-[10px] uppercase border border-success/30 rounded-sm">
                                             🧹 Start Cleanup
                                           </span>
                                        )}
                                      </div>
                                    </li>
                                  ))
                                })()}
                              </ul>
                            </div>
                          )}

                          <button 
                            className={`w-full py-2 px-4 rounded font-bold text-sm transition-all ${
                              isCompleted 
                                ? 'bg-surface-elevated text-text-muted border-2 border-border cursor-default'
                                : 'bg-black text-white hover:bg-gray-800'
                            }`}
                            onClick={() => {
                              if (!isCompleted && wp.cleanup_task_id) {
                                router.push(`/dashboard/field-crew/operations/${wp.cleanup_task_id}`)
                              }
                            }}
                          >
                            {isCompleted ? 'COMPLETED' : 
                             inProgress ? 'RESUME TASK' : 
                             taskInfo?.task_type === 'Scouting' ? '🔍 START VALIDATION' : 
                             taskInfo?.task_type === 'Mixed' ? '🔄 START MIXED OPERATION' : 
                             '🧹 START CLEANUP'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Map Panel */}
          <div className="flex-1 card p-0 overflow-hidden border-2 border-border relative">
            <EcoPinMap
              centerLat={mapCenterLat}
              centerLng={mapCenterLng}
              hideFilterPanel={true}
              hidePins={true}
              hideClusters={true}
              showHeatmap={false}
            >
              <RouteLayer routes={routeLayerData} />
              <MicroRouteLayer tasks={tasks} routeWaypoints={myRoute?.waypoints || []} />
            </EcoPinMap>
          </div>
        </div>
      </div>
    </FieldCrewGuard>
  )
}
