'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import PageHeader from '@/components/layout/PageHeader'
import Notification from '@/components/ui/Notification'
import Dialog from '@/components/ui/Dialog'
import feedbackStyles from '@/components/optimization/OptimizationFeedback.module.css'
import RouteInfoHeader from '@/components/ui/RouteInfoHeader'
import { SkeletonForm } from '@/components/ui/Skeleton'
import EvidenceGallery from '@/components/ui/EvidenceGallery'
import Pagination from '@/components/ui/Pagination'
import OptimizationSettings, { normalizeCapacitySettings } from '@/components/optimization/OptimizationSettings'
import TemplateSelector from '@/components/ui/TemplateSelector'
import DisassembleModal from '@/components/optimization/DisassembleModal'
import { useTask } from '@/components/context/TaskContext'
import { Sun, CloudRain, CloudLightning, Circle, Globe, Map, Check, CheckCircle2, XCircle, Ruler, Timer, RotateCcw, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { 
  WEATHER_OPTIONS, 
  TRAFFIC_OPTIONS, 
  STATUS_STYLES, 
  CREW_COLORS, 
  formatDistance, 
  formatDuration, 
  formatDate,
  CrewRouteCard, 
  RouteMapView 
} from '@/components/optimization/RouteComponents'
import {
  generatePlan,
  commitPlan,
  getOptimizationRuns,
  fetchWorkQueue,
  getOptimizationTemplates,
  getOptimizationOptions,
  createOptimizationTemplate,
  deleteOptimizationTemplate,
} from '@/lib/api/optimization'
import { reportDiagnostic } from '../../../../lib/diagnostics.mjs';

// Default settings applied when no template is selected
const DEFAULT_SETTINGS = {
  travel_mode: 'DRIVING',
  break_duration_min: 60,
  break_window_start: '12:00',
  break_window_end: '13:30',
  overtime_tolerance_min: 15,
  priority_age_weight: 50,
  included_task_types: [],
  density_focus: false,
  zone_ids: [],
  max_tasks_per_shift: 15,
  capacity_utilization: 1.0,
  shift_capacity_target: 100,
  _templateId: undefined,
}




function formatOperationalReason(reason) {
  switch (reason) {
    case 'insufficient_capacity':
    case 'cap_time':
    case 'shift_exceeded':
      return 'Shift capacity full · queued for next shift';
    case 'cap_volume':
    case 'capacity_volume':
      return 'Vehicle volume full · queued for next shift';
    case 'cap_weight':
    case 'capacity_weight':
      return 'Vehicle weight full · queued for next shift';
    case 'outside_buffer':
      return 'Outside route cluster radius';
    case 'cap_detour':
      return 'Detour limit reached · queued for next shift';
    case 'hazard_review':
      return 'Requires safety/hazard review';
    case 'no_capable_crew':
      return 'No qualified crew available on shift';
    case 'unknown_load':
      return 'Awaiting vehicle assignment · queued for next shift';
    case 'deferred_by_compute_limit':
      return 'Queued in backlog';
    default:
      return 'Retained in backlog for next shift';
  }
}

export default function OptimizationPage() {
  const router = useRouter()
  const { isOptimizing, optimizationProgress, draftPlan, setDraftPlan, startOptimization, commitOptimization } = useTask()
  const [liveWeather, setLiveWeather] = useState('normal')
  const [trafficCondition, setTrafficCondition] = useState('low')
  const [proposalLoading, setProposalLoading] = useState(false)
  const [currentProposal, setCurrentProposal] = useState(null)
  const [currentProposalRoutes, setCurrentProposalRoutes] = useState([])
  const [previousRuns, setPreviousRuns] = useState([])
  const [runsLoading, setRunsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [notification, setNotification] = useState(null)
  const [standardCount, setStandardCount] = useState(0)
  const [outlierCount, setOutlierCount] = useState(0)
  const [selectedTemplate, setSelectedTemplate] = useState('standard')
  const [currentPage, setCurrentPage] = useState(1)
  const [showRequeueConfirm, setShowRequeueConfirm] = useState(false)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [templates, setTemplates] = useState([])
  const [options, setOptions] = useState(null)
  const [dispatchSuccess, setDispatchSuccess] = useState(null)
  const [disassembleTargetId, setDisassembleTargetId] = useState(null)
  const [isDisassembleModalOpen, setIsDisassembleModalOpen] = useState(false)
  const runsPerPage = 10


  const loadPendingClusters = useCallback(async () => {
    try {
      const stdData = await fetchWorkQueue({ limit: 100, target_outliers_only: false })
      const stdQueue = Array.isArray(stdData) ? stdData : (stdData.queue || [])
      setStandardCount(stdQueue.length)

      const swpData = await fetchWorkQueue({ limit: 100, target_outliers_only: true })
      const swpQueue = Array.isArray(swpData) ? swpData : (swpData.queue || [])
      setOutlierCount(swpQueue.length)
    } catch (err) {
      reportDiagnostic('error', 'dispatch', 'Failed to load pending clusters', err)
    }
  }, [])

  const loadTemplates = useCallback(async () => {
    try {
      const data = await getOptimizationTemplates()
      setTemplates(data || [])
      // Auto-select the first default template on first load
      const defaultTpl = (data || []).find(t => t.is_default)
      if (defaultTpl) {
        const normalized = normalizeCapacitySettings(defaultTpl.settings || {})
        setSettings(prev => ({ ...DEFAULT_SETTINGS, ...normalized, _templateId: defaultTpl.id }))
      }
    } catch (err) {
      reportDiagnostic('error', 'dispatch', 'Failed to load templates', err)
    }
  }, [])

  const loadOptions = useCallback(async () => {
    try {
      const data = await getOptimizationOptions()
      setOptions(data)
    } catch (err) {
      reportDiagnostic('warn', 'dispatch', 'Failed to load optimization options from backend, using defaults', err)
    }
  }, [])

  const fetchLiveWeather = useCallback(async () => {
    try {
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=14.561433&longitude=121.075636&current_weather=true')
      const data = await res.json()
      const code = data?.current_weather?.weathercode
      if (code >= 95) setLiveWeather('severe')
      else if (code >= 51) setLiveWeather('rainy')
      else setLiveWeather('normal')
    } catch (err) {
      reportDiagnostic('error', 'dispatch', 'Failed to fetch live weather', err)
    }
  }, [])

  const loadPreviousRuns = useCallback(async () => {
    try {
      const data = await getOptimizationRuns()
      setPreviousRuns(data)
    } catch (err) {
      reportDiagnostic('error', 'dispatch', 'Failed to load runs:', err)
    } finally {
      setRunsLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void loadPreviousRuns()
      void loadPendingClusters()
      void fetchLiveWeather()
      void loadTemplates()
      void loadOptions()
    })
  }, [loadPreviousRuns, loadPendingClusters, fetchLiveWeather, loadTemplates, loadOptions])

  useEffect(() => {
    if (!draftPlan) return
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setCurrentProposal(draftPlan)
        setCurrentProposalRoutes(draftPlan.proposedRoutes || [])
      }
    })
    return () => { cancelled = true }
  }, [draftPlan])

  const handleGenerate = async () => {
    setCurrentProposal(null)
    setCurrentProposalRoutes([])
    setNotification(null)

    const normalized = normalizeCapacitySettings(settings)
    const activeSettings = {
      ...normalized,
      mode: selectedTemplate
    }

    await startOptimization(
      activeSettings,
      (result) => {
        if (result.plan) {
          setCurrentProposal({ ...result.plan, status: 'draft_plan', selectedCount: result.selectedCount, omittedCount: result.omittedLoggedCount })
          setCurrentProposalRoutes(result.proposedRoutes || result.plan.proposedRoutes || []) 
          loadPendingClusters()
          loadPreviousRuns()
        }
      }
    )
  }

  const handleSaveTemplate = async (name) => {
    try {
      const normalized = normalizeCapacitySettings(settings)
      const { travel_mode, break_duration_min, break_window_start, break_window_end,
        overtime_tolerance_min, priority_age_weight, included_task_types,
        density_focus, zone_ids, max_tasks_per_shift, capacity_utilization, shift_capacity_target } = normalized
      await createOptimizationTemplate(name, '', {
        travel_mode, break_duration_min, break_window_start, break_window_end,
        overtime_tolerance_min, priority_age_weight, included_task_types,
        density_focus, zone_ids, max_tasks_per_shift, capacity_utilization, shift_capacity_target,
      })
      await loadTemplates()
      setNotification({ message: `Template "${name}" saved!`, type: 'success' })
    } catch (err) {
      setNotification({ message: err.message || 'Failed to save template', type: 'error' })
    }
  }

  const handleDeleteTemplate = async (id) => {
    try {
      await deleteOptimizationTemplate(id)
      await loadTemplates()
      setNotification({ message: 'Template deleted', type: 'info' })
    } catch (err) {
      setNotification({ message: err.message || 'Failed to delete template', type: 'error' })
    }
  }

  const handleCommitPlan = async (planId) => {
    setActionLoading('commit')
    
    await commitOptimization(
      planId, 
      { weather_condition: liveWeather, traffic_condition: trafficCondition },
      (result) => {
        const isFailed = result.routing_status === 'failed' || result.routing_status === 'needs_replan'
        const isPending = result.routing_status === 'routing'
        const isEmpty = result.routing_status === 'empty' || !result.tasks?.length

        if (isEmpty) {
          setNotification({
            message: 'No tasks were dispatched. Please verify that field crews are available and active on shift.',
            type: 'warning'
          })
        } else if (isFailed) {
          setNotification({
            message: result.warning || 'Could not finalize routes due to shift schedule limits. All reports were safely returned to your backlog.',
            type: 'error'
          })
        } else if (isPending) {
          setNotification({
            message: 'Routes are currently being computed in the background. Please check back shortly.',
            type: 'info'
          })
        } else {
          setNotification({
            message: `Dispatch Confirmed! ${result.tasks?.length || 0} tasks assigned and routes published to field crews.`,
            type: 'success'
          })
          setDispatchSuccess({
            runId: result.run?.id,
            tasksCount: result.tasks?.length || 0,
            crewsCount: result.tasks ? new Set(result.tasks.map(t => t.assigned_field_crew_id)).size : 0,
          })
        }

        if (!isPending && !isEmpty && !isFailed) setDraftPlan(null)
        loadPreviousRuns()
        loadPendingClusters()
        setActionLoading(null)
      },
      (error) => {
        setNotification({ message: error.message || 'Failed to commit plan', type: 'error' })
        setActionLoading(null)
      }
    )
  }

  const handleApprove = async (runId) => {
    try {
      setActionLoading('approve')
      await approveOptimization(runId)
      setCurrentProposal(prev => prev && prev.id === runId ? { ...prev, status: 'approved' } : prev)
      setNotification({ message: 'Optimization approved — crews have been assigned', type: 'success' })
      await loadPreviousRuns()
    } catch (err) {
      setNotification({ message: err.message || 'Failed to approve', type: 'error' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDiscard = async (runId) => {
    try {
      setActionLoading('discard')
      await discardOptimization(runId)
      setCurrentProposal(prev => prev && prev.id === runId ? { ...prev, status: 'discarded' } : prev)
      setNotification({ message: 'Optimization discarded', type: 'info' })
      await loadPreviousRuns()
    } catch (err) {
      setNotification({ message: err.message || 'Failed to discard', type: 'error' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleViewRun = (runId) => {
    router.push('/dashboard/officer/optimization/' + runId)
  }

  const handleOpenDisassemble = (targetId) => {
    setDisassembleTargetId(targetId)
    setIsDisassembleModalOpen(true)
  }

  const handleDisassembled = (result) => {
    setNotification({
      message: result?.message || 'Plan disassembled successfully. Tasks undone and backlog restored.',
      type: 'success'
    })
    if (currentProposal && (currentProposal.id === result?.plan_id || currentProposal.id === result?.run_id)) {
      setCurrentProposal(null)
      setCurrentProposalRoutes([])
      setDraftPlan(null)
    }
    loadPreviousRuns()
    loadPendingClusters()
  }

  const weatherLabel = WEATHER_OPTIONS.find(w => w.value === (currentProposal?.weather_condition || liveWeather))?.label || 'Normal'
  const trafficLabel = TRAFFIC_OPTIONS.find(t => t.value === (currentProposal?.traffic_condition || trafficCondition))?.label || 'Low'

  const pendingProposal = previousRuns.find(r => r.status === 'proposed')
  return (
    <div className="p-8">
      <PageHeader
        title="Optimization"
        titleAccent="Center"
        subtitle="Generate, review, and approve route optimization proposals for field crews"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Officer', href: '/dashboard/officer' },
          { label: 'Optimization' }
        ]}
      />

      {pendingProposal && (
        <div className="mb-6 p-4 border border-border border-warning bg-warning/10 flex items-center justify-between">
          <div>
            <h3 className="text-warning font-semibold normal-case tracking-normal text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
              Pending dispatch proposal
            </h3>
            <p className="text-xs text-text-primary mt-1 font-sans">
              You have an optimization plan generated on {formatDate(pendingProposal.created_at)} awaiting dispatch confirmation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleViewRun(pendingProposal.id)}
              className="px-4 py-2 bg-warning text-black font-semibold normal-case text-xs hover:bg-warning/80 transition-colors"
            >
              Review and dispatch
            </button>
          </div>
        </div>
      )}

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Requeue Confirm Modal */}
      {showRequeueConfirm && (
        <Dialog open={showRequeueConfirm} onClose={() => setShowRequeueConfirm(false)} labelledBy="requeue-title">
          <div className={feedbackStyles.panel}>
            <div className={feedbackStyles.header}>
              <div className={feedbackStyles.heading}><h2 id="requeue-title">Requeue warning</h2></div>
            </div>
            <div className={feedbackStyles.body}><p>
              Pre-assigned tasks will be re-evaluated. Old tasks not completed will be re-dispatched along with new tasks. Do you want to proceed and generate a new optimization?
            </p></div>
            <div className={feedbackStyles.footer}>
              <button type="button" autoFocus onClick={() => setShowRequeueConfirm(false)} className={feedbackStyles.secondary}>
                Cancel
              </button>
              <button 
                onClick={handleGenerate}
                className={feedbackStyles.primary}
              >
                Confirm and requeue
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ── Dispatch settings ───────────────────────── */}
      <div className="card border border-border mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-border gap-2">
          <div>
            <h3 className="font-semibold text-text-primary text-base normal-case tracking-normal flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Dispatch settings
            </h3>
            <p className="text-xs text-text-muted mt-0.5 font-sans">
              Autonomous solver optimizes routes with live weather buffers and TomTom traffic matrix.
            </p>
          </div>

          {/* Autonomous Environmental Context Badge */}
          <div className="flex items-center gap-2 text-xs font-sans bg-surface border border-border px-3 py-1.5">
            <span className="flex items-center gap-1.5 text-text-primary">
              {WEATHER_OPTIONS.find(w => w.value === liveWeather)?.icon || <Sun className="w-3.5 h-3.5 text-warning" />}
              <span className="capitalize">{liveWeather}</span>
              {liveWeather === 'rainy' && <span className="text-xs text-primary font-semibold">(+15% buffer)</span>}
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1.5 text-text-primary">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span>Live traffic</span>
            </span>
          </div>
        </div>

        {/* 1. Target dispatch focus */}
        <div className="mb-5">
          <TemplateSelector
            selectedTemplate={selectedTemplate}
            onTemplateChange={setSelectedTemplate}
            outlierCount={outlierCount}
            standardCount={standardCount}
          />
        </div>

        {/* 2. Fleet Travel Mode & Collapsible Advanced Settings */}
        <div className="mb-6">
          <OptimizationSettings
            settings={settings}
            onChange={setSettings}
            templates={templates}
            options={options}
            onSaveTemplate={handleSaveTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            disabled={isOptimizing}
          />
        </div>

        {/* 3. Action Bar: Generate optimization */}
        <div className="pt-4 border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={isOptimizing}
              className="px-6 py-3 bg-primary text-white border border-primary text-sm font-semibold normal-case tracking-normal hover:bg-action-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {isOptimizing ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Calculating Routes...
                </span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Generate Route Proposal
                </>
              )}
            </button>

            {!isOptimizing && (
              <span className="text-xs font-sans text-text-muted">
                <span className="font-semibold text-text-primary">
                  {selectedTemplate === 'sweeper' ? outlierCount : selectedTemplate === 'mixed' ? `${standardCount + outlierCount}` : standardCount}
                </span>{' '}
                {selectedTemplate === 'sweeper' ? 'reports' : selectedTemplate === 'mixed' ? 'clusters & reports' : 'clusters'} available for dispatch
              </span>
            )}
          </div>
        </div>

        {isOptimizing && (
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex justify-between text-xs font-semibold text-text-primary mb-1.5 font-sans normal-case tracking-normal">
              <span>{optimizationProgress.message || 'Solving...'}</span>
              <span>{optimizationProgress.percent || 0}%</span>
            </div>
            <div className="w-full bg-surface h-2.5 border border-border overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300" 
                style={{ width: `${optimizationProgress.percent || 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Post-Dispatch Confirmation Card */}
      {dispatchSuccess && (
        <div className="card p-6 bg-primary/10 border-2 border-primary mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-text-primary text-base normal-case tracking-normal">
                Dispatch confirmed — field crews active
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                {dispatchSuccess.tasksCount} cleanup tasks dispatched across {dispatchSuccess.crewsCount} crews. Routes and waypoints are now active on crew devices.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => router.push('/dashboard/officer/operations')}
              className="flex-1 md:flex-initial px-5 py-2.5 bg-primary text-white font-semibold normal-case tracking-normal text-xs border border-primary hover:bg-action-hover transition-all shadow-sm"
            >
              Monitor live operations
            </button>
            {dispatchSuccess.runId && (
              <button
                onClick={() => router.push('/dashboard/officer/optimization/' + dispatchSuccess.runId)}
                className="flex-1 md:flex-initial px-4 py-2.5 bg-surface border border-border text-text-primary font-semibold normal-case tracking-normal text-xs hover:border-primary transition-colors"
              >
                View route details
              </button>
            )}
            <button
              onClick={() => { setDispatchSuccess(null); setCurrentProposal(null); }}
              className="px-3 py-2 text-text-muted hover:text-text-primary text-xs font-sans"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Current Proposal result */}
      {currentProposal && currentProposal.status === 'draft_plan' && (
        <div className="card border border-border mb-6">
          {/* Dispatch Proposal Headline Banner */}
          <div className="p-4 bg-primary/10 border border-primary mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <h4 className="font-semibold text-text-primary text-base normal-case tracking-normal">
                  Dispatch proposal ready
                </h4>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                <span className="font-semibold text-primary">{currentProposal.num_tasks_optimized || currentProposal.selectedCount || 0} tasks</span> scheduled across <span className="font-semibold text-text-primary">{currentProposal.plannedCrewCount || 0} crews</span>.
                {(currentProposal.omittedCount > 0) && (
                  <span className="text-text-muted"> · {currentProposal.omittedCount} remaining tasks kept in Backlog queue for subsequent shift.</span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleCommitPlan(currentProposal.id)}
                disabled={Boolean(actionLoading) || !currentProposal.selectedCount}
                className="px-5 py-2.5 bg-primary text-white font-semibold normal-case tracking-normal text-xs border border-primary hover:bg-action-hover transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer"
              >
                {actionLoading === 'commit' ? (
                  'Publishing Routes...'
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-0.5" /> Confirm and dispatch crews
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary text-lg">Proposal metrics and routes</h3>
            <span className={`text-xs px-3 py-1 border font-semibold font-sans normal-case tracking-normal ${STATUS_STYLES[currentProposal.status] || STATUS_STYLES.draft}`}>
              {currentProposal.status?.replaceAll('_', ' ')}
            </span>
          </div>

          {/* Route Info Header */}
          <RouteInfoHeader
            eta={currentProposal.status === 'draft_plan' 
              ? formatDuration((currentProposal.capacityUtilized || 0) / Math.max(1, currentProposal.plannedCrewCount || 1))
              : formatDuration((currentProposal.total_estimated_duration_min || currentProposalRoutes.reduce((sum, r) => sum + (r.total_duration_min || 0), 0)) / Math.max(1, currentProposalRoutes.length || currentProposal.num_crews || 1))
            }
            weather={
              <span className="flex items-center justify-center gap-1.5">
                {WEATHER_OPTIONS.find(w => w.value === (currentProposal.weather_condition?.toLowerCase() || liveWeather))?.icon || <Sun className="w-4 h-4 text-warning" />}
                {weatherLabel}
              </span>
            }
            traffic={
              <span className="flex items-center justify-center gap-1.5">
                {TRAFFIC_OPTIONS.find(t => t.value === (currentProposal.traffic_condition?.toLowerCase() || trafficCondition))?.icon || <Circle className="w-4 h-4 text-success fill-success" />} 
                {trafficLabel}
              </span>
            }
          />

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface-elevated border border-border p-3">
              <p className="text-xs font-sans normal-case tracking-normal text-text-muted">Tasks</p>
              <p className="text-2xl font-semibold text-text-primary">{currentProposal.num_tasks_optimized || currentProposal.selectedCount || 0}</p>
            </div>
            <div className="bg-surface-elevated border border-border p-3">
              <p className="text-xs font-sans normal-case tracking-normal text-text-muted">Crews</p>
              <p className="text-2xl font-semibold text-text-primary">{currentProposal.plannedCrewCount || 0}</p>
            </div>
            <div className="bg-surface-elevated border border-border p-3">
              <p className="text-xs font-sans normal-case tracking-normal text-text-muted">Estimated distance</p>
              <p className="text-2xl font-semibold text-text-primary">
                {currentProposal.status === 'draft_plan'
                  ? currentProposal.proposedRoutes?.length
                    ? formatDistance(currentProposal.proposedRoutes.reduce((sum, r) => sum + r.distanceMeters, 0))
                    : 'TBD'
                  : formatDistance(currentProposalRoutes.reduce((sum, r) => sum + (r.total_distance_meters || 0), 0))}
              </p>
            </div>
            <div className="bg-surface-elevated border border-border p-3">
              <p className="text-xs font-sans normal-case tracking-normal text-text-muted">Average duration per crew</p>
              <p className="text-2xl font-semibold text-text-primary">
                {currentProposal.status === 'draft_plan' 
                  ? formatDuration((currentProposal.capacityUtilized || 0) / Math.max(1, currentProposal.plannedCrewCount || 1))
                  : formatDuration((currentProposalRoutes.reduce((sum, r) => sum + (r.total_duration_min || 0), 0)) / Math.max(1, currentProposalRoutes.length || currentProposal.num_crews || 1))
                }
              </p>
            </div>
          </div>

          {/* Crew Assignments */}
          {currentProposalRoutes.length > 0 && (
            <div className="space-y-4 mb-6">
              {currentProposalRoutes.map((route, idx) => (
                <CrewRouteCard
                  key={route.id || route.crewId || route.vehicle_id || `route-${idx}`}
                  route={route}
                  index={idx}
                  color={CREW_COLORS[idx % CREW_COLORS.length]}
                />
              ))}
            </div>
          )}

          {/* Task-Time Histogram */}
          {currentProposalRoutes.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Timer className="w-5 h-5" /> Task-Time Histogram
                <span className="text-xs font-sans text-text-muted">(Est. workload distribution)</span>
              </h4>
              <div className="bg-surface-elevated border border-border p-4 h-48 flex items-end gap-2">
                {currentProposalRoutes.map((r, i) => {
                  const getDur = (route) => route.total_duration_min || (route.task_count * 25) || (route.waypoints?.length * 15) || 0;
                  const maxDur = Math.max(...currentProposalRoutes.map(route => getDur(route) || 1));
                  const dur = getDur(r);
                  const heightPct = Math.max(8, (dur / maxDur) * 100);
                  const color = CREW_COLORS[i % CREW_COLORS.length];
                  return (
                    <div key={r.id || r.crewId || r.vehicle_id || `histogram-${i}`} className="flex-1 flex flex-col items-center gap-2 group pt-6">
                      <div className="w-full bg-black/10 dark:bg-surface/5 relative h-full flex items-end rounded-t-sm">
                        <div 
                          className="w-full transition-all duration-500 hover:brightness-110 relative rounded-t-sm"
                          style={{ height: `${heightPct}%`, backgroundColor: color }}
                        >
                           <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-surface text-text-primary border border-border text-xs px-1.5 py-0.5 rounded whitespace-nowrap font-sans shadow-sm">
                             {formatDuration(dur)}
                           </div>
                        </div>
                      </div>
                      <span className="text-xs font-sans text-text-muted truncate max-w-full px-1">{r.field_crews?.name || `Crew ${i+1}`}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}


          {/* Route map (Phase 12.3) */}
          {currentProposalRoutes.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Map className="w-5 h-5" /> Route map
              </h4>
              <div className="border border-border" style={{ height: '400px' }}>
                <RouteMapView routes={currentProposalRoutes} travelMode={settings.travel_mode || 'DRIVING'} />
              </div>
            </div>
          )}

          {/* Commit Plan Button for draft plans */}
          {currentProposal.status === 'draft_plan' && (
            <div className="mt-6 pt-4 border-t border-border">
              {currentProposal.capacity && (
                <div className="mb-6 bg-surface-elevated border border-border p-4" aria-label="Planning capacity">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-text-primary normal-case tracking-normal">Fleet Shift Workload</span>
                    <span className="font-sans text-primary font-semibold">
                      {Math.min(100, Math.round(100 * (currentProposal.capacity.used || currentProposal.capacity.generalist?.used || 0) / Math.max(1, currentProposal.capacity.totalMinutes || currentProposal.capacity.generalist?.minutes || 1)))}% Capacity Utilized
                    </span>
                  </div>
                  <div className="h-2.5 border border-border bg-surface overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.round(100 * (currentProposal.capacity.used || currentProposal.capacity.generalist?.used || 0) / Math.max(1, currentProposal.capacity.totalMinutes || currentProposal.capacity.generalist?.minutes || 1)))}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-muted mt-2 font-sans">
                    {currentProposal.capacity.used || currentProposal.capacity.generalist?.used || 0} min scheduled across {currentProposal.plannedCrewCount || 1} available crews (out of {currentProposal.capacity.totalMinutes || currentProposal.capacity.generalist?.minutes || 0} total shift min)
                    {currentProposal.capacity.generalist?.reserved > 0 && ` · includes ${currentProposal.capacity.generalist.reserved} min reserved for local satellite pickups`}
                  </p>
                </div>
              )}
              {currentProposal.groups?.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 flex items-center justify-between text-text-primary">
                    <span>Scheduled Dispatch Groups</span>
                    <span className="text-xs font-sans text-text-muted">
                      {currentProposal.groups.filter(g => g.anchor?.is_selected).length} groups scheduled
                    </span>
                  </h4>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {currentProposal.groups.filter(g => g.anchor?.is_selected).map(group => (
                      <div key={group.group_key} className="border border-border p-3.5 bg-surface-elevated">
                        <div className="flex justify-between items-center gap-2 text-sm font-semibold">
                          <span className="flex items-center gap-2 text-text-primary">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            {group.anchor?.item_type === 'cluster' ? 'Cluster Cleanup' : 'Sweeper Pickup'} · {group.group_key}
                          </span>
                          <span className="text-xs font-sans text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 font-semibold normal-case">
                            Scheduled
                          </span>
                        </div>
                        {group.satellites?.filter(s => s.is_selected)?.length > 0 && (
                          <div className="ml-4 mt-2.5 pt-2 border-t border-border/40">
                            <p className="text-xs font-sans text-text-muted mb-1 normal-case tracking-normal">Bundled Stops:</p>
                            <ul className="space-y-1 text-xs text-text-secondary">
                              {group.satellites.filter(s => s.is_selected).map(satellite => (
                                <li key={satellite.id} className="flex items-center justify-between font-sans">
                                  <span>Report {satellite.report_id}</span>
                                  <span className="text-text-primary font-semibold">Stop #{satellite.bundle_order}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clean Backlog Queue for Deferred Items */}
              {((currentProposal.omittedCount > 0) || (currentProposal.rejectedBundles?.length > 0)) && (
                <details className="mb-6 border border-border bg-surface-elevated p-3 group">
                  <summary className="text-xs font-semibold normal-case tracking-normal text-text-muted cursor-pointer hover:text-text-primary flex items-center justify-between">
                    <span>Remaining Backlog Queue ({currentProposal.omittedCount || currentProposal.rejectedBundles?.length || 0} tasks queued for next shift)</span>
                    <span className="text-xs font-sans text-text-muted">Inspect details</span>
                  </summary>
                  <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto text-xs font-sans text-text-secondary pt-2 border-t border-border">
                    {currentProposal.groups?.filter(g => !g.anchor?.is_selected).map(group => (
                      <div key={group.group_key} className="flex justify-between py-1 border-b border-border/30">
                        <span>{group.group_key}</span>
                        <span className="text-text-muted">{formatOperationalReason(group.anchor?.reason)}</span>
                      </div>
                    ))}
                    {currentProposal.rejectedBundles?.map((entry, index) => (
                      <div key={`${entry.report_id || entry.group_key}-${index}`} className="flex justify-between py-1 border-b border-border/30">
                        <span>Report {entry.report_id || entry.group_key}</span>
                        <span className="text-text-muted">{formatOperationalReason(entry.reason)}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              <div className="p-4 bg-surface-elevated border border-border mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-text-primary text-base flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                    Ready for Crew Dispatch
                  </h4>
                  <p className="text-xs text-text-muted mt-1">
                    Route sequences, travel times, and vehicle capacity have been automatically determined.
                  </p>
                </div>
                <div className="flex gap-3 text-xs font-sans">
                  <div className="px-3 py-1.5 bg-surface border border-border">
                    <span className="text-text-muted">Scheduled: </span>
                    <span className="font-semibold text-primary">{currentProposal.selectedCount}</span>
                  </div>
                  <div className="px-3 py-1.5 bg-surface border border-border">
                    <span className="text-text-muted">In Backlog: </span>
                    <span className="font-semibold text-text-primary">{currentProposal.omittedCount}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleCommitPlan(currentProposal.id)}
                  disabled={Boolean(actionLoading) || !currentProposal.selectedCount}
                  className="w-full px-6 py-3.5 bg-primary text-white font-semibold normal-case tracking-normal border border-primary hover:bg-action-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm text-sm cursor-pointer"
                >
                  {actionLoading === 'commit' ? (
                    'Publishing Routes & Dispatching Crews...'
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-1" /> Confirm and dispatch to field crews
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Approve Button for generated optimization runs */}
          {currentProposal.status === 'proposed' && (
            <div className="flex gap-4 mt-6 pt-4 border-t border-border">
              <button
                onClick={() => handleApprove(currentProposal.id)}
                disabled={actionLoading}
                className="w-full px-6 py-3.5 bg-primary text-white font-semibold normal-case tracking-normal border border-primary hover:bg-action-hover transition-all disabled:opacity-50 text-sm cursor-pointer"
              >
                {actionLoading === 'approve' ? 'Publishing & Dispatching...' : <span className="flex items-center justify-center"><CheckCircle2 className="w-5 h-5 mr-2" /> Confirm and dispatch to field crews</span>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Previous runs */}
      <div className="flex flex-col gap-4">
        <h3 className="font-semibold text-text-primary text-lg normal-case tracking-normal">Previous runs</h3>

        {runsLoading ? (
          <SkeletonForm fields={3} />
        ) : previousRuns.length === 0 ? (
          <p className="text-text-muted text-sm font-sans">No optimization runs yet. Generate your first proposal above.</p>
        ) : (
          <div className="flex flex-col gap-4">
          <div className="ecopin-table-container" role="region" aria-label="Previous optimization runs" tabIndex={0}>
            <table className="ecopin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Tasks</th>
                  <th>Weather</th>
                  <th>Traffic</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {previousRuns.slice((currentPage - 1) * runsPerPage, currentPage * runsPerPage).map(run => (
                  <tr 
                    key={run.id}
                    onClick={() => handleViewRun(run.id)}
                    className="cursor-pointer hover:bg-surface-elevated transition-colors"
                  >
                    <td>{formatDate(run.created_at)}</td>
                    <td>
                      <span className={`text-xs px-2 py-1 border font-semibold font-sans normal-case ${STATUS_STYLES[run.status] || ''}`}>
                        {run.status}
                      </span>
                    </td>
                    <td>{run.num_tasks_optimized}</td>
                    <td>
                      <span className="flex items-center gap-2">
                        {WEATHER_OPTIONS.find(w => w.value === (run.weather_condition?.toLowerCase() || 'normal'))?.icon || <Sun className="w-4 h-4 text-warning" />}
                        {WEATHER_OPTIONS.find(w => w.value === (run.weather_condition?.toLowerCase() || 'normal'))?.label || 'Normal'}
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-2">
                        {TRAFFIC_OPTIONS.find(t => t.value === (run.traffic_condition?.toLowerCase() || 'low'))?.icon || <Circle className="w-4 h-4 text-success fill-success" />} 
                        {TRAFFIC_OPTIONS.find(t => t.value === (run.traffic_condition?.toLowerCase() || 'low'))?.label || 'Low'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewRun(run.id);
                          }}
                          className="text-xs font-semibold underline normal-case tracking-normal flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
                        >
                          View
                        </button>
                        {run.status !== 'discarded' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDisassemble(run.id);
                            }}
                            className="text-xs font-semibold text-error normal-case tracking-normal flex items-center gap-1 cursor-pointer hover:underline transition-colors"
                            title="Disassemble plan and restore backlog"
                          >
                            <RotateCcw className="w-3 h-3" /> Disassemble
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {previousRuns.length > runsPerPage && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(previousRuns.length / runsPerPage)}
                onPageChange={setCurrentPage}
                itemsPerPage={runsPerPage}
                totalItems={previousRuns.length}
              />
            </div>
          )}
          </div>
        )}
      </div>

      {/* Plan Disassembly Confirmation Modal */}
      <DisassembleModal
        isOpen={isDisassembleModalOpen}
        targetId={disassembleTargetId}
        onClose={() => setIsDisassembleModalOpen(false)}
        onDisassembled={handleDisassembled}
      />
    </div>
  )
}

