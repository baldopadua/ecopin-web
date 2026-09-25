'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCleanupTasks } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DataTable from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import { useUser } from '@/components/auth/UserContext'
import { FieldCrewGuard } from '@/components/auth/RequireRole'
import PerformanceMetricsCard from '@/components/ui/PerformanceMetricsCard'
import PriorityTasksCard from '@/components/ui/PriorityTasksCard'
import { ClipboardList, FileText, LayoutDashboard, CheckCircle } from 'lucide-react'

export default function FieldCrewHomepage() {
  const router = useRouter()
  const user = useUser()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const data = await fetchCleanupTasks(false)
        const currentUserId = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}').id : null
        
        // Filter tasks locally to ensure assigned tasks show up properly
        const myTasks = data.filter(t => t.assigned_crew_ids && t.assigned_crew_ids.includes(currentUserId))
        setTasks(myTasks)
      } catch (error) {
        console.error('Failed to load tasks:', error)
      } finally {
        setLoading(false)
      }
    }
    loadTasks()
  }, [])

  const activeTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'pending')
  const recentCompleted = tasks
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 6)

  // Calculate performance metrics
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const totalTasks = tasks.length
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  // Calculate 7-day activity
  const getDailyCounts = () => {
    const counts = [0, 0, 0, 0, 0, 0, 0]
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    tasks.forEach(task => {
      if (task.status === 'completed' && task.updated_at) {
        const taskDate = new Date(task.updated_at)
        if (taskDate >= oneWeekAgo && taskDate <= now) {
          const dayIndex = (taskDate.getDay() + 6) % 7 // Convert to Monday=0
          counts[dayIndex]++
        }
      }
    })
    return counts
  }

  const dailyCounts = getDailyCounts()

  // Determine quality based on completion rate
  let quality = 'good'
  if (completionRate >= 90) quality = 'excellent'
  else if (completionRate >= 75) quality = 'great'
  else if (completionRate >= 60) quality = 'good'
  else if (completionRate >= 40) quality = 'fair'
  else quality = 'poor'

  // Prepare priority tasks (high priority active tasks)
  const priorityTasks = activeTasks
    .filter(t => t.priority === 'high' || t.priority === 'urgent')
    .slice(0, 5)
    .map(t => ({
      id: t.id,
      title: t.title,
      location: t.location || 'Unknown location',
      priority: t.priority === 'urgent' ? 'high' : (t.priority || 'medium'),
      status: t.status === 'in_progress' ? 'inProgress' : 'pending',
      time: t.estimated_time || '1.0 hr',
      taskType: t.task_type
    }))

  // Prepare feasible tasks (low/medium priority active tasks)
  const feasibleTasks = activeTasks
    .filter(t => t.priority === 'low' || t.priority === 'medium' || !t.priority)
    .slice(0, 5)
    .map(t => ({
      id: t.id,
      title: t.title,
      location: t.location || 'Unknown location',
      priority: t.priority || 'low',
      status: t.status === 'in_progress' ? 'inProgress' : 'pending',
      time: t.estimated_time || '1.0 hr',
      taskType: t.task_type
    }))

  const stats = [
    { title: 'Total Assigned', value: tasks.length, color: 'accent' },
    { title: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, color: 'warning' },
    { title: 'Pending', value: tasks.filter(t => t.status === 'pending').length, color: 'info' },
    { title: 'Completed', value: tasks.filter(t => t.status === 'completed').length, color: 'success' }
  ]

  const quickActions = [
    { label: 'View All Tasks', icon: <ClipboardList className="w-4 h-4" />, onClick: () => router.push('/dashboard/field-crew/tasks'), variant: 'primary' },
    { label: 'View Reports', icon: <FileText className="w-4 h-4" />, onClick: () => router.push('/dashboard/raw-data'), variant: 'secondary' }
  ]

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const handleTaskClick = (task) => {
    router.push(`/dashboard/field-crew/tasks`)
  }

  const handlePriorityTaskClick = (taskId) => {
    router.push(`/dashboard/field-crew/tasks`)
  }

  const completedTaskColumns = [
    { key: 'title', label: 'Title', width: '25%' },
    {
      key: 'description',
      label: 'Description',
      width: '35%',
      render: (value) => (
        <span className="text-sm text-text-secondary line-clamp-1 max-w-xs">{value || '—'}</span>
      )
    },
    {
      key: 'updated_at',
      label: 'Completed',
      width: '15%',
      render: (value) => (
        <span className="text-sm text-text-muted">{formatDate(value)}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      width: '25%',
      render: (value) => (
        <StatusBadge status={value} type="task" />
      )
    }
  ]

  return (
    <FieldCrewGuard>
      <DashboardLayout
        title="Field Crew Dashboard"
        subtitle={`Welcome back${user?.full_name ? `, ${user.full_name}` : ''}! Here are your assigned tasks.`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard/field-crew' }
        ]}
        stats={stats}
        quickActions={quickActions}
        loading={loading}
      >
        {/* Field Crew Widgets */}
        <div className="space-y-4 mb-8">
          <PerformanceMetricsCard
            completedTasks={completedTasks}
            totalTasks={totalTasks}
            quality={quality}
            dailyCounts={dailyCounts}
          />
          <PriorityTasksCard
            priorityTasks={priorityTasks}
            feasibleTasks={feasibleTasks}
            onTaskClick={handlePriorityTaskClick}
          />
        </div>

        {/* Active Tasks */}
        <div className="card no-hover mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-text-primary">Active Tasks</h2>
            <button
              onClick={() => router.push('/dashboard/field-crew/tasks')}
              className="btn-secondary"
            >
              View All
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card animate-pulse flex flex-col justify-between h-[220px]">
                  <div>
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <div className="h-5 w-3/4 rounded bg-border/50" />
                      <div className="h-5 w-16 rounded bg-border/50 shrink-0" />
                    </div>
                    <div className="h-4 w-full rounded bg-border/50 mb-2" />
                    <div className="h-4 w-2/3 rounded bg-border/50 mb-4" />
                    <div className="h-3 w-32 rounded bg-border/50 mb-3" />
                  </div>
                  <div className="h-10 w-full rounded bg-border/50" />
                </div>
              ))}
            </div>
          ) : activeTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-muted border-2 border-dashed border-border rounded-xl bg-surface-elevated">
              <CheckCircle className="w-16 h-16 mb-4 text-success/50" />
              <p className="text-xl font-bold mb-1 text-text-primary">You're all caught up!</p>
              <p className="text-sm">You have no pending or in-progress tasks at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTasks.slice(0, 6).map(task => (
                <div
                  key={task.id}
                  className="card hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleTaskClick(task)}
                >
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <h3 className="font-bold text-text-primary text-base leading-tight flex-1">
                      {task.title}
                    </h3>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={task.status} type="task" />
                      {task.task_type && (
                        <span className={`text-[10px] uppercase font-bold font-mono tracking-wider px-1.5 py-0.5 border rounded-sm ${
                          task.task_type === 'Scouting' ? 'bg-info/10 text-info border-info/20' :
                          task.task_type === 'Cleanup' ? 'bg-success/10 text-success border-success/20' :
                          'bg-purple/10 text-purple border-purple/20'
                        }`}>
                          {task.task_type === 'Scouting' ? '🔍 Scout' : task.task_type === 'Cleanup' ? '🧹 Clean' : '🔄 Mix'}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-text-muted line-clamp-2 mb-4">
                    {task.description || 'No description provided.'}
                  </p>
                  <div className="text-xs text-text-muted mb-3">
                    Created: {formatDate(task.created_at)}
                  </div>
                  <button className="btn-secondary w-full text-sm">
                    View Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Completed */}
        {!loading && recentCompleted.length > 0 && (
          <div className="card no-hover">
            <h2 className="text-xl font-bold text-text-primary mb-6">Recently Completed</h2>
            <DataTable
              columns={completedTaskColumns}
              data={recentCompleted}
              onRowClick={handleTaskClick}
            />
          </div>
        )}
      </DashboardLayout>
    </FieldCrewGuard>
  )
}