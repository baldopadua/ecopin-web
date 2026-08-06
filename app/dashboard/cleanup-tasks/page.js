'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCleanupTasks } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import FilterDropdown from '@/components/ui/FilterDropdown'
import { SkeletonLine } from '@/components/ui/Skeleton'
import { OfficerGuard } from '@/components/auth/RequireRole'

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
  const itemsPerPage = 8

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
        return 'bg-success/10 text-success border-success/30'
      case 'in_progress':
        return 'bg-warning/10 text-warning border-warning/30'
      case 'pending':
        return 'bg-info/10 text-info border-info/30'
      default:
        return 'bg-info/10 text-info border-info/30'
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
      <div className="card mb-6 sticky top-[120px] z-10 bg-white/60 dark:bg-black/60 border-l-4 border-l-[var(--accent-green)] no-hover">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
            />
          </div>

          {/* Status Filter */}
          <FilterDropdown
            label="All Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' }
            ]}
          />

          {/* Reset Filters Button */}
          {(searchQuery || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
              }}
              className="btn-secondary whitespace-nowrap cursor-pointer"
            >
              Reset Filters
            </button>
          )}

          {/* Results count */}
          <span className="text-sm text-text-secondary ml-auto">
            {loading ? 'Loading...' : `${filteredTasks.length} tasks`}
          </span>
        </div>
      </div>

      {/* Tasks List */}
      <div className="card no-hover">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-text-primary">All Cleanup Tasks</h2>
          <OfficerGuard>
            <button
              onClick={() => router.push('/dashboard/cleanup-tasks/create')}
              className="btn-primary"
            >
              Create Custom Task
            </button>
          </OfficerGuard>
        </div>
        {loading ? (
          <div className="space-y-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <colgroup>
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '35%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '25%' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Title</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Description</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Created</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="py-3 px-4"><SkeletonLine className="h-4 w-32" /></td>
                      <td className="py-3 px-4"><SkeletonLine className="h-4 w-48" /></td>
                      <td className="py-3 px-4"><SkeletonLine className="h-4 w-24" /></td>
                      <td className="py-3 px-4"><SkeletonLine className="h-5 w-16" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <p className="text-text-muted">No cleanup tasks match your filters</p>
        ) : (
          <>
            <div className="overflow-x-auto mb-6">
              <table className="w-full">
                <colgroup>
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '35%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '25%' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Title</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Description</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Created</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTasks.map((task) => (
                    <tr
                      key={task.id}
                      className="border-b border-border cursor-pointer"
                      onClick={() => handleRowClick(task.id)}
                    >
                      <td className="py-3 px-4">
                        <span className="font-medium text-text-primary">{task.title}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-text-secondary line-clamp-2 max-w-xs">{task.description}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-text-muted">{new Date(task.created_at).toLocaleDateString()}</span>
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <p className="text-sm text-text-muted">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredTasks.length)} of {filteredTasks.length} tasks
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 rounded ${currentPage === pageNum ? 'btn-primary' : 'btn-secondary'}`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
