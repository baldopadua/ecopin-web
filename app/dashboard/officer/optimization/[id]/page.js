'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getOptimizationRunById, approveOptimization, discardOptimization } from '@/lib/api/optimization'
import { fetchReportsByIds } from '@/lib/api/reports'
import RouteInfoHeader from '@/components/ui/RouteInfoHeader'
import PageHeader from '@/components/layout/PageHeader'
import styles from './OptimizationRun.module.css'
import { SkeletonLine } from '@/components/ui/Skeleton'
import { formatStatusLabel } from '@/lib/helpers/statusHelpers'
import EvidenceGallery from '@/components/ui/EvidenceGallery'
import DisassembleModal from '@/components/optimization/DisassembleModal'
import Notification from '@/components/ui/Notification'
import { 
  WEATHER_OPTIONS, 
  TRAFFIC_OPTIONS, 
  STATUS_STYLES, 
  CREW_COLORS, 
  formatDistance, 
  formatDuration, 
  CrewRouteCard, 
  RouteMapView,
  TaskTimeWorkloadGraph 
} from '@/components/optimization/RouteComponents'
import { Sun, Circle, Map, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import { reportDiagnostic } from '../../../../../lib/diagnostics.mjs';

export default function OptimizationRunPage() {
  const { id } = useParams()
  const router = useRouter()
  const [run, setRun] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [proposalReports, setProposalReports] = useState([])
  const [notification, setNotification] = useState(null)
  const [isDisassembleModalOpen, setIsDisassembleModalOpen] = useState(false)

  const loadRun = useCallback(async () => {
    try {
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
      reportDiagnostic('error', 'dispatch', 'Failed to load run:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      queueMicrotask(() => {
        void loadRun()
      })
    }
  }, [id, loadRun])

  const handleApprove = async () => {
    setActionLoading('approve')
    try {
      await approveOptimization(id)
      setNotification({ message: 'Dispatched! Routes and tasks published to field crews.', type: 'success' })
      loadRun()
    } catch (err) {
      reportDiagnostic('error', 'dispatch', err)
      setNotification({ message: 'Failed to dispatch optimization', type: 'error' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDiscard = async () => {
    setActionLoading('discard')
    try {
      await discardOptimization(id)
      setNotification({ message: 'Optimization proposal discarded', type: 'info' })
      loadRun()
    } catch (err) {
      reportDiagnostic('error', 'dispatch', err)
      setNotification({ message: 'Failed to discard optimization proposal', type: 'error' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDisassembled = (result) => {
    setNotification({
      message: result?.message || 'Plan disassembled successfully. Backlog restored.',
      type: 'success'
    })
    loadRun()
  }

  const header = <PageHeader
    title="Optimization details"
    subtitle={`Run ID: ${run?.id || id}`}
    breadcrumbs={[
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Optimization', href: '/dashboard/officer/optimization' },
      { label: 'Optimization details' }
    ]}
  />

  if (loading) {
    return (
      <div className={`workspace-page workspace-page--flow ${styles.runPage}`} aria-busy="true">
        {header}
        <p role="status" className="sr-only">Loading optimization details…</p>
        <div className="card border border-border mb-6" aria-hidden="true">
          <div className="flex items-center justify-between mb-4">
            <SkeletonLine className="h-7 w-2/3 max-w-40" /><SkeletonLine className="h-6 w-16 shrink-0" />
          </div>
          <div className="card border-l border-l-[var(--primary)] mb-4">
            <SkeletonLine className="h-6 w-44 max-w-full mb-4" />
            <div className="grid grid-cols-3 gap-4">
              {[0, 1, 2].map(index => <div key={index} className="flex flex-col items-center gap-2">
                <SkeletonLine className="h-7 w-7" /><SkeletonLine className="h-5 w-16 max-w-full" /><SkeletonLine className="h-3 w-12" />
              </div>)}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[0, 1, 2, 3].map(index => <div key={index} className="bg-surface-elevated border border-border p-3">
              <SkeletonLine className="h-3 w-24 max-w-full mb-2" /><SkeletonLine className="h-8 w-16" />
            </div>)}
          </div>
          <div className="space-y-4 mb-6">
            {[0, 1].map(index => <div key={index} className="border border-border rounded-xl p-4">
              <SkeletonLine className="h-5 w-1/3 mb-3" /><SkeletonLine className="h-4 w-2/3 mb-2" /><SkeletonLine className="h-4 w-1/2" />
            </div>)}
          </div>
          <SkeletonLine className="h-5 w-40 mb-3" />
          <SkeletonLine className="h-40 w-full mb-6" />
          <SkeletonLine className="h-5 w-32 mb-3" />
          <SkeletonLine className="h-[400px] w-full" />
        </div>
      </div>
    )
  }

  if (!run) {
    return (
      <div className={`workspace-page workspace-page--flow ${styles.runPage}`}>
        {header}
        <div className="text-center py-20">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">Run not found</h2>
        <button onClick={() => router.push('/dashboard/officer/optimization')} className="px-4 py-2 bg-surface-elevated border border-border">
          Back to Optimization
        </button>
        </div>
      </div>
    )
  }

  const routes = run.routes || []
  const weatherLabel = WEATHER_OPTIONS.find(w => w.value === run.weather_condition?.toLowerCase())?.label || 'Unknown'
  const trafficLabel = TRAFFIC_OPTIONS.find(t => t.value === run.traffic_condition?.toLowerCase())?.label || 'Unknown'
  
  // Histogram data
  const maxDur = Math.max(...routes.map(r => r.total_duration_min || 0), 1)

  return (
    <div className={`workspace-page workspace-page--flow ${styles.runPage}`}>
      {header}

      {notification && (
        <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
      )}

      <div className="card border border-border mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-text-primary">Proposal result</h2>
          <span className={`text-xs px-3 py-1 border font-semibold font-sans normal-case tracking-normal ${STATUS_STYLES[run.status] || STATUS_STYLES.draft}`}>
            {formatStatusLabel(run.status)}
          </span>
        </div>

        {/* Route Info Header */}
        <RouteInfoHeader
          eta={formatDuration((run.total_estimated_duration_min || routes.reduce((sum, r) => sum + (r.total_duration_min || 0), 0)) / Math.max(1, routes.length || run.num_crews || 1))}
          weather={
            <span className="flex items-center justify-center gap-1.5">
              {WEATHER_OPTIONS.find(w => w.value === run.weather_condition?.toLowerCase())?.icon || <Sun className="w-4 h-4 text-warning" />}
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
          <div className="bg-surface-elevated border border-border p-3">
            <p className="text-xs font-sans normal-case tracking-normal text-text-muted">Tasks</p>
            <p className="text-2xl font-semibold text-text-primary">{run.num_tasks_optimized || 0}</p>
          </div>
          <div className="bg-surface-elevated border border-border p-3">
            <p className="text-xs font-sans normal-case tracking-normal text-text-muted">Crews</p>
            <p className="text-2xl font-semibold text-text-primary">{run.num_crews || 0}</p>
          </div>
          <div className="bg-surface-elevated border border-border p-3">
            <p className="text-xs font-sans normal-case tracking-normal text-text-muted">Estimated distance</p>
            <p className="text-2xl font-semibold text-text-primary">
              {formatDistance(routes.reduce((sum, r) => sum + (r.total_distance_meters || 0), 0))}
            </p>
          </div>
          <div className="bg-surface-elevated border border-border p-3">
            <p className="text-xs font-sans normal-case tracking-normal text-text-muted">Average duration per crew</p>
            <p className="text-2xl font-semibold text-text-primary">
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

        {/* Task-Time Workload Graph */}
        {routes.length > 0 && (
          <TaskTimeWorkloadGraph routes={routes} title="Task time workload distribution" />
        )}

        {/* Evidence Gallery */}
        {proposalReports.length > 0 && (
            <div className="mb-6">
              <EvidenceGallery reports={proposalReports} />
            </div>
        )}

        {/* Route map */}
        {routes.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Map className="w-5 h-5" /> Route map
            </h2>
            <div className="border border-border" style={{ height: '400px' }}>
              <RouteMapView routes={routes} travelMode={run?.settings_snapshot?.travel_mode || 'DRIVING'} />
            </div>
          </div>
        )}

        {/* Dispatched & Active Operational Banner */}
        {run.status === 'approved' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-primary/10 border border-primary/30 mt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-semibold text-text-primary text-sm">Dispatched and active in field operations</p>
                <p className="text-xs text-text-muted">Waypoints and cleanup task assignments are published to field crews.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {!run.has_finished_work && <button
                type="button"
                onClick={() => setIsDisassembleModalOpen(true)}
                className="px-4 py-2.5 bg-transparent border border-error text-error font-semibold normal-case tracking-normal text-xs hover:bg-error/10 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Disassemble plan
              </button>}
              <button
                onClick={() => router.push('/dashboard/officer/operations')}
                className="px-5 py-2.5 bg-primary text-white font-semibold normal-case tracking-normal text-xs border border-primary hover:bg-action-hover transition-all shadow-sm cursor-pointer"
              >
                Monitor live operations
              </button>
            </div>
          </div>
        )}

        {/* Discarded state banner */}
        {run.status === 'discarded' && (
          <div className="p-4 bg-surface-elevated border border-border text-text-muted mt-6 text-sm font-sans flex items-center gap-2">
            <XCircle className="w-4 h-4 text-error" /> This optimization run has been disassembled. Assigned cleanup tasks were undone and backlog items have been restored.
          </div>
        )}

        {/* Approve / Disassemble Buttons for uncommitted runs */}
        {run.status === 'proposed' && (
          <div className="flex gap-4 mt-6 pt-4 border-t border-border">
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="flex-1 px-6 py-3 bg-primary text-white font-semibold normal-case tracking-normal border border-primary hover:bg-action-hover transition-all disabled:opacity-50 cursor-pointer"
            >
              {actionLoading === 'approve' ? 'Dispatching...' : <span className="flex items-center justify-center"><CheckCircle2 className="w-5 h-5 mr-2" /> Confirm and dispatch to crews</span>}
            </button>
            <button
              onClick={() => setIsDisassembleModalOpen(true)}
              disabled={actionLoading}
              className="flex-1 px-6 py-3 bg-transparent text-error font-semibold normal-case tracking-normal border border-border border-error hover:bg-error/10 transition-colors disabled:opacity-50 text-xs"
            >
              <span className="flex items-center justify-center"><RotateCcw className="w-4 h-4 mr-2" /> Disassemble plan</span>
            </button>
          </div>
        )}
      </div>

      {/* Plan Disassembly Confirmation Modal */}
      <DisassembleModal
        isOpen={isDisassembleModalOpen}
        targetId={id}
        onClose={() => setIsDisassembleModalOpen(false)}
        onDisassembled={handleDisassembled}
      />
    </div>
  )
}
