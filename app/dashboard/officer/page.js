'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchWorkQueue, getOptimizationRuns } from '@/lib/api'
import { getCrewsWithMembers } from '@/lib/api/optimization'
import { useDashboardReports, useDashboardTasks, useDashboardClusters, useDashboardReportLifecycle } from '@/components/context/DashboardQueryProvider'
import ReportLifecycleSummary from '@/components/reports/ReportLifecycleSummary'
import CommandCenterPanel from '@/components/ui/CommandCenterPanel'
import styles from '@/components/ui/CommandCenter.module.css'
import PageHeader from '@/components/layout/PageHeader'
import PageTabs from '@/components/ui/PageTabs'
import LiveOperationsFeed from '@/components/reports/LiveOperationsFeed'
import StatusBadge from '@/components/ui/StatusBadge'
import UrgencyQueue from '@/components/reports/UrgencyQueue'
import UnprocessedAlerts from '@/components/reports/UnprocessedAlerts'
import OfficerDispatchTour from '@/components/onboarding/OfficerDispatchTour'
import { useUser } from '@/components/auth/UserContext'
import { OfficerGuard } from '@/components/auth/RequireRole'
import { Users, AlertTriangle, CloudLightning, ChevronRight, Search } from 'lucide-react'
import { reportDiagnostic } from '../../../lib/diagnostics.mjs';

