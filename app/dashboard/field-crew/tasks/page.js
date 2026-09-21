'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCleanupTasks } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import { FieldCrewGuard } from '@/components/auth/RequireRole'

export default function FieldCrewTasksPage() {
  const [tasks, setTasks] = useState([])
  const [filteredTasks, setFilteredTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [assignmentFilter, setAssignmentFilter] = useState('assigned_to_me')

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Get current user ID from localStorage
  const currentUserId = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}').id : null

  useEffect(() => {
    const loadTasks = async () => {
      try {
        // Always fetch all tasks and filter client-side to ensure reliability
        const data = await fetchCleanupTasks(false)
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

    if (assignmentFilter === 'assigned_to_me') {
      filtered = filtered.filter(t => 
        t.assigned_crew_ids && t.assigned_crew_ids.includes(currentUserId)
      )
    }

    setFilteredTasks(filtered)
    setCurrentPage(1)
  }, [searchQuery, statusFilter, assignmentFilter, tasks, currentUserId])

  // Calculate pagination
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex)

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleRowClick = (task) => {
    router.push(`/dashboard/field-crew/operations/${task.id}`)
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setAssignmentFilter('all')
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const isAssignedToMe = (task) => {
    return task.assigned_crew_ids && task.assigned_crew_ids.includes(currentUserId)
  }

  return (
    <FieldCrewGuard>
      <div className="p-8">
        <PageHeader
          title="Cleanup Tasks"
          subtitle="Manage and track cleanup tasks"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard/field-crew' },
            { label: 'Cleanup Tasks' }
          ]}
        />

        {/* Search and Filters */}
        <FilterBar
          searchPlaceholder="Search by title or description..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          filters={[
            {
              label: 'All Status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' }
              ]
            },
            {
              label: 'All Tasks',
              value: assignmentFilter,
              onChange: setAssignmentFilter,
              options: [
                { value: 'all', label: 'All Tasks' },
                { value: 'assigned_to_me', label: 'Assigned to Me' }
              ]
            }
          ]}
          onReset={handleResetFilters}
          resultsCount={filteredTasks.length}
          loading={loading}
        />

        {/* Tasks List */}
        <DataTable
          columns={[
            { key: 'title', label: 'Title', width: '20%' },
            {
              key: 'description',
              label: 'Description',
              width: '25%',
              render: (value) => (
                <span className="text-sm text-text-secondary line-clamp-2 max-w-xs">{value || '—'}</span>
              )
            },
            {
              key: 'assigned_crew_ids',
              label: 'Assigned',
              width: '20%',
              render: (value) => {
                const count = value && value.length > 0 ? value.length : 0
                return (
                  <span className={`text-sm font-medium ${count > 0 ? 'text-accent-green' : 'text-text-muted'}`}>
                    {count > 0 ? `${count} crew member${count > 1 ? 's' : ''}` : 'Unassigned'}
                  </span>
                )
              }
            },
            {
              key: 'created_at',
              label: 'Created',
              width: '15%',
              render: (value) => (
                <span className="text-sm text-text-muted">{formatDate(value)}</span>
              )
            },
            {
              key: 'status',
              label: 'Status',
              width: '20%',
              render: (value) => (
                <StatusBadge status={value} type="task" />
              )
            }
          ]}
          data={paginatedTasks}
          loading={loading}
          emptyMessage="No cleanup tasks match your filters"
          onRowClick={handleRowClick}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            itemsPerPage={itemsPerPage}
            totalItems={filteredTasks.length}
            className="mt-6"
          />
        )}
      </div>
    </FieldCrewGuard>
  )
}