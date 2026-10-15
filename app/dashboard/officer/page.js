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
import { Target, Users, AlertTriangle, CloudLightning, ChevronRight, CheckCircle2, Search, Map } from 'lucide-react'

export default function OfficerHomepage() {
  const router = useRouter()
  const user = useUser()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [reports, setReports] = useState([])
  const [clusters, setClusters] = useState([])
  const [workQueue, setWorkQueue] = useState([])
  const [latestRun, setLatestRun] = useState(null)
  

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

        const tasksList = Array.isArray(tasksData)
          ? tasksData
          : (Array.isArray(tasksData?.tasks) ? tasksData.tasks : (Array.isArray(tasksData?.data) ? tasksData.data : []))
        setTasks(tasksList)
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

  // Derived metrics - Active Field Units & Active Targets based on in-progress cleanup tasks
  const activeTasks = (Array.isArray(tasks) ? tasks : []).filter(t => {
    const status = t?.status?.toLowerCase()?.replace(/[\s-]/g, '_')
    return status === 'in_progress'
  })
  const pendingTasks = (Array.isArray(tasks) ? tasks : []).filter(t => {
    const status = t?.status?.toLowerCase()?.replace(/[\s-]/g, '_')
    return status === 'pending'
  })
  
  // Calculate SLA risk: reports unresolved for more than 48 hours
  const now = new Date()
  const slaRiskTasks = reports.filter(t => {
     if (t.is_overdue) return true;
     const created = new Date(t.created_at)
     const diffHours = (now - created) / (1000 * 60 * 60)
     return diffHours > 48
  })

  // Manual Review tasks
  const manualReviewTasks = reports.filter(t => t.validation_status === 'manual_review' || t.validation_status === 'Manual_Review')

  // Critical hotzones: top 3 highest severity (now using priority_score)
  const criticalClusters = [...clusters].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0)).slice(0, 3)
  
  // Action queue: work queue items minus active tasks, up to 5
  const actionQueueItems = workQueue.slice(0, 5)

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
             subtitle={!loading && activeTasks.length > 0 ? `${activeTasks.length} cleanup task${activeTasks.length === 1 ? '' : 's'} in progress.` : 'No tasks currently in progress.'}
             icon={<Users className="w-6 h-6" />} 
             color="accent"
             onClick={() => router.push('/dashboard/officer/operations?status=in_progress')}
             className="group transition-all hover:border-border dark:hover:border-white"
           >
             <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between">
               <Link
                 href="/dashboard/officer/operations?status=in_progress"
                 onClick={(e) => e.stopPropagation()}
                 className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1 text-text-secondary group-hover:text-text-primary group-hover:underline"
               >
                 View Operations
                 <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
               </Link>
             </div>
           </StatsCard>
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
             title="Manual Review" 
             value={manualReviewTasks.length} 
             subtitle={!loading && manualReviewTasks.length > 0 ? `${manualReviewTasks.length} pending review.` : 'No reports pending review.'}
             icon={<AlertTriangle className="w-6 h-6" />} 
             color={manualReviewTasks.length > 0 ? "warning" : "success"}
             onClick={() => router.push(manualReviewTasks.length > 0 ? '/dashboard/officer/reports?filter=manual_review' : '/dashboard/officer/reports')}
             className={`group transition-all hover:border-border dark:hover:border-white ${manualReviewTasks.length > 0 ? "animate-pulse border-warning bg-warning/5" : ""}`}
           >
             <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between">
               <Link
                 href={manualReviewTasks.length > 0 ? '/dashboard/officer/reports?filter=manual_review' : '/dashboard/officer/reports'}
                 onClick={(e) => e.stopPropagation()}
                 className={`text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1 group-hover:underline ${
                   manualReviewTasks.length > 0 ? 'text-warning dark:text-yellow-400' : 'text-text-secondary group-hover:text-text-primary'
                 }`}
               >
                 {manualReviewTasks.length > 0 ? 'Review Reports' : 'View Reports'}
                 <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
               </Link>
             </div>
           </StatsCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Left Column: Action Queue & Active Targets */}
           <div className="lg:col-span-2 space-y-8">
              {/* Active Targets - In-Progress Cleanup Tasks */}
              <div className="card border border-border dark:border-[#333333] rounded-xl p-6">
                 <div className="flex justify-between items-center mb-6 border-b border-border pb-3">
                    <h2 className="text-xl font-bold tracking-tight uppercase flex items-center gap-2">
                       Active Targets
                       {!loading && (
                          <span className="text-xs font-mono font-bold bg-warning/10 text-warning border border-warning/30 px-2 py-0.5 rounded-full">
                             {activeTasks.length} in progress
                          </span>
                       )}
                    </h2>
                    <Link href="/dashboard/officer/operations?status=in_progress" className="text-sm font-bold text-text-secondary hover:text-accent-green transition-colors flex items-center">
                       View All <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                 </div>
                 
                 {loading ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                     {[1,2].map(i => <div key={i} className="h-28 bg-surface-elevated border border-border rounded-lg" />)}
                   </div>
                 ) : activeTasks.length === 0 ? (
                   <div className="text-center py-8 text-text-muted bg-surface-elevated border border-dashed border-border rounded-lg">
                      <p className="font-medium text-text-secondary">No in-progress cleanup tasks</p>
                      <p className="text-xs text-text-muted mt-1">There are currently no cleanup tasks actively in progress.</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {activeTasks.slice(0, 6).map(task => {
                        const crewCount = task.assigned_crew_ids?.length || (task.assigned_to ? 1 : 0);
                        const reportCount = task.reports?.length || task.report_ids?.length || 0;
                        return (
                           <div 
                              key={task.id} 
                              className="border border-border dark:border-[#333333] p-4 hover:bg-surface-elevated hover:border-accent-green transition-all cursor-pointer rounded-lg bg-surface flex flex-col justify-between group" 
                              onClick={() => router.push(`/dashboard/officer/operations/${task.id}`)}
                           >
                              <div>
                                 <div className="flex justify-between items-start gap-2 mb-2">
                                    <h3 className="font-bold text-text-primary line-clamp-1 flex-1 group-hover:text-accent-green transition-colors">
                                       {task.title || `Task #${task.id?.slice(0, 8)}`}
                                    </h3>
                                    <StatusBadge status={task.status || 'in_progress'} type="task" />
                                 </div>
                                 <p className="text-sm text-text-secondary line-clamp-2 mb-3 min-h-[2.5rem]">
                                    {task.description || 'No description provided.'}
                                 </p>
                              </div>
                              <div className="pt-2 border-t border-border/50 flex justify-between items-center text-xs">
                                 <span className="text-text-muted">
                                    Assigned: <strong className={crewCount > 0 ? "text-accent-green" : "text-text-muted"}>
                                       {crewCount > 0 ? `${crewCount} Crew Dispatched` : 'Unassigned'}
                                    </strong>
                                 </span>
                                 {reportCount > 0 && (
                                    <span className="font-mono text-text-secondary font-medium">
                                       {reportCount} report{reportCount > 1 ? 's' : ''}
                                    </span>
                                 )}
                              </div>
                           </div>
                        );
                     })}
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

      </DashboardLayout>
    </OfficerGuard>
  )
}







