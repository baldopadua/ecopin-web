'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import PageHeader from '@/components/layout/PageHeader'
import Notification from '@/components/ui/Notification'
import RouteInfoHeader from '@/components/ui/RouteInfoHeader'
import { SkeletonForm } from '@/components/ui/Skeleton'
import EvidenceGallery from '@/components/ui/EvidenceGallery'
import Pagination from '@/components/ui/Pagination'
import OptimizationSettings from '@/components/optimization/OptimizationSettings'
import TemplateSelector from '@/components/ui/TemplateSelector'
import { useTask } from '@/components/context/TaskContext'
import { Sun, CloudRain, CloudLightning, Circle, Globe, Map, Check, CheckCircle2, XCircle, Ruler, Timer } from 'lucide-react'
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
  createOptimizationTemplate,
  deleteOptimizationTemplate,
} from '@/lib/api/optimization'

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
  _templateId: undefined,
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
      console.error('Failed to load pending clusters', err)
    }
  }, [])

  const loadTemplates = useCallback(async () => {
    try {
      const data = await getOptimizationTemplates()
      setTemplates(data || [])
      // Auto-select the first default template on first load
      const defaultTpl = (data || []).find(t => t.is_default)
      if (defaultTpl) {
        setSettings(prev => ({ ...DEFAULT_SETTINGS, ...defaultTpl.settings, _templateId: defaultTpl.id }))
      }
    } catch (err) {
      console.error('Failed to load templates', err)
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
      console.error('Failed to fetch live weather', err)
    }
  }, [])

  const loadPreviousRuns = useCallback(async () => {
    try {
      setRunsLoading(true)
      const data = await getOptimizationRuns()
      setPreviousRuns(data)
    } catch (err) {
      console.error('Failed to load runs:', err)
    } finally {
      setRunsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPreviousRuns()
    loadPendingClusters()
    fetchLiveWeather()
    loadTemplates()
  }, [loadPreviousRuns, loadPendingClusters, fetchLiveWeather, loadTemplates])

  useEffect(() => {
    if (draftPlan) {
      setCurrentProposal(draftPlan)
      setCurrentProposalRoutes([])
    }
  }, [draftPlan])

  const handleGenerate = async () => {
    setCurrentProposal(null)
    setCurrentProposalRoutes([])
    setNotification(null)

    const activeSettings = {
      ...settings,
      target_outliers_only: selectedTemplate === 'sweeper'
    }

    await startOptimization(
      activeSettings,
      (result) => {
        if (result.plan) {
          setCurrentProposal({ ...result.plan, status: 'draft_plan', selectedCount: result.selectedCount, omittedCount: result.omittedLoggedCount })
          setCurrentProposalRoutes([]) 
          loadPendingClusters()
          loadPreviousRuns()
        }
      }
    )
  }

  const handleSaveTemplate = async (name) => {
    try {
      const { travel_mode, break_duration_min, break_window_start, break_window_end,
        overtime_tolerance_min, priority_age_weight, included_task_types,
        density_focus, zone_ids, max_tasks_per_shift } = settings
      await createOptimizationTemplate(name, '', {
        travel_mode, break_duration_min, break_window_start, break_window_end,
        overtime_tolerance_min, priority_age_weight, included_task_types,
        density_focus, zone_ids, max_tasks_per_shift,
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
        setNotification({ message: 'Routes finalized successfully!', type: 'success' })
        setDraftPlan(null) // Clear draft on successful commit
        loadPreviousRuns()
        if (result.optimization_run && result.optimization_run.id) {
          router.push('/dashboard/officer/optimization/' + result.optimization_run.id)
        }
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
        <div className="mb-6 p-4 border-2 border-warning bg-warning/10 flex items-center justify-between">
          <div>
            <h3 className="text-warning font-bold uppercase tracking-wider text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
              Action Required: Pending Proposal
            </h3>
            <p className="text-xs text-text-primary mt-1 font-mono">
              You have an optimization plan generated on {formatDate(pendingProposal.created_at)} waiting for approval.
            </p>
          </div>
          <button
            onClick={() => handleViewRun(pendingProposal.id)}
            className="px-4 py-2 bg-warning text-black font-bold uppercase text-xs hover:bg-warning/80 transition-colors"
          >
            Review & Approve
          </button>
        </div>
      )}


      {pendingProposal && (
        <div className="mb-6 p-4 border-2 border-warning bg-warning/10 flex items-center justify-between">
          <div>
            <h3 className="text-warning font-bold uppercase tracking-wider text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
              Action Required: Pending Proposal
            </h3>
            <p className="text-xs text-text-primary mt-1 font-mono">
              You have an optimization plan generated on {formatDate(pendingProposal.created_at)} waiting for approval.
            </p>
          </div>
          <button
            onClick={() => handleViewRun(pendingProposal.id)}
            className="px-4 py-2 bg-warning text-black font-bold uppercase text-xs hover:bg-warning/80 transition-colors"
          >
            Review & Approve
          </button>
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
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-surface-elevated border-2 border-warning max-w-lg w-full p-6 shadow-[8px_8px_0px_0px_#F59E0B]">
            <h3 className="text-xl font-black uppercase tracking-tighter text-warning mb-2 flex items-center gap-2">
              <XCircle className="w-6 h-6" /> Re-queuing Warning
            </h3>
            <p className="text-text-primary mb-6">
              Pre-assigned tasks will be re-evaluated. Old tasks not completed will be re-dispatched along with new tasks. Do you want to proceed and generate a new optimization?
            </p>
            <div className="flex gap-4">
              <button 
                onClick={handleGenerate}
                className="btn-primary bg-warning text-black border-warning flex-1 py-3 font-bold uppercase tracking-widest text-xs hover:bg-white transition-colors"
              >
                Confirm & Re-queue
              </button>
              <button 
                onClick={() => setShowRequeueConfirm(false)}
                className="btn-secondary flex-1 py-3 font-bold uppercase tracking-widest text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conditions Overview */}
      <div className="card border-2 border-border mb-6">
        <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5" /> Real-World Conditions
          <span className="text-xs font-mono font-normal text-text-muted">(Sourced via live APIs)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weather */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
              Weather Condition
              <span className="text-[10px] bg-accent-green text-white px-1.5 py-0.5 font-bold uppercase tracking-wider">Live</span>
            </label>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 text-sm border-2 border-border bg-surface-elevated text-text-primary font-bold">
                <span className="flex items-center justify-center gap-2">
                  {WEATHER_OPTIONS.find(w => w.value === liveWeather)?.icon || <Sun className="w-4 h-4 text-orange-500" />} 
                  {WEATHER_OPTIONS.find(w => w.value === liveWeather)?.label || 'Normal'}
                </span>
              </div>
            </div>
            <p className="text-xs text-text-muted mt-2 font-mono">Real-time data via Open-Meteo API</p>
          </div>

          {/* Traffic */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
              Traffic Condition
              <span className="text-[10px] bg-accent-green text-white px-1.5 py-0.5 font-bold uppercase tracking-wider">Live</span>
            </label>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 text-sm border-2 border-border bg-surface-elevated text-text-primary font-bold">
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-success animate-pulse" /> Routing with Live Traffic
                </span>
              </div>
            </div>
            <p className="text-xs text-text-muted mt-2 font-mono">Real-time routing via TomTom API</p>
          </div>
        </div>

        {/* Template Selector */}
        <div className="mt-6 mb-6">
          <TemplateSelector
            selectedTemplate={selectedTemplate}
            onTemplateChange={setSelectedTemplate}
            outlierCount={outlierCount}
            standardCount={standardCount}
          />
        </div>

        {/* Settings Panel */}
        <div className="mt-6">
          <OptimizationSettings
            settings={settings}
            onChange={setSettings}
            templates={templates}
            onSaveTemplate={handleSaveTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            disabled={isOptimizing}
          />
        </div>

        {/* Generate Button and Progress */}
        <div className="mt-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <button
              onClick={handleGenerate}
              disabled={isOptimizing}
              className="btn-primary px-6 py-3 w-full md:w-auto text-base font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-none hover:translate-x-0 hover:translate-y-0 hover:shadow-none"
            >
              {isOptimizing ? (
              <span className="flex items-center gap-2 justify-center">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm.53 5.47a.75.75 0 00-1.06 0l-3 3a.75.75 0 101.06 1.06l1.72-1.72v5.69a.75.75 0 001.5 0v-5.69l1.72 1.72a.75.75 0 101.06-1.06l-3-3z" />
                </svg>
                Generate Optimization
              </>
            )}
            </button>
            
            {!isOptimizing && (
              <div className="text-sm font-medium text-text-secondary border-2 border-border bg-surface-elevated px-4 py-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-green"></span>
                <span className="font-bold text-text-primary">{selectedTemplate === 'sweeper' ? outlierCount : standardCount}</span> clusters awaiting dispatch
              </div>
            )}
          </div>
          
          {isOptimizing && (
            <div className="mt-6">
              <div className="flex justify-between text-sm font-bold text-text-primary mb-2 font-mono uppercase tracking-wider">
                <span>{optimizationProgress.message || 'Processing...'}</span>
                <span>{optimizationProgress.percent || 0}%</span>
              </div>
              <div className="w-full bg-border h-4 border-2 border-border">
                <div 
                  className="bg-[#ccff00] h-full transition-all duration-300 border-r-2 border-border" 
                  style={{ width: `${optimizationProgress.percent || 0}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Current Proposal Result */}
      {currentProposal && currentProposal.status === 'draft_plan' && (
        <div className="card border-2 border-border mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-text-primary text-lg">Proposal Result</h3>
            <span className={`text-xs px-3 py-1 border font-bold font-mono uppercase tracking-wider ${STATUS_STYLES[currentProposal.status] || STATUS_STYLES.draft}`}>
              {currentProposal.status?.toUpperCase()}
            </span>
          </div>

          {/* Route Info Header */}
          <RouteInfoHeader
            eta={currentProposal.status === 'draft_plan' 
              ? formatDuration((currentProposal.capacityUtilized || 0) / Math.max(1, currentProposal.total_crews_available || 1)) 
              : formatDuration((currentProposal.total_estimated_duration_min || currentProposalRoutes.reduce((sum, r) => sum + (r.total_duration_min || 0), 0)) / Math.max(1, currentProposalRoutes.length || currentProposal.num_crews || 1))
            }
            weather={
              <span className="flex items-center justify-center gap-1.5">
                {WEATHER_OPTIONS.find(w => w.value === (currentProposal.weather_condition?.toLowerCase() || liveWeather))?.icon || <Sun className="w-4 h-4 text-orange-500" />} 
                {weatherLabel}
              </span>
            }
            traffic={
              <span className="flex items-center justify-center gap-1.5">
                {TRAFFIC_OPTIONS.find(t => t.value === (currentProposal.traffic_condition?.toLowerCase() || trafficCondition))?.icon || <Circle className="w-4 h-4 text-success fill-success" />} 
                {trafficLabel}
              </span>
            }
            isSimulated={true}
          />

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface-elevated border-2 border-border p-3">
              <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Tasks</p>
              <p className="text-2xl font-black text-text-primary">{currentProposal.num_tasks_optimized || currentProposal.selectedCount || 0}</p>
            </div>
            <div className="bg-surface-elevated border-2 border-border p-3">
              <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Crews</p>
              <p className="text-2xl font-black text-text-primary">{currentProposal.num_crews || currentProposal.total_crews_available || 0}</p>
            </div>
            <div className="bg-surface-elevated border-2 border-border p-3">
              <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Est. Distance</p>
              <p className="text-2xl font-black text-text-primary">
                {currentProposal.status === 'draft_plan' ? 'TBD' : formatDistance(currentProposalRoutes.reduce((sum, r) => sum + (r.total_distance_meters || 0), 0))}
              </p>
            </div>
            <div className="bg-surface-elevated border-2 border-border p-3">
              <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Est. Duration (Avg/Crew)</p>
              <p className="text-2xl font-black text-text-primary">
                {currentProposal.status === 'draft_plan' 
                  ? formatDuration((currentProposal.capacityUtilized || 0) / Math.max(1, currentProposal.total_crews_available || 1)) 
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
                  key={route.id}
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
              <h4 className="font-bold text-text-primary mb-3 flex items-center gap-2">
                <Timer className="w-5 h-5" /> Task-Time Histogram
                <span className="text-xs font-mono text-text-muted">(Est. workload distribution)</span>
              </h4>
              <div className="bg-surface-elevated border-2 border-border p-4 h-48 flex items-end gap-2">
                {currentProposalRoutes.map((r, i) => {
                  const getDur = (route) => route.total_duration_min || (route.task_count * 25) || (route.waypoints?.length * 15) || 0;
                  const maxDur = Math.max(...currentProposalRoutes.map(route => getDur(route) || 1));
                  const dur = getDur(r);
                  const heightPct = Math.max(8, (dur / maxDur) * 100);
                  const color = CREW_COLORS[i % CREW_COLORS.length];
                  return (
                    <div key={r.id} className="flex-1 flex flex-col items-center gap-2 group pt-6">
                      <div className="w-full bg-black/10 dark:bg-white/5 relative h-full flex items-end rounded-t-sm">
                        <div 
                          className="w-full transition-all duration-500 hover:brightness-110 relative rounded-t-sm"
                          style={{ height: `${heightPct}%`, backgroundColor: color }}
                        >
                           <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-surface text-text-primary border border-border text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap font-mono shadow-sm">
                             {formatDuration(dur)}
                           </div>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-text-muted truncate max-w-full px-1">{r.field_crews?.name || `Crew ${i+1}`}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}


          {/* Route Map (Phase 12.3) */}
          {currentProposalRoutes.length > 0 && (
            <div className="mb-6">
              <h4 className="font-bold text-text-primary mb-3 flex items-center gap-2">
                <Map className="w-5 h-5" /> Route Map
                <span className="text-xs font-mono text-text-muted">(polylines are straight-line estimates)</span>
              </h4>
              <div className="border-2 border-border" style={{ height: '400px' }}>
                <RouteMapView routes={currentProposalRoutes} />
              </div>
            </div>
          )}

          {/* Commit Plan Button for draft plans */}
          {currentProposal.status === 'draft_plan' && (
            <div className="mt-6 pt-4 border-t-2 border-border">
              <div className="p-4 bg-info/10 text-info border border-info mb-4">
                <strong>Draft Plan Generated</strong>
                <p className="text-sm">This plan selects exactly the workload your crews can handle today based on their available hours. Routes and tasks will only be generated once committed.</p>
                <ul className="list-disc ml-5 mt-2 text-sm font-mono">
                  <li>Tasks Selected for Dispatch: {currentProposal.selectedCount}</li>
                  <li>Tasks Deferred due to lack of capacity: {currentProposal.omittedCount}</li>
                </ul>
              </div>
              <button
                onClick={() => handleCommitPlan(currentProposal.id)}
                disabled={actionLoading}
                className="w-full px-6 py-3 bg-success text-white font-bold border-2 border-success hover:bg-success/80 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'commit' ? 'Routing Tasks...' : <span className="flex items-center justify-center"><Check className="w-5 h-5 mr-2" /> Commit Plan & Generate Routes</span>}
              </button>
            </div>
          )}

          {/* Approve / Discard Buttons for generated optimization runs */}
          {currentProposal.status === 'proposed' && (
            <div className="flex gap-4 mt-6 pt-4 border-t-2 border-border">
              <button
                onClick={() => handleApprove(currentProposal.id)}
                disabled={actionLoading}
                className="flex-1 px-6 py-3 bg-success text-white font-bold border-2 border-success hover:bg-success/80 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'approve' ? 'Approving...' : <span className="flex items-center justify-center"><CheckCircle2 className="w-5 h-5 mr-2" /> Approve Optimization</span>}
              </button>
              <button
                onClick={() => handleDiscard(currentProposal.id)}
                disabled={actionLoading}
                className="flex-1 px-6 py-3 bg-transparent text-error font-bold border-2 border-error hover:bg-error/10 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'discard' ? 'Discarding...' : <span className="flex items-center justify-center"><XCircle className="w-5 h-5 mr-2" /> Discard</span>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Previous Runs */}
      <div className="flex flex-col gap-4">
        <h3 className="font-bold text-text-primary text-lg uppercase tracking-tighter">Previous Runs</h3>

        {runsLoading ? (
          <SkeletonForm fields={3} />
        ) : previousRuns.length === 0 ? (
          <p className="text-text-muted text-sm font-mono">No optimization runs yet. Generate your first proposal above.</p>
        ) : (
          <div className="flex flex-col gap-4">
          <div className="ecopin-table-container">
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
                  <tr key={run.id}>
                    <td>{formatDate(run.created_at)}</td>
                    <td>
                      <span className={`text-xs px-2 py-1 border font-bold font-mono uppercase ${STATUS_STYLES[run.status] || ''}`}>
                        {run.status}
                      </span>
                    </td>
                    <td>{run.num_tasks_optimized}</td>
                    <td>
                      <span className="flex items-center gap-2">
                        {WEATHER_OPTIONS.find(w => w.value === (run.weather_condition?.toLowerCase() || 'normal'))?.icon || <Sun className="w-4 h-4 text-orange-500" />} 
                        {WEATHER_OPTIONS.find(w => w.value === (run.weather_condition?.toLowerCase() || 'normal'))?.label || 'Normal'}
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-2">
                        {TRAFFIC_OPTIONS.find(t => t.value === (run.traffic_condition?.toLowerCase() || 'low'))?.icon || <Circle className="w-4 h-4 text-success fill-success" />} 
                        {TRAFFIC_OPTIONS.find(t => t.value === (run.traffic_condition?.toLowerCase() || 'low'))?.label || 'Low'}
                      </span>
                    </td>
                    <td>

                      <button
                        onClick={() => handleViewRun(run.id)}
                        className="text-xs font-bold underline uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                      >
                        VIEW
                      </button>
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
    </div>
  )
}

