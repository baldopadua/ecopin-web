'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCleanupTasks } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DataTable from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import { useUser } from '@/components/auth/UserContext'
import { OfficerGuard } from '@/components/auth/RequireRole'

export default function OfficerHomepage() {
  const router = useRouter()
  const user = useUser()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const data = await fetchCleanupTasks()
        setTasks(data)
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

  const stats = [
    { title: 'Total Assigned', value: tasks.length, color: 'accent' },
    { title: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, color: 'warning' },
    { title: 'Pending', value: tasks.filter(t => t.status === 'pending').length, color: 'info' },
    { title: 'Completed', value: tasks.filter(t => t.status === 'completed').length, color: 'success' }
  ]

  const quickActions = [
    { label: 'View All Tasks', onClick: () => router.push('/dashboard/officer/cleanup-tasks'), variant: 'primary' },
    { label: 'View Reports', onClick: () => router.push('/dashboard/reports'), variant: 'secondary' }
  ]

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const handleTaskClick = (task) => {
    router.push(`/dashboard/officer/cleanup-tasks/${task.id}`)
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
    <OfficerGuard>
      <DashboardLayout
        title="Officer Dashboard"
        subtitle={`Welcome back${user?.full_name ? `, ${user.full_name}` : ''}! Here are your assigned tasks.`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard/officer' }
        ]}
        stats={stats}
        quickActions={quickActions}
        loading={loading}
      >
        {/* Active Tasks */}
        <div className="card no-hover mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-text-primary">Active Tasks</h2>
            <button
              onClick={() => router.push('/dashboard/officer/cleanup-tasks')}
              className="btn-secondary"
            >
              View All
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-3 w-20 rounded bg-border/50 mb-3" />
                  <div className="h-3 w-32 rounded bg-border/50 mb-2" />
                  <div className="h-3 w-16 rounded bg-border/50" />
                </div>
              ))}
            </div>
          ) : activeTasks.length === 0 ? (
            <div className="text-center py-10 text-text-muted">
              <p className="text-lg mb-1">No active tasks</p>
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
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-text-primary text-base leading-tight flex-1 mr-2">
                      {task.title}
                    </h3>
                    <StatusBadge status={task.status} type="task" />
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
    </OfficerGuard>
  )
}