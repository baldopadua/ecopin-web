'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import PageHeader from '@/components/layout/PageHeader'
import Notification from '@/components/ui/Notification'
import RouteInfoHeader from '@/components/ui/RouteInfoHeader'
import { SkeletonForm } from '@/components/ui/Skeleton'
import { useTask } from '@/components/context/TaskContext'
import { Sun, CloudRain, CloudLightning, Circle } from 'lucide-react'
import {
  generatePlan,
  commitPlan,
  getOptimizationRuns,
  getOptimizationRunById,
  approveOptimization,
  discardOptimization,
  fetchWorkQueue,
} from '@/lib/api/optimization'

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

const WEATHER_OPTIONS = [
  { value: 'normal', label: 'Normal', icon: <Sun className="w-4 h-4 text-orange-500" /> },
  { value: 'heavy_rain', label: 'Heavy Rain', icon: <CloudRain className="w-4 h-4 text-blue-500" /> },
  { value: 'storm', label: 'Storm', icon: <CloudLightning className="w-4 h-4 text-purple-500" /> },
]

const TRAFFIC_OPTIONS = [
  { value: 'low', label: 'Low', icon: <Circle className="w-4 h-4 text-success fill-success" /> },
  { value: 'moderate', label: 'Moderate', icon: <Circle className="w-4 h-4 text-warning fill-warning" /> },
  { value: 'heavy', label: 'Heavy', icon: <Circle className="w-4 h-4 text-error fill-error" /> },
]

