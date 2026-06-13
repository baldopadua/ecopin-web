'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCleanupTasks } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'

export default function CleanupTasksPage() {
  const [tasks, setTasks] = useState([])
  const [filteredTasks, setFilteredTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const data = await fetchCleanupTasks()
        setTasks(data)
        setFilteredTasks(data)
      } catch (error) {
        console.error('Failed to load cleanup tasks:', error)
      } finally {
        setLoading(false)
      }
    }
    loadTasks()
  }, [])

  // Apply filters
  useEffect(() => {
    let filtered = tasks

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        (t.title && t.title.toLowerCase().includes(query)) ||
        (t.description && t.description.toLowerCase().includes(query))
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter)
    }

    setFilteredTasks(filtered)
    setCurrentPage(1)
  }, [searchQuery, statusFilter, tasks])

  // Calculate pagination
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex)

  const handlePageChange = (page) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRowClick = (taskId) => {
    router.push(`/dashboard/cleanup-tasks/${taskId}`)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
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

      {/* Search and Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-secondary mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-text-secondary">
            {loading ? 'Loading...' : `Showing ${startIndex + 1}-${Math.min(endIndex, filteredTasks.length)} of ${filteredTasks.length} tasks`}
          </p>
        </div>
      </div>

      {/* Tasks List */}
      <div className="card">
        <h2 className="text-xl font-bold text-text-primary mb-4">All Cleanup Tasks</h2>
        {loading ? (
          <p className="text-text-muted">Loading cleanup tasks...</p>
        ) : filteredTasks.length === 0 ? (
          <p className="text-text-muted">No cleanup tasks match your filters</p>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedTasks.map((task) => (
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-2 rounded-lg ${
                        currentPage === page
                          ? 'bg-accent-green text-white'
                          : 'bg-surface text-text-primary hover:bg-accent-green/10'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
