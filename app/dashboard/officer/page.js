'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCleanupTasks } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useUser } from '@/components/auth/UserContext'
import { OfficerGuard } from '@/components/auth/RequireRole'

export default function OfficerDashboardPage() {
  const router = useRouter()
  const user = useUser()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    assigned: 0,
    inProgress: 0,
    completed: 0,
    pending: 0,
  })

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const data = await fetchCleanupTasks()
        setTasks(data)

        setStats({
          assigned: data.length,
          inProgress: data.filter(t => t.status === 'in_progress').length,
          completed: data.filter(t => t.status === 'completed').length,
          pending: data.filter(t => t.status === 'pending').length,
        })
      } catch (error) {
        console.error('Failed to load tasks:', error)
      } finally {
        setLoading(false)
      }
    }
    loadTasks()
  }, [])

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-success/10 text-success border-success/30'
      case 'in_progress': return 'bg-warning/10 text-warning border-warning/30'
      case 'pending': return 'bg-info/10 text-info border-info/30'
      default: return 'bg-surface text-text-muted border-border'
    }
  }

  const activeTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'pending')
  const recentCompleted = tasks
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 6)

  return (
    <OfficerGuard>
      <div className="p-8">
        <PageHeader
          title="Officer Dashboard"
          subtitle={`Welcome back${user?.full_name ? `, ${user.full_name}` : ''}! Here are your assigned tasks.`}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard/officer' }
          ]}
        />

        {/* Stats Row */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-3 w-20 rounded bg-border/50 mb-3" />
                <div className="h-8 w-12 rounded bg-border/50" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="card border-l-4 border-l-[var(--accent-green)]">
              <span className="text-sm text-text-muted block mb-1">Total Assigned</span>
              <p className="text-3xl font-bold text-text-primary">{stats.assigned}</p>
            </div>
            <div className="card border-l-4 border-l-[var(--warning)]">
              <span className="text-sm text-text-muted block mb-1">In Progress</span>
              <p className="text-3xl font-bold text-text-primary">{stats.inProgress}</p>
            </div>
            <div className="card border-l-4 border-l-[var(--info)]">
              <span className="text-sm text-text-muted block mb-1">Pending</span>
              <p className="text-3xl font-bold text-text-primary">{stats.pending}</p>
            </div>
            <div className="card border-l-4 border-l-[var(--success)]">
              <span className="text-sm text-text-muted block mb-1">Completed</span>
              <p className="text-3xl font-bold text-text-primary">{stats.completed}</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="card no-hover mb-8">
          <h2 className="text-xl font-bold text-text-primary mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push('/dashboard/cleanup-tasks')}
              className="btn-primary"
            >
              View All Tasks
            </button>
            <button
              onClick={() => router.push('/dashboard/reports')}
              className="btn-secondary"
            >
              View Reports
            </button>
          </div>
        </div>

        {/* Active Tasks */}
        <div className="card no-hover mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-text-primary">Active Tasks</h2>
            <button
              onClick={() => router.push('/dashboard/cleanup-tasks')}
              className="btn-secondary"
            >
              View All
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
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
                  onClick={() => router.push(`/dashboard/cleanup-tasks/${task.id}`)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-text-primary text-base leading-tight flex-1 mr-2">
                      {task.title}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold border whitespace-nowrap ${getStatusColor(task.status)}`}>
                      {task.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-text-muted line-clamp-2 mb-4">
                    {task.description || 'No description provided.'}
                  </p>
                  <div className="text-xs text-text-muted mb-3">
                    Created: {new Date(task.created_at).toLocaleDateString()}
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Title</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Description</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Completed</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCompleted.map(task => (
                    <tr
                      key={task.id}
                      className="border-b border-border cursor-pointer hover:bg-surface/50 transition-colors"
                      onClick={() => router.push(`/dashboard/cleanup-tasks/${task.id}`)}
                    >
                      <td className="py-3 px-4 font-medium text-text-primary">{task.title}</td>
                      <td className="py-3 px-4 text-sm text-text-secondary line-clamp-1 max-w-xs">
                        {task.description || '—'}
                      </td>
                      <td className="py-3 px-4 text-sm text-text-muted">
                        {new Date(task.completed_at || task.updated_at || task.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(task.status)}`}>
                          {task.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </OfficerGuard>
  )
}