const PRIORITY_STYLES = {
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

const STATUS_STYLES = {
  proposed: 'bg-warning/20 text-warning border-warning/30',
  approved: 'bg-success/20 text-success border-success/30',
  discarded: 'bg-text-muted/20 text-text-muted border-text-muted/30',
  draft: 'bg-info/20 text-info border-info/30',
  failed: 'bg-error/20 text-error border-error/30',
}

const CREW_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B']

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

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export default function OptimizationPage() {
  const { isOptimizing, draftPlan, setDraftPlan, startOptimization, commitOptimization } = useTask()
  const [liveWeather, setLiveWeather] = useState('normal')
  const [trafficCondition, setTrafficCondition] = useState('low')
  const [proposalLoading, setProposalLoading] = useState(false)
  const [currentProposal, setCurrentProposal] = useState(null)
  const [currentProposalRoutes, setCurrentProposalRoutes] = useState([])
  const [previousRuns, setPreviousRuns] = useState([])
  const [runsLoading, setRunsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [notification, setNotification] = useState(null)
  const [expandedRun, setExpandedRun] = useState(null)
  const [viewLoading, setViewLoading] = useState(null)
  const [loadingProgress, setLoadingProgress] = useState({ percent: 0, message: '' })
  const [pendingClusters, setPendingClusters] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const runsPerPage = 10

  const loadPendingClusters = useCallback(async () => {
    try {
      const data = await fetchWorkQueue({ limit: 100 })
      const queue = Array.isArray(data) ? data : (data.queue || [])
      setPendingClusters(queue.length)
    } catch (err) {
      console.error('Failed to load pending clusters', err)
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
  }, [loadPreviousRuns, loadPendingClusters, fetchLiveWeather])

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

    await startOptimization(
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
          handleViewRun(result.optimization_run.id)
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

  const handleViewRun = async (runId) => {
    if (expandedRun === runId) {
      setExpandedRun(null)
      return
    }
    try {
      setViewLoading(runId)
      const fullRun = await getOptimizationRunById(runId)
      setCurrentProposal(fullRun)
      setCurrentProposalRoutes(fullRun.routes || [])
      setExpandedRun(runId)
    } catch (err) {
      setNotification({ message: 'Failed to load run details', type: 'error' })
    } finally {
      setViewLoading(null)
    }
  }

  const weatherLabel = WEATHER_OPTIONS.find(w => w.value === (currentProposal?.weather_condition || liveWeather))?.label || 'Normal'
  const trafficLabel = TRAFFIC_OPTIONS.find(t => t.value === (currentProposal?.traffic_condition || trafficCondition))?.label || 'Low'

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

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Conditions Overview */}
      <div className="card border-2 border-border mb-6">
        <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
          🌍 Real-World Conditions
          <span className="text-xs font-mono font-normal text-text-muted">(Sourced via live APIs)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weather */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
              Weather Condition
              <span className="text-[10px] bg-accent-green text-black px-1.5 py-0.5 font-bold uppercase tracking-wider">Live</span>
            </label>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 text-sm border-2 border-border bg-surface-elevated text-text-primary font-bold">
                <span className="flex items-center justify-center gap-2">
                  {WEATHER_OPTIONS.find(w => w.value === liveWeather)?.icon || '🌤️'} 
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
              <span className="text-[10px] bg-accent-green text-black px-1.5 py-0.5 font-bold uppercase tracking-wider">Live</span>
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
            
            {!isOptimizing && pendingClusters !== null && (
              <div className="text-sm font-medium text-text-secondary border-2 border-border bg-surface-elevated px-4 py-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-green"></span>
                <span className="font-bold text-text-primary">{pendingClusters}</span> clusters awaiting dispatch
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current Proposal Result */}
      {currentProposal && (
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

          {/* Route Map (Phase 12.3) */}
          {currentProposalRoutes.length > 0 && (
            <div className="mb-6">
              <h4 className="font-bold text-text-primary mb-3 flex items-center gap-2">
                🗺️ Route Map
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
                {actionLoading === 'commit' ? 'Routing Tasks...' : '✅ Commit Plan & Generate Routes'}
              </button>

              {actionLoading === 'commit' && (
                <div className="mt-4 p-4 border-2 border-border bg-surface-elevated w-full">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-mono font-bold text-success uppercase">
                      {loadingProgress.message}
                    </span>
                    <span className="text-xs font-mono text-text-muted">{loadingProgress.percent}%</span>
                  </div>
                  <div className="w-full h-2 bg-black/20 dark:bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-success transition-all duration-500 ease-out"
                      style={{ width: `${loadingProgress.percent}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-text-muted mt-2">
                    Estimated time remaining: ~{Math.max(1, Math.round((100 - loadingProgress.percent) / 8))}s
                  </p>
                </div>
              )}
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
                {actionLoading === 'approve' ? 'Approving...' : '✅ Approve Optimization'}
              </button>
              <button
                onClick={() => handleDiscard(currentProposal.id)}
                disabled={actionLoading}
                className="flex-1 px-6 py-3 bg-transparent text-error font-bold border-2 border-error hover:bg-error/10 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'discard' ? 'Discarding...' : '❌ Discard'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Previous Runs */}
      <div className="card border-2 border-border">
        <h3 className="font-bold text-text-primary text-lg mb-4">Previous Runs</h3>

        {runsLoading ? (
          <SkeletonForm fields={3} />
        ) : previousRuns.length === 0 ? (
          <p className="text-text-muted text-sm">No optimization runs yet. Generate your first proposal above.</p>
        ) : (
          <div className="flex flex-col gap-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border text-left">
                  <th className="pb-3 font-mono text-xs uppercase tracking-wider text-text-muted">Date</th>
                  <th className="pb-3 font-mono text-xs uppercase tracking-wider text-text-muted">Status</th>
                  <th className="pb-3 font-mono text-xs uppercase tracking-wider text-text-muted">Tasks</th>
                  <th className="pb-3 font-mono text-xs uppercase tracking-wider text-text-muted">Weather</th>
                  <th className="pb-3 font-mono text-xs uppercase tracking-wider text-text-muted">Traffic</th>
                  <th className="pb-3 font-mono text-xs uppercase tracking-wider text-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {previousRuns.slice((currentPage - 1) * runsPerPage, currentPage * runsPerPage).map(run => (
                  <tr key={run.id} className="border-b border-border/50 hover:bg-surface-elevated transition-colors">
                    <td className="py-3 text-text-primary font-mono text-xs">{formatDate(run.created_at)}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-1 border font-bold font-mono uppercase ${STATUS_STYLES[run.status] || ''}`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="py-3 text-text-primary">{run.num_tasks_optimized}</td>
                    <td className="py-3 text-text-secondary">
                      <span className="flex items-center gap-2">
                        {WEATHER_OPTIONS.find(w => w.value === (run.weather_condition?.toLowerCase() || 'normal'))?.icon || <Sun className="w-4 h-4 text-orange-500" />} 
                        {WEATHER_OPTIONS.find(w => w.value === (run.weather_condition?.toLowerCase() || 'normal'))?.label || 'Normal'}
                      </span>
                    </td>
                    <td className="py-3 text-text-secondary">
                      <span className="flex items-center gap-2">
                        {TRAFFIC_OPTIONS.find(t => t.value === (run.traffic_condition?.toLowerCase() || 'low'))?.icon || <Circle className="w-4 h-4 text-success fill-success" />} 
                        {TRAFFIC_OPTIONS.find(t => t.value === (run.traffic_condition?.toLowerCase() || 'low'))?.label || 'Low'}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleViewRun(run.id)}
                        disabled={viewLoading === run.id}
                        className="text-xs text-accent-green hover:underline font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {viewLoading === run.id && (
                          <svg className="animate-spin h-3 w-3 inline" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        )}
                        {expandedRun === run.id ? 'COLLAPSE' : 'VIEW'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {previousRuns.length > runsPerPage && (
            <div className="flex justify-between items-center mt-4">
              <span className="text-xs text-text-muted font-mono uppercase">
                Showing {(currentPage - 1) * runsPerPage + 1}-{Math.min(currentPage * runsPerPage, previousRuns.length)} of {previousRuns.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-surface-elevated border-2 border-border text-xs font-bold disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(previousRuns.length / runsPerPage), p + 1))}
                  disabled={currentPage >= Math.ceil(previousRuns.length / runsPerPage)}
                  className="px-3 py-1 bg-surface-elevated border-2 border-border text-xs font-bold disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  )
}

function CrewRouteCard({ route, index, color }) {
  const crewName = route.field_crews?.name || `Crew ${index + 1}`
  const waypoints = route.waypoints || []
  const taskWaypoints = waypoints.filter(w => w.waypoint_type === 'task')

  return (
    <div className="border-2 border-border bg-surface-elevated">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-text-primary flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
            {crewName}
            <span className="text-xs text-text-muted font-mono">({route.task_count || taskWaypoints.length} tasks)</span>
          </h4>
          <div className="flex gap-4 text-xs font-mono text-text-muted">
            <span>📏 {formatDistance(route.total_distance_meters)}</span>
            <span>⏱️ {formatDuration(route.total_duration_min)}</span>
          </div>
        </div>

        {taskWaypoints.length > 0 ? (
          <div className="space-y-2">
            {taskWaypoints.map((wp, wpIdx) => (
              <div key={wp.id || wpIdx} className="flex items-center gap-3 text-sm p-2 border border-border/50 hover:bg-black/10 dark:hover:bg-white/5 transition-colors">
                <span
                  className="w-6 h-6 flex items-center justify-center text-xs font-bold text-white rounded-full"
                  style={{ backgroundColor: color }}
                >
                  {wp.sequence_order || wpIdx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-text-primary truncate block">
                    Task #{wp.cleanup_task_id?.slice(0, 8)}...
                  </span>
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

function RouteMapView({ routes }) {
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
