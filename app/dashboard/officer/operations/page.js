'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCleanupTasks } from '@/lib/api'
import { getFieldCrews } from '@/lib/api/optimization'
import PageHeader from '@/components/layout/PageHeader'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import useTablePageSize from '@/components/ui/useTablePageSize'
import StatusBadge from '@/components/ui/StatusBadge'
import { OfficerGuard } from '@/components/auth/RequireRole'
import { Plus } from 'lucide-react'
import { reportDiagnostic } from '../../../../lib/diagnostics.mjs'
import styles from './Operations.module.css'

export default function CleanupTasksPage() {
  const [tasks, setTasks] = useState([])
  const [crews, setCrews] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('status') || 'all'
    }
    return 'all'
  })

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const { containerRef, pageSize: itemsPerPage } = useTablePageSize({ resetKey: `${searchQuery}|${statusFilter}` })

  useEffect(() => {
    let active = true
    Promise.allSettled([fetchCleanupTasks(), getFieldCrews()])
      .then(([taskResult, crewResult]) => {
        if (!active) return
        if (taskResult.status === 'fulfilled') {
          const data = taskResult.value
          setTasks(Array.isArray(data) ? data : (data?.tasks || []))
        } else {
          reportDiagnostic('error', 'dispatch', 'Failed to load cleanup tasks:', taskResult.reason)
        }
        if (crewResult.status === 'fulfilled') setCrews(crewResult.value || [])
        else reportDiagnostic('error', 'dispatch', 'Failed to load crew names:', crewResult.reason)
      })
      .catch(error => {
        if (!active) return
        reportDiagnostic('error', 'dispatch', 'Failed to load cleanup tasks:', error)
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const crewNames = useMemo(() => new Map(crews.map(crew => [crew.id, crew.name])), [crews])

  // Apply filters with useMemo
  const filteredTasks = useMemo(() => {
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

    return filtered
  }, [searchQuery, statusFilter, tasks])

  // Calculate pagination
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * itemsPerPage
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + itemsPerPage)

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleRowClick = (task) => {
    router.push(`/dashboard/officer/operations/${task.id}`)
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setCurrentPage(1)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className={`workspace-page ${styles.page}`}>
      <PageHeader
        title="Operations"
        subtitle="Manage and track cleanup tasks"
        breadcrumbs={[
          { label: 'Officer', href: '/dashboard/officer' },
          { label: 'Operations' }
        ]}
      >
        <OfficerGuard>
          <button
            type="button"
            onClick={() => router.push('/dashboard/officer/operations/create')}
            className={styles.createButton}
          >
            <Plus size={18} aria-hidden="true" />
            <span>Create cleanup task</span>
          </button>
        </OfficerGuard>
      </PageHeader>

      {/* Search and Filters */}
      <FilterBar
        searchPlaceholder="Search by title or description..."
        searchValue={searchQuery}
        onSearchChange={val => { setSearchQuery(val); setCurrentPage(1) }}
        filters={[
          {
            label: 'All status',
            value: statusFilter,
            onChange: val => { setStatusFilter(val); setCurrentPage(1) },
            options: [
              { value: 'all', label: 'All statuses' },
              { value: 'created', label: 'Created' },
              { value: 'pending', label: 'Pending' },
              { value: 'in_progress', label: 'In progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' }
            ]
          }
        ]}
        onReset={handleResetFilters}
        resultsCount={filteredTasks.length}
        loading={loading}
        sticky={false}
      />


          {/* Tasks List */}
          <div className={`workspace-fill ${styles.tableWorkspace}`}>
            <div ref={containerRef} className={styles.tableViewport}>
              <DataTable
                columns={[
                  { key: 'title', label: 'Title', width: '22%' },
                  {
                    key: 'description',
                    label: 'Description',
                    width: '26%',
                    render: (value) => (
                      <span className="text-sm text-text-secondary line-clamp-2 max-w-xs">{value || '—'}</span>
                    )
                  },
                  {
                    key: 'assigned_field_crew_id',
                    label: 'Assigned crew',
                    width: '20%',
                    render: (value, task) => {
                      const ids = value ? [value] : (task.assigned_crew_ids || [])
                      const names = [...new Set(ids.map(id => crewNames.get(id)).filter(Boolean))]
                      return (
                        <span className={`text-sm font-medium whitespace-normal ${names.length ? 'text-accent-green' : 'text-text-muted'}`}>
                          {names.length ? names.join(', ') : ids.length ? 'Crew name unavailable' : 'Unassigned'}
                        </span>
                      )
                    }
                  },
                  {
                    key: 'created_at',
                    label: 'Created',
                    width: '14%',
                    render: (value) => (
                      <span className="text-sm text-text-muted">{formatDate(value)}</span>
                    )
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    width: '18%',
                    render: (value) => (
                      <StatusBadge status={value} type="task" />
                    )
                  }
                ]}
                data={paginatedTasks}
                loading={loading}
                emptyMessage="No cleanup tasks match your filters."
                onRowClick={handleRowClick}
                rowActionLabel={(task) => `Open ${task.title || 'task'} details`}
                className={styles.tableContainer}
                caption="Cleanup tasks"
              />
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                itemsPerPage={itemsPerPage}
                totalItems={filteredTasks.length}
                className={styles.pagination}
              />
            )}
          </div>
    </div>
  )
}

