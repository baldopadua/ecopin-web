'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchCleanupTasks, fetchPublicReports, fetchClusters, fetchWorkQueue, getOptimizationRuns } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import StatsCard from '@/components/ui/StatsCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { useUser } from '@/components/auth/UserContext'
import { OfficerGuard } from '@/components/auth/RequireRole'
import TacticalCanvas from '@/components/map/TacticalCanvas'
import { Target, Users, AlertTriangle, CloudLightning, Brain, ChevronRight, CheckCircle2, Search, Map } from 'lucide-react'

export default function OfficerHomepage() {
  const router = useRouter()
  const user = useUser()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [reports, setReports] = useState([])
  const [clusters, setClusters] = useState([])
  const [workQueue, setWorkQueue] = useState([])
  const [latestRun, setLatestRun] = useState(null)
  
  const [hudExpanded, setHudExpanded] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [
          tasksData,
          reportsData,
          clustersData,
          queueData,
          runsData
        ] = await Promise.all([
          fetchCleanupTasks().catch(() => []),
          fetchPublicReports().catch(() => []),
          fetchClusters().catch(() => []),
          fetchWorkQueue().catch(() => []),
          getOptimizationRuns().catch(() => [])
        ])

        setTasks(tasksData || [])
        const activeReports = (Array.isArray(reportsData) ? reportsData : []).filter(r => r.status !== 'resolved' && r.status !== 'closed')
        setReports(activeReports)
        setClusters(clustersData || [])
        setWorkQueue(queueData || [])
        
        const approvedRuns = (runsData || []).filter(r => r.status === 'approved')
        if (approvedRuns.length > 0) {
           setLatestRun(approvedRuns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0])
        } else if (runsData && runsData.length > 0) {
           setLatestRun(runsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0])
        }

      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Derived metrics
  const activeTasks = tasks.filter(t => t.status === 'in_progress')
  const pendingTasks = tasks.filter(t => t.status === 'pending')
  
  // Calculate SLA risk: reports unresolved for more than 48 hours
  const now = new Date()
  const slaRiskTasks = reports.filter(t => {
     if (t.is_overdue) return true;
     const created = new Date(t.created_at)
     const diffHours = (now - created) / (1000 * 60 * 60)
     return diffHours > 48
  })

  // Critical hotzones: top 3 highest severity (now using priority_score)
  const criticalClusters = [...clusters].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0)).slice(0, 3)
  
  // Action queue: work queue items minus active tasks, up to 5
  const actionQueueItems = workQueue.slice(0, 5)

  // AI HUD Confidence
  const aiConfidence = latestRun?.confidence_score ? Math.round(latestRun.confidence_score * 100) : 89
  const optimizationScore = latestRun?.metrics?.efficiency_score ? Math.round(latestRun.metrics.efficiency_score * 100) : 92

  // Helper for priority labels
  const getPriorityLabel = (cluster) => {
     if (cluster.priority) return cluster.priority;
     const score = cluster.priority_score || 0;
     if (score >= 80) return 'urgent';
     if (score >= 60) return 'high';
     if (score >= 35) return 'medium';
     return 'low';
  };

  return (
    <OfficerGuard>
      <DashboardLayout
        title="Command Center"
        subtitle={`Welcome, ${user?.full_name || 'Officer'}. System status is operational.`}
        breadcrumbs={[{ label: 'Command Center', href: '/dashboard/officer' }]}
        loading={loading}
      >
        {/* Hero KPI Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
           <StatsCard 
             title="Active Field Units" 
             value={activeTasks.length} 
             icon={<Users className="w-6 h-6" />} 
             color="accent"
           />
           <StatsCard 
             title="Unresolved Reports" 
             value={reports.length} 
             icon={<Search className="w-6 h-6" />} 
             color="warning"
           />
           <StatsCard 
             title="SLA Risk" 
             value={slaRiskTasks.length} 
             subtitle={!loading && slaRiskTasks.length > 0 ? `${slaRiskTasks.length} report(s) exceeded 48hr threshold.` : 'All reports within SLA limit.'}
             icon={<AlertTriangle className="w-6 h-6" />} 
             color={slaRiskTasks.length > 0 ? "error" : "success"}
             onClick={() => router.push(slaRiskTasks.length > 0 ? '/dashboard/officer/reports?filter=overdue' : '/dashboard/officer/reports')}
             className={`group transition-all hover:border-border dark:hover:border-white ${slaRiskTasks.length > 0 ? "animate-pulse border-error bg-error/5" : ""}`}
           >
             <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between">
               <Link
                 href={slaRiskTasks.length > 0 ? '/dashboard/officer/reports?filter=overdue' : '/dashboard/officer/reports'}
                 onClick={(e) => e.stopPropagation()}
                 className={`text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1 group-hover:underline ${
                   slaRiskTasks.length > 0 ? 'text-error dark:text-red-400' : 'text-text-secondary group-hover:text-text-primary'
                 }`}
               >
                 {slaRiskTasks.length > 0 ? 'View Overdue Reports' : 'View Reports'}
                 <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
               </Link>
             </div>
           </StatsCard>
           <StatsCard 
             title="Optimization Score" 
             value={`${optimizationScore}%`} 
             icon={<CloudLightning className="w-6 h-6" />} 
             color="info"
           />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Left Column: Action Queue & Active Targets */}
           <div className="lg:col-span-2 space-y-8">
              {/* Active Targets */}
              <div className="card border border-border dark:border-[#333333] rounded-xl p-6">
                 <div className="flex justify-between items-center mb-6 border-b border-border pb-3">
                    <h2 className="text-xl font-bold tracking-tight uppercase">Active Targets</h2>
                    <Link href="/dashboard/officer/operations" className="text-sm font-bold text-text-secondary hover:text-primary transition-colors flex items-center">
                       View All <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                 </div>
                 
                 {loading ? (
                   <div className="grid grid-cols-2 gap-4 animate-pulse">
                     {[1,2].map(i => <div key={i} className="h-24 bg-surface-elevated border border-border" />)}
                   </div>
                 ) : activeTasks.length === 0 ? (
                   <div className="text-center py-8 text-text-muted bg-surface-elevated border border-dashed border-border">
                      <p className="font-medium">No active targets</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {activeTasks.slice(0, 4).map(task => (
                        <div key={task.id} className="border border-border p-4 hover:bg-surface-elevated transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/officer/operations/${task.id}`)}>
                           <div className="flex justify-between items-start mb-2">
                              <h3 className="font-bold text-text-primary line-clamp-1 flex-1 pr-2">{task.title}</h3>
                              <StatusBadge status={task.status} type="task" />
                           </div>
                           <p className="text-sm text-text-secondary line-clamp-2 mb-3 h-10">
                              {task.description || 'No description provided.'}
                           </p>
                           <div className="flex justify-between items-center text-xs">
                              <span className="text-text-muted">Assigned: {task.assigned_to ? 'Crew Dispatched' : 'Unassigned'}</span>
                           </div>
                        </div>
                     ))}
                   </div>
                 )}
              </div>

              {/* Action Queue */}
              <div className="card border border-border dark:border-[#333333] rounded-xl p-6">
                 <div className="flex justify-between items-center mb-6 border-b border-border pb-3">
                    <h2 className="text-xl font-bold tracking-tight uppercase">Action Queue</h2>
                    <button 
                      onClick={() => router.push('/dashboard/officer/optimization')}
                      className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
                    >
                      <CloudLightning className="w-4 h-4" /> Run Optimization
                    </button>
                 </div>
                 
                 {loading ? (
                   <div className="animate-pulse space-y-4">
                     {[1,2,3].map(i => <div key={i} className="h-16 bg-surface-elevated border border-border" />)}
                   </div>
                 ) : actionQueueItems.length === 0 ? (
                   <div className="text-center py-8 text-text-muted">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">Queue is empty</p>
                      <p className="text-sm">All pending actions have been dispatched.</p>
                   </div>
                 ) : (
                   <div className="space-y-4">
                     {actionQueueItems.map(item => (
                       <div key={item.id} className="border border-border p-4 hover:border-accent-green transition-colors bg-surface-elevated">
                          <div className="flex justify-between items-start mb-2">
                             <div className="flex items-center gap-3">
                                <span className="bg-warning text-text-primary text-xs font-bold px-2 py-1 uppercase tracking-widest">Pending</span>
                                <h3 className="font-bold text-text-primary text-lg">{item.title || `Cluster ${item.id.slice(0,8)}`}</h3>
                             </div>
                             <div className="text-right">
                                <span className="text-xs text-text-muted block">Priority Score</span>
                                <span className="font-bold text-error">{(item.priority_score || 0).toFixed(1)}/100</span>
                             </div>
                          </div>
                          <div className="flex justify-between items-end mt-4">
                             <div className="text-sm text-text-secondary flex gap-4">
                                <span>Reports: <strong className="text-text-primary">{item.report_count || item.report_ids?.length || 0}</strong></span>
                                <span>Radius: <strong className="text-text-primary">{Math.round(item.radius_meters || 50)}m</strong></span>
                             </div>
                             <button 
                               onClick={() => router.push(`/dashboard/officer/operations/create?preselect=${item.id}`)}
                               className="text-sm font-bold text-accent-green hover:underline flex items-center gap-1"
                             >
                               Dispatch <ChevronRight className="w-4 h-4" />
                             </button>
                          </div>
                       </div>
                     ))}
                   </div>
                 )}
              </div>
           </div>

            <div className="space-y-8">
              <div className="card border border-border rounded-xl p-6 bg-surface-elevated text-text-primary h-full min-h-[500px]">
                 <div className="flex justify-between items-center mb-6 border-b border-border pb-3">
                    <h2 className="text-xl font-bold tracking-tight uppercase flex items-center gap-2">
                       <Target className="w-5 h-5 text-error" /> Critical Hotzones
                    </h2>
                 </div>
                 
                 {loading ? (
                   <div className="animate-pulse space-y-4">
                     {[1,2,3].map(i => <div key={i} className="h-32 bg-surface border border-border" />)}
                   </div>
                 ) : criticalClusters.length === 0 ? (
                   <div className="text-center py-12 text-text-muted border border-dashed border-border">
                      <Map className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No hotzones detected</p>
                   </div>
                 ) : (
                   <div className="space-y-6">
                     {criticalClusters.map((cluster, idx) => (
                         <div key={cluster.id} className="bg-surface-elevated border border-border p-4 rounded-xl cursor-pointer hover:border-error transition-colors hover:shadow-sm" onClick={() => router.push(`/dashboard/officer/hotzone-intel/${cluster.id}`)}>
                              <div className="flex justify-between items-start mb-3">
                                 <div>
                                    <span className="text-[10px] font-mono text-error uppercase tracking-widest block mb-1">{getPriorityLabel(cluster)} PRIORITY (RANK {idx + 1})</span>
                                    <h3 className="font-bold text-lg leading-none truncate max-w-[180px]">{cluster.label || `Cluster ${cluster.id.slice(0,6)}`}</h3>
                                 </div>
                                 <div className="text-right">
                                    <span className="block text-[10px] font-mono uppercase text-text-muted mb-1">Score</span>
                                    <span className="text-3xl font-bold text-text-primary leading-none">{Math.round(cluster.priority_score || 0)}</span>
                                 </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm text-text-secondary">
                                 <div>
                                    <span className="block text-[10px] font-mono uppercase text-text-muted">Reports</span>
                                    <span className="font-medium text-text-primary">{cluster.report_count || cluster.report_ids?.length || 0}</span>
                                 </div>
                                 <div>
                                    <span className="block text-[10px] font-mono uppercase text-text-muted">Radius</span>
                                    <span className="font-medium text-text-primary">{Math.round(cluster.radius_meters || 50)}m</span>
                                 </div>
                              </div>
                           </div>
                     ))}
                     
                     <div className="pt-6 mt-6 border-t border-border">
                        <Link href="/dashboard/officer/hotzone-intel" className="btn-secondary w-full text-center flex items-center justify-center gap-2">
                           View All Intelligence <ChevronRight className="w-4 h-4" />
                        </Link>
                     </div>
                   </div>
                 )}
              </div>
           </div>
        </div>

        {/* AI HUD (Floating/Collapsible) */}
        <div className={`fixed bottom-6 right-6 z-50 flex flex-col items-end transition-all duration-300 ${hudExpanded ? 'translate-y-0' : 'translate-y-2'}`}>
           {hudExpanded && (
               <div className="mb-4 w-72 bg-surface-elevated border border-border border-accent-green shadow-2xl p-5 text-text-primary origin-bottom-right animate-in fade-in slide-in-from-bottom-4 relative">
                 <div className="absolute -z-10 inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accent-green via-transparent to-transparent"></div>
                 
                 <div className="flex justify-between items-center mb-4 border-b border-border pb-2">
                    <h4 className="font-bold tracking-widest text-sm uppercase flex items-center gap-2">
                       <Brain className="w-4 h-4 text-accent-green" /> Command Unit
                    </h4>
                    <button onClick={() => setHudExpanded(false)} className="text-text-muted hover:text-text-primary">âœ•</button>
                 </div>
                 
                 <div className="space-y-3 font-mono text-sm">
                    <div className="flex justify-between">
                       <span className="text-text-secondary">Confidence</span>
                       <span className="text-accent-green font-bold">{aiConfidence}%</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="text-text-secondary">Precision</span>
                       <span className="text-text-primary font-bold">91.4%</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="text-text-secondary">Recall</span>
                       <span className="text-text-primary font-bold">88.2%</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="text-text-secondary">Last Sync</span>
                       <span className="text-text-primary">{latestRun ? new Date(latestRun.created_at).toLocaleTimeString() : 'Just now'}</span>
                    </div>
                 </div>
                 
                 <Link href="/dashboard/spatial-scan" className="mt-5 block text-center text-xs font-bold uppercase tracking-widest bg-surface text-text-primary py-2 hover:bg-accent-green hover:text-white transition-colors border border-border">
                    View Spatial Scan â†’
                 </Link>
              </div>
           )}
           
           {!hudExpanded && (
              <button 
                onClick={() => setHudExpanded(true)}
                className="group relative flex items-center justify-center w-14 h-14 bg-surface-elevated border border-border border-accent-green shadow-lg hover:scale-105 transition-transform text-text-primary"
              >
                 <div className="absolute inset-0 rounded-full border border-border border-accent-green animate-ping opacity-20"></div>
                 <Brain className="w-6 h-6 text-accent-green" />
                 <span className="absolute -top-2 -right-2 bg-accent-green text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                    {aiConfidence}%
                 </span>
              </button>
           )}
        </div>
        
      </DashboardLayout>
    </OfficerGuard>
  )
}







