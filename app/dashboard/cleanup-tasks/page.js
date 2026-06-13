'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCleanupTasks } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'

export default function CleanupTasksPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const data = await fetchCleanupTasks()
        setTasks(data)
      } catch (error) {
        console.error('Failed to load cleanup tasks:', error)
      } finally {
        setLoading(false)
      }
    }
    loadTasks()
  }, [])

  const handleRowClick = (taskId) => {
    router.push(`/dashboard/cleanup-tasks/${taskId}`)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  return (
    <div className="p-8">
      <PageHeader 
        title="Cleanup Tasks"
        subtitle="Manage and track cleanup tasks"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Cleanup Tasks' }
        ]}
      />

      {/* Tasks List */}
      <div className="card">
        <h2 className="text-xl font-bold text-text-primary mb-4">All Cleanup Tasks</h2>
        {loading ? (
          <p className="text-text-muted">Loading cleanup tasks...</p>
        ) : tasks.length === 0 ? (
          <p className="text-text-muted">No cleanup tasks found</p>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 border border-border rounded-lg hover:bg-surface cursor-pointer transition-colors"
                onClick={() => handleRowClick(task.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text-primary">{task.title}</h3>
                    <p className="text-text-secondary mt-1 line-clamp-2">{task.description}</p>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm">
                      <span className="text-text-muted">
                        Created: {new Date(task.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
