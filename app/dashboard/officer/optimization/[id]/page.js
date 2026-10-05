'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getOptimizationRunById, approveOptimization, discardOptimization } from '@/lib/api/optimization'
import { fetchReportsByIds } from '@/lib/api/reports'
import RouteInfoHeader from '@/components/ui/RouteInfoHeader'
import EvidenceGallery from '@/components/ui/EvidenceGallery'
import { 
  WEATHER_OPTIONS, 
  TRAFFIC_OPTIONS, 
  STATUS_STYLES, 
  CREW_COLORS, 
  formatDistance, 
  formatDuration, 
  CrewRouteCard, 
  RouteMapView 
} from '@/components/optimization/RouteComponents'
import { Sun, Circle, Map, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'

export default function OptimizationRunPage() {
  const { id } = useParams()
  const router = useRouter()
  const [run, setRun] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [proposalReports, setProposalReports] = useState([])
  const [notification, setNotification] = useState(null)

  const loadRun = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getOptimizationRunById(id)
      setRun(data)
      
      // Load related reports if available
      let relatedReportIds = new Set()
      if (data?.routes) {
        data.routes.forEach(route => {
          if (route.waypoints) {
            route.waypoints.forEach(wp => {
              if (wp.cleanup_tasks?.report_ids && Array.isArray(wp.cleanup_tasks.report_ids)) {
                wp.cleanup_tasks.report_ids.forEach(rId => relatedReportIds.add(rId))
              }
            })
          }
        })
      }
      if (relatedReportIds.size > 0) {
        const reportsData = await fetchReportsByIds(Array.from(relatedReportIds))
        setProposalReports(reportsData)
      }
    } catch (error) {
      console.error('Failed to load run:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) loadRun()
  }, [id, loadRun])

  const handleApprove = async () => {
    setActionLoading('approve')
    try {
      await approveOptimization(id)
      setNotification({ message: 'Optimization approved and tasks dispatched!', type: 'success' })
      loadRun()
    } catch (err) {
      console.error(err)
      setNotification({ message: 'Failed to approve optimization', type: 'error' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDiscard = async () => {
    setActionLoading('discard')
    try {
      await discardOptimization(id)
      setNotification({ message: 'Optimization discarded', type: 'info' })
      loadRun()
    } catch (err) {
      console.error(err)
      setNotification({ message: 'Failed to discard optimization', type: 'error' })
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-10 bg-surface-elevated w-1/4 mb-4"></div>
        <div className="h-64 bg-surface-elevated"></div>
      </div>
    )
  }

  if (!run) {
    return (
      <div className="max-w-7xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Run not found</h2>
        <button onClick={() => router.push('/dashboard/officer/optimization')} className="px-4 py-2 bg-surface-elevated border-2 border-border">
          Back to Optimization
        </button>
      </div>
    )
  }

  const routes = run.routes || []
  const weatherLabel = WEATHER_OPTIONS.find(w => w.value === run.weather_condition?.toLowerCase())?.label || 'Unknown'
  const trafficLabel = TRAFFIC_OPTIONS.find(t => t.value === run.traffic_condition?.toLowerCase())?.label || 'Unknown'
  
  // Histogram data
  const maxDur = Math.max(...routes.map(r => r.total_duration_min || 0), 1)

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 md:px-8 py-6">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => router.push('/dashboard/officer/optimization')} className="p-2 border-2 border-border bg-surface-elevated hover:bg-surface text-text-muted hover:text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-text-primary">Optimization Details</h1>
          <p className="text-sm font-mono text-text-muted">Run ID: {run.id}</p>
        </div>
      </div>

      {notification && (
        <div className={`p-4 border-2 font-bold font-mono text-sm ${
          notification.type === 'success' ? 'bg-success/20 text-success border-success' :
          notification.type === 'error' ? 'bg-error/20 text-error border-error' :
          'bg-info/20 text-info border-info'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="card border-2 border-border mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-text-primary text-lg">Proposal Result</h3>
          <span className={`text-xs px-3 py-1 border font-bold font-mono uppercase tracking-wider ${STATUS_STYLES[run.status] || STATUS_STYLES.draft}`}>
            {run.status?.toUpperCase()}
          </span>
        </div>

        {/* Route Info Header */}
        <RouteInfoHeader
          eta={formatDuration((run.total_estimated_duration_min || routes.reduce((sum, r) => sum + (r.total_duration_min || 0), 0)) / Math.max(1, routes.length || run.num_crews || 1))}
          weather={
            <span className="flex items-center justify-center gap-1.5">
              {WEATHER_OPTIONS.find(w => w.value === run.weather_condition?.toLowerCase())?.icon || <Sun className="w-4 h-4 text-orange-500" />} 
              {weatherLabel}
            </span>
          }
          traffic={
            <span className="flex items-center justify-center gap-1.5">
              {TRAFFIC_OPTIONS.find(t => t.value === run.traffic_condition?.toLowerCase())?.icon || <Circle className="w-4 h-4 text-success fill-success" />} 
              {trafficLabel}
            </span>
          }
        />

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface-elevated border-2 border-border p-3">
            <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Tasks</p>
            <p className="text-2xl font-black text-text-primary">{run.num_tasks_optimized || 0}</p>
          </div>
          <div className="bg-surface-elevated border-2 border-border p-3">
            <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Crews</p>
            <p className="text-2xl font-black text-text-primary">{run.num_crews || 0}</p>
          </div>
          <div className="bg-surface-elevated border-2 border-border p-3">
            <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Est. Distance</p>
            <p className="text-2xl font-black text-text-primary">
              {formatDistance(routes.reduce((sum, r) => sum + (r.total_distance_meters || 0), 0))}
            </p>
          </div>
          <div className="bg-surface-elevated border-2 border-border p-3">
            <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Est. Duration (Avg/Crew)</p>
            <p className="text-2xl font-black text-text-primary">
              {formatDuration((run.total_estimated_duration_min || routes.reduce((sum, r) => sum + (r.total_duration_min || 0), 0)) / Math.max(1, routes.length || run.num_crews || 1))}
            </p>
          </div>
        </div>

        {/* Crew Assignments */}
        {routes.length > 0 && (
          <div className="space-y-4 mb-6">
            {routes.map((route, idx) => (
              <CrewRouteCard
                key={route.id}
                route={route}
                index={idx}
                color={CREW_COLORS[idx % CREW_COLORS.length]}
              />
            ))}
          </div>
        )}

        {/* Task-Time Histogram */}
        {routes.length > 0 && (
          <div className="mb-6">
            <h4 className="font-bold text-text-primary mb-3 font-mono uppercase text-sm">Task-Time Workload</h4>
            <div className="flex items-end gap-2 h-40 bg-surface-elevated border-2 border-border p-4">
              {routes.map((r, i) => {
                const dur = r.total_duration_min || (r.task_count * 25) || 1
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group relative">
                    <span className="text-[10px] font-mono text-text-primary font-bold">
                      {formatDuration(dur)}
                    </span>
                    <div 
                      className="w-full transition-all duration-300 relative"
                      style={{ 
                        height: `${Math.max(15, (dur / maxDur) * 100)}%`,
                        backgroundColor: CREW_COLORS[i % CREW_COLORS.length] 
                      }}
                    >
                    </div>
                    <span className="text-[10px] font-mono text-text-muted mt-1 truncate w-full text-center">
                      {r.field_crews?.name?.split(' ')[0] || `C${i+1}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Evidence Gallery */}
        {proposalReports.length > 0 && (
            <div className="mb-6">
              <EvidenceGallery reports={proposalReports} />
            </div>
        )}

        {/* Route Map */}
        {routes.length > 0 && (
          <div className="mb-6">
            <h4 className="font-bold text-text-primary mb-3 flex items-center gap-2">
              <Map className="w-5 h-5" /> Route Map
              <span className="text-xs font-mono text-text-muted">(polylines are straight-line estimates)</span>
            </h4>
            <div className="border-2 border-border" style={{ height: '400px' }}>
              <RouteMapView routes={routes} />
            </div>
          </div>
        )}

        {/* Approve / Discard Buttons */}
        {run.status === 'proposed' && (
          <div className="flex gap-4 mt-6 pt-4 border-t-2 border-border">
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="flex-1 px-6 py-3 bg-success text-white font-bold border-2 border-success hover:bg-success/80 transition-colors disabled:opacity-50"
            >
              {actionLoading === 'approve' ? 'Approving...' : <span className="flex items-center justify-center"><CheckCircle2 className="w-5 h-5 mr-2" /> Approve Optimization</span>}
            </button>
            <button
              onClick={handleDiscard}
              disabled={actionLoading}
              className="flex-1 px-6 py-3 bg-transparent text-error font-bold border-2 border-error hover:bg-error/10 transition-colors disabled:opacity-50"
            >
              {actionLoading === 'discard' ? 'Discarding...' : <span className="flex items-center justify-center"><XCircle className="w-5 h-5 mr-2" /> Discard</span>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