export default function OfficerHomepage() {
  const user = useUser()
  const [view,setView]=useState('command-overview')
  const [queueLoading, setQueueLoading] = useState(true)
  const taskQuery = useDashboardTasks()
  const reportQuery = useDashboardReports()
  const lifecycleQuery = useDashboardReportLifecycle()
  const clusterQuery = useDashboardClusters()
  const rawTasks = taskQuery.data
  const tasks = Array.isArray(rawTasks) ? rawTasks
    : (Array.isArray(rawTasks?.tasks) ? rawTasks.tasks : (Array.isArray(rawTasks?.data) ? rawTasks.data : []))
  const reports = (reportQuery.data || []).filter(r => r.status !== 'resolved' && r.status !== 'closed')
  const clusters = clusterQuery.data || []
  const loading = queueLoading || taskQuery.isPending || reportQuery.isPending || clusterQuery.isPending
  const dataError = taskQuery.isError || reportQuery.isError || clusterQuery.isError
  const [workQueue, setWorkQueue] = useState([])
  const [needsDispatch, setNeedsDispatch] = useState(true)
  const [crews, setCrews] = useState([])
  const [latestRun, setLatestRun] = useState(null)
  

  useEffect(() => {
    const loadData = async () => {
      setQueueLoading(true)
      try {
        const [
          queueData,
          runsData,
          crewData
        ] = await Promise.all([
          fetchWorkQueue().catch(() => []),
          getOptimizationRuns().catch(() => []),
          getCrewsWithMembers().catch(() => [])
        ])

        setWorkQueue(queueData || [])
        setCrews(Array.isArray(crewData) ? crewData : [])
        
        const approvedRuns = (runsData || []).filter(r => r.status === 'approved')
        if (approvedRuns.length > 0) {
           setLatestRun(approvedRuns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0])
        } else if (runsData && runsData.length > 0) {
           setLatestRun(runsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0])
        }

      } catch (error) {
        reportDiagnostic('error', 'other', 'Failed to load dashboard data:', error)
      } finally {
        setQueueLoading(false)
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
  
  // Squad utilization: assigned task load against total per-shift crew capacity
  const crewLoad = crews.reduce((sum, c) => sum + (c.active_task_count ?? c.assigned_tasks_count ?? 0), 0)
  const crewCapacity = crews.reduce((sum, c) => sum + (c.max_tasks_per_shift || 10), 0)
  const utilization = crewCapacity ? Math.round((crewLoad / crewCapacity) * 100) : null

  // Calculate SLA risk: reports unresolved/actionable for more than 48 hours or flagged overdue
  const now = new Date()
  const terminalStatuses = ['resolved', 'closed', 'completed', 'rejected']
  const slaRiskTasks = reports.filter(t => {
     const status = (t.status || '').toLowerCase()
     if (terminalStatuses.includes(status)) return false

     if (t.is_overdue) return true
     if (t.deadline_at) return now > new Date(t.deadline_at)
     if (t.created_at) {
       const created = new Date(t.created_at)
       const diffHours = (now - created) / (1000 * 60 * 60)
       return diffHours > 48
     }
     return false
  })

  // Unresolved reports
  const unresolvedReports = reports.filter(t => (t.status || '').toLowerCase() === 'unresolved')

  // Manual Review tasks
  const manualReviewTasks = reports.filter(t => (t.validation_status || '').toLowerCase() === 'manual_review')

  // Critical hotzones: top 3 highest severity (now using priority_score)
  const criticalClusters = [...clusters].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0)).slice(0, 3)
  
  // Keep dashboard previews compact; full lists remain available on their pages.
  const actionQueueItems = workQueue.slice(0, 3)

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
      <div className={`workspace-page ${styles.page}`}>
        <PageHeader title="Command Center" subtitle={`Welcome, ${user?.full_name || 'Officer'}. Review activity and dispatch work.`}>
          <Link href="/dashboard/officer/optimization" className={styles.primary} data-tour="route-generation">
            <CloudLightning size={16} aria-hidden="true" />Run Optimization
          </Link>
        </PageHeader>
        <PageTabs label="Command Center views" tabs={[{id:'command-overview',label:'Overview'},{id:'operations-feed',label:'Operations feed'}]} value={view} onChange={setView} />
        {view==='operations-feed'?<div id="operations-feed-panel" role="tabpanel" aria-labelledby="operations-feed-tab" className="workspace-fill"><LiveOperationsFeed /></div>:<div id="command-overview-panel" role="tabpanel" aria-labelledby="command-overview-tab" className="workspace-fill">
        {dataError && <div role="alert">
          Some dashboard data could not refresh. Previously loaded data is shown where available.
          <button type="button" onClick={() => { void taskQuery.refetch(); void reportQuery.refetch(); void clusterQuery.refetch() }}>Try again</button>
        </div>}
        <div className={styles.metrics} aria-label="Operational overview">
          {[
            { title: 'Squad Utilization', value: utilization == null ? 'N/A' : `${utilization}%`, note: utilization == null ? 'No squads available' : `${crewLoad} of ${crewCapacity} task slots in use`, href: '/dashboard/officer/crew-management', icon: Users },
            { title: 'Unresolved Reports', value: unresolvedReports.length, note: 'Reports awaiting action', href: '/dashboard/officer/reports?status=unresolved', icon: Search },
            { title: 'SLA Risk', value: slaRiskTasks.length, note: 'Reports older than 48 hours', href: '/dashboard/officer/reports?status=overdue', icon: AlertTriangle },
            { title: 'Manual Review', value: manualReviewTasks.length, note: 'Reports awaiting review', href: '/dashboard/officer/reports?filter=manual_review', icon: AlertTriangle },
          ].map(({ title, value, note, href, icon: Icon }) => <Link key={title} href={href}
            className={`${styles.metric} ${title === 'SLA Risk' && value > 0 && !loading ? styles.slaAlert : ''}`}>
            <span>{title}</span><Icon size={18} aria-hidden="true" />
            <strong>{loading ? '—' : value}</strong><small>{note}</small>
          </Link>)}
        </div>
        <UrgencyQueue compact />
        <UnprocessedAlerts />
        <ReportLifecycleSummary reports={lifecycleQuery.data} compact loading={lifecycleQuery.isPending} error={lifecycleQuery.isError} onRetry={()=>lifecycleQuery.refetch()} />
        <div className={styles.panels}>
          <CommandCenterPanel title="Active Targets" items={activeTasks} loading={loading}
            empty="No in-progress cleanup tasks" href="/dashboard/officer/operations?status=in_progress">
            {task => {
              const crewCount = task.assigned_crew_ids?.length || (task.assigned_to ? 1 : 0)
              const reportCount = task.reports?.length || task.report_ids?.length || 0
              return <Link href={`/dashboard/officer/operations/${task.id}`} className={styles.item}>
                <span className={styles.itemTitle}><strong>{task.title || `Task #${task.id?.slice(0, 8)}`}</strong><StatusBadge status={task.status || 'in_progress'} type="task" /></span>
                <span className={styles.description}>{task.description || 'No description provided.'}</span>
                <span className={styles.meta}><span>{crewCount ? `${crewCount} crew dispatched` : 'Unassigned'}</span><span>{reportCount} reports</span></span>
              </Link>
            }}
          </CommandCenterPanel>
          <CommandCenterPanel title="Priority Hotzones" items={needsDispatch ? workQueue : criticalClusters} loading={loading}
            empty={needsDispatch ? 'Queue is empty' : 'No hotzones detected'}
            href={needsDispatch ? '/dashboard/officer/optimization' : '/dashboard/officer/hotzone-intel'}
            toolbar={<div className={styles.chips} role="group" aria-label="Hotzone filter">
              <button type="button" className={styles.chip} aria-pressed={needsDispatch} onClick={() => setNeedsDispatch(true)}>Needs Dispatch</button>
              <button type="button" className={styles.chip} aria-pressed={!needsDispatch} onClick={() => setNeedsDispatch(false)}>All Hotzones</button>
            </div>}>
            {(cluster, index) => needsDispatch
              ? <Link href={`/dashboard/officer/operations/create?preselect=${cluster.id}`} className={styles.item}>
                <span className={styles.itemTitle}><strong>{cluster.title || `Cluster ${cluster.id.slice(0, 8)}`}</strong><span className={styles.priority}>Pending</span></span>
                <span className={styles.meta}><span>Priority score</span><strong>{(cluster.priority_score || 0).toFixed(1)}/100</strong></span>
                <span className={styles.meta}><span>{cluster.report_count || cluster.report_ids?.length || 0} reports · {Math.round(cluster.radius_meters || 50)}m</span><span className={styles.action}>Dispatch <ChevronRight size={14} aria-hidden="true" /></span></span>
              </Link>
              : <Link href={`/dashboard/officer/hotzone-intel/${cluster.id}`} className={styles.item}>
                <span className={styles.itemTitle}><strong>{cluster.label || `Cluster ${cluster.id.slice(0, 6)}`}</strong><span className={styles.count}>#{index + 1}</span></span>
                <span className={styles.meta}><span className={styles.priority}>{getPriorityLabel(cluster)} priority</span><strong>Score {Math.round(cluster.priority_score || 0)}</strong></span>
                <span className={styles.meta}><span>{cluster.report_count || cluster.report_ids?.length || 0} reports</span><span>Radius {Math.round(cluster.radius_meters || 50)}m</span></span>
              </Link>}
          </CommandCenterPanel>
        </div>
        <OfficerDispatchTour key={user?.id} />
        </div>}
      </div>
    </OfficerGuard>
  )
}
