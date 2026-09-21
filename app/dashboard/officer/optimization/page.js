'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import PageHeader from '@/components/layout/PageHeader'
import Notification from '@/components/ui/Notification'
import RouteInfoHeader from '@/components/ui/RouteInfoHeader'
import { SkeletonForm } from '@/components/ui/Skeleton'
import {
  runOptimization,
  getOptimizationRuns,
  getOptimizationRunById,
  approveOptimization,
  discardOptimization,
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
  { value: 'normal', label: 'Normal', icon: '☀️' },
  { value: 'heavy_rain', label: 'Heavy Rain', icon: '🌧️' },
  { value: 'storm', label: 'Storm', icon: '⛈️' },
]

const TRAFFIC_OPTIONS = [
  { value: 'low', label: 'Low', icon: '🟢' },
  { value: 'moderate', label: 'Moderate', icon: '🟡' },
  { value: 'heavy', label: 'Heavy', icon: '🔴' },
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
  const [weatherCondition, setWeatherCondition] = useState('normal')
  const [trafficCondition, setTrafficCondition] = useState('low')
  const [proposalLoading, setProposalLoading] = useState(false)
  const [currentProposal, setCurrentProposal] = useState(null)
  const [currentProposalRoutes, setCurrentProposalRoutes] = useState([])
  const [previousRuns, setPreviousRuns] = useState([])
  const [runsLoading, setRunsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [notification, setNotification] = useState(null)
  const [expandedRun, setExpandedRun] = useState(null)
  const [loadingProgress, setLoadingProgress] = useState({ percent: 0, message: '' })

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
  }, [loadPreviousRuns])

  const handleGenerate = async () => {
    try {
      setProposalLoading(true)
      setLoadingProgress({ percent: 10, message: 'Scanning for unresolved clusters...' })
      setCurrentProposal(null)
      setCurrentProposalRoutes([])
      setNotification(null)

      // Simulated loading steps for officer visibility
      const loadingSteps = [
        { percent: 25, message: 'Calculating MCDA priority scores...' },
        { percent: 45, message: 'Mapping hotzones to cleanup tasks...' },
        { percent: 60, message: 'Finding available field crews...' },
        { percent: 80, message: 'Executing greedy assignment algorithm...' },
        { percent: 90, message: 'Generating simulated routes & ETA...' },
      ]
      let stepIndex = 0
      const progressInterval = setInterval(() => {
        if (stepIndex < loadingSteps.length) {
          setLoadingProgress(loadingSteps[stepIndex])
          stepIndex++
        }
      }, 1500)

      const result = await runOptimization({
        weather_condition: weatherCondition,
        traffic_condition: trafficCondition,
      })

      clearInterval(progressInterval)

      if (result.optimization_run) {
        setCurrentProposal(result.optimization_run)

        // Fetch the full run with routes
        const fullRun = await getOptimizationRunById(result.optimization_run.id)
        setCurrentProposal(fullRun)

        // Load waypoints for each route
        if (fullRun.routes && fullRun.routes.length > 0) {
          const routesWithWaypoints = []
          for (const route of fullRun.routes) {
            const routeDetail = await import('@/lib/api/optimization').then(m => m.getRouteById ? m : m)
            // Use the route data from the run response directly
            routesWithWaypoints.push(route)
          }
          setCurrentProposalRoutes(fullRun.routes)
        }

        setLoadingProgress({ percent: 100, message: 'Optimization pipeline completed!' })
        setNotification({ message: 'Optimization proposal generated successfully', type: 'success' })
        await loadPreviousRuns()
      } else {
        setLoadingProgress({ percent: 100, message: 'Done' })
        setNotification({ message: result.message || 'No tasks to optimize', type: 'info' })
      }
    } catch (err) {
      console.error('Optimization error:', err)
      setNotification({ message: err.message || 'Failed to generate optimization', type: 'error' })
    } finally {
      setProposalLoading(false)
    }
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
      const fullRun = await getOptimizationRunById(runId)
      setCurrentProposal(fullRun)
      setCurrentProposalRoutes(fullRun.routes || [])
      setExpandedRun(runId)
    } catch (err) {
      setNotification({ message: 'Failed to load run details', type: 'error' })
    }
  }

  const weatherLabel = WEATHER_OPTIONS.find(w => w.value === (currentProposal?.weather_condition || weatherCondition))?.label || 'Normal'
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

      {/* Simulation Conditions */}
      <div className="card border-2 border-border mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-mono uppercase tracking-widest text-warning bg-warning/15 px-2 py-1 border border-warning/30">
            ⚠️ SIMULATION
          </span>
          <span className="text-xs text-text-muted">Weather and traffic conditions are simulated — not live data</span>
        </div>

        <h3 className="font-bold text-text-primary mb-4">Simulation Conditions</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weather */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Weather Condition
            </label>
            <div className="flex gap-2">
              {WEATHER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setWeatherCondition(opt.value)}
                  className={`flex-1 px-3 py-2 text-sm border-2 transition-colors font-medium ${
                    weatherCondition === opt.value
                      ? 'bg-[#ccff00] text-black border-[#1a1a1a] font-bold'
                      : 'border-border text-text-secondary hover:border-text-muted hover:bg-surface-elevated'
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Traffic */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Traffic Condition
            </label>
            <div className="flex gap-2">
              {TRAFFIC_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTrafficCondition(opt.value)}
                  className={`flex-1 px-3 py-2 text-sm border-2 transition-colors font-medium ${
                    trafficCondition === opt.value
                      ? 'bg-[#ccff00] text-black border-[#1a1a1a] font-bold'
                      : 'border-border text-text-secondary hover:border-text-muted hover:bg-surface-elevated'
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate Button and Progress */}
        <div className="mt-6">
          <button
            onClick={handleGenerate}
            disabled={proposalLoading}
            className="btn-primary px-6 py-3 w-full md:w-auto text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {proposalLoading ? (
              <span className="flex items-center gap-2 justify-center">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </span>
            ) : (
              '🚀 Generate Optimization'
            )}
          </button>

          {proposalLoading && (
            <div className="mt-4 p-4 border-2 border-border bg-surface-elevated max-w-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono font-bold text-accent-green uppercase">
                  {loadingProgress.message}
                </span>
                <span className="text-xs font-mono text-text-muted">{loadingProgress.percent}%</span>
              </div>
              <div className="w-full h-2 bg-black/20 dark:bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#ccff00] transition-all duration-500 ease-out"
                  style={{ width: `${loadingProgress.percent}%` }}
                ></div>
              </div>
              <p className="text-xs text-text-muted mt-2">
                Estimated time remaining: ~{Math.max(1, Math.round((100 - loadingProgress.percent) / 10))}s
              </p>
            </div>
          )}
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
            eta={formatDuration(currentProposal.total_estimated_duration_min || currentProposalRoutes.reduce((sum, r) => sum + (r.total_duration_min || 0), 0))}
            weather={`${WEATHER_OPTIONS.find(w => w.value === currentProposal.weather_condition)?.icon || '☀️'} ${weatherLabel}`}
            traffic={trafficLabel}
            isSimulated={true}
          />

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface-elevated border-2 border-border p-3">
              <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Tasks</p>
              <p className="text-2xl font-black text-text-primary">{currentProposal.num_tasks_optimized || 0}</p>
            </div>
            <div className="bg-surface-elevated border-2 border-border p-3">
              <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Crews</p>
              <p className="text-2xl font-black text-text-primary">{currentProposal.num_crews || 0}</p>
            </div>
            <div className="bg-surface-elevated border-2 border-border p-3">
              <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Est. Distance</p>
              <p className="text-2xl font-black text-text-primary">
                {formatDistance(currentProposalRoutes.reduce((sum, r) => sum + (r.total_distance_meters || 0), 0))}
              </p>
            </div>
            <div className="bg-surface-elevated border-2 border-border p-3">
              <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Est. Duration</p>
              <p className="text-2xl font-black text-text-primary">
                {formatDuration(currentProposalRoutes.reduce((sum, r) => sum + (r.total_duration_min || 0), 0))}
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

          {/* Approve / Discard Buttons */}
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
                {previousRuns.map(run => (
                  <tr key={run.id} className="border-b border-border/50 hover:bg-surface-elevated transition-colors">
                    <td className="py-3 text-text-primary font-mono text-xs">{formatDate(run.created_at)}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-1 border font-bold font-mono uppercase ${STATUS_STYLES[run.status] || ''}`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="py-3 text-text-primary">{run.num_tasks_optimized}</td>
                    <td className="py-3 text-text-secondary">
                      {WEATHER_OPTIONS.find(w => w.value === run.weather_condition)?.icon} {run.weather_condition}
                    </td>
                    <td className="py-3 text-text-secondary">
                      {TRAFFIC_OPTIONS.find(t => t.value === run.traffic_condition)?.icon} {run.traffic_condition}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleViewRun(run.id)}
                        className="text-xs text-accent-green hover:underline font-mono uppercase tracking-wider"
                      >
                        {expandedRun === run.id ? 'COLLAPSE' : 'VIEW'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    <div className="border-2 border-border bg-surface-elevated" style={{ borderLeftColor: color, borderLeftWidth: '4px' }}>
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
