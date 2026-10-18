'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchCleanupTasks, fetchPublicReports, fetchClusters, fetchWorkQueue, getOptimizationRuns } from '@/lib/api'
import CommandCenterPanel from '@/components/ui/CommandCenterPanel'
import styles from '@/components/ui/CommandCenter.module.css'
import StatusBadge from '@/components/ui/StatusBadge'
import { useUser } from '@/components/auth/UserContext'
import { OfficerGuard } from '@/components/auth/RequireRole'
import { Users, AlertTriangle, CloudLightning, ChevronRight, Search } from 'lucide-react'
import { reportDiagnostic } from '../../../lib/diagnostics.mjs';

export default function OfficerHomepage() {
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
        reportDiagnostic('error', 'other', 'Failed to load dashboard data:', error)
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
      <div className={styles.page}>
        <header className={styles.header}>
          <h1>Command Center</h1>
          <Link href="/dashboard/officer/optimization" className={styles.primary}>
            <CloudLightning size={16} aria-hidden="true" />Run Optimization
          </Link>
          <p>Welcome, {user?.full_name || 'Officer'}. System status is operational.</p>
        </header>
        <div className={styles.metrics} aria-label="Operational overview">
          {[
            { title: 'Active Field Units', value: activeTasks.length, note: 'Cleanup tasks in progress', href: '/dashboard/officer/operations?status=in_progress', icon: Users },
            { title: 'Unresolved Reports', value: reports.length, note: 'Reports awaiting action', href: '/dashboard/officer/reports', icon: Search },
            { title: 'SLA Risk', value: slaRiskTasks.length, note: 'Reports older than 48 hours', href: slaRiskTasks.length ? '/dashboard/officer/reports?filter=overdue' : '/dashboard/officer/reports', icon: AlertTriangle },
            { title: 'Manual Review', value: manualReviewTasks.length, note: 'Reports awaiting review', href: manualReviewTasks.length ? '/dashboard/officer/reports?filter=manual_review' : '/dashboard/officer/reports', icon: AlertTriangle },
          ].map(({ title, value, note, href, icon: Icon }) => <Link key={title} href={href}
            className={`${styles.metric} ${title === 'SLA Risk' && value > 0 && !loading ? styles.slaAlert : ''}`}>
            <span>{title}</span><Icon size={18} aria-hidden="true" />
            <strong>{loading ? '—' : value}</strong><small>{note}</small>
          </Link>)}
        </div>
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
          <CommandCenterPanel title="Action Queue" items={workQueue} loading={loading}
            empty="Queue is empty" href="/dashboard/officer/optimization">
            {item => <Link href={`/dashboard/officer/operations/create?preselect=${item.id}`} className={styles.item}>
              <span className={styles.itemTitle}><strong>{item.title || `Cluster ${item.id.slice(0, 8)}`}</strong><span className={styles.priority}>Pending</span></span>
              <span className={styles.meta}><span>Priority score</span><strong>{(item.priority_score || 0).toFixed(1)}/100</strong></span>
              <span className={styles.meta}><span>{item.report_count || item.report_ids?.length || 0} reports · {Math.round(item.radius_meters || 50)}m</span><span className={styles.action}>Dispatch <ChevronRight size={14} aria-hidden="true" /></span></span>
            </Link>}
          </CommandCenterPanel>
          <CommandCenterPanel title="Critical Hotzones" items={criticalClusters} loading={loading}
            empty="No hotzones detected" href="/dashboard/officer/hotzone-intel">
            {(cluster, index) => <Link href={`/dashboard/officer/hotzone-intel/${cluster.id}`} className={styles.item}>
              <span className={styles.itemTitle}><strong>{cluster.label || `Cluster ${cluster.id.slice(0, 6)}`}</strong><span className={styles.count}>#{index + 1}</span></span>
              <span className={styles.meta}><span className={styles.priority}>{getPriorityLabel(cluster)} priority</span><strong>Score {Math.round(cluster.priority_score || 0)}</strong></span>
              <span className={styles.meta}><span>{cluster.report_count || cluster.report_ids?.length || 0} reports</span><span>Radius {Math.round(cluster.radius_meters || 50)}m</span></span>
            </Link>}
          </CommandCenterPanel>
        </div>
      </div>
    </OfficerGuard>
  )
}
