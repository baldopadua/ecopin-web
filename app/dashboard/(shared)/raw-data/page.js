'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { fetchPublicReports, fetchIssueTypes, fetchCleanupTasks } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import useTablePageSize from '@/components/ui/useTablePageSize'
import StatusBadge from '@/components/ui/StatusBadge'
import { useUser } from '@/components/auth/UserContext'
import { Wrench, ClipboardCheck } from 'lucide-react'
import { reportDiagnostic } from '@/lib/diagnostics.mjs'
import { subscribeSession } from '@/lib/auth-token.mjs'

export default function ReportsPage() {
  const user = useUser()
  const [reports, setReports] = useState([])
  const [filteredReports, setFilteredReports] = useState([])
  const [issueTypes, setIssueTypes] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [validationFilter, setValidationFilter] = useState('all')

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const { containerRef, pageSize: itemsPerPage } = useTablePageSize({ resetKey: `${searchQuery}|${typeFilter}|${statusFilter}|${validationFilter}` })

  useEffect(() => {
    Promise.all([
      fetchPublicReports(),
      fetchIssueTypes(),
      fetchCleanupTasks().catch(err => {
        reportDiagnostic('warn', 'tasks', 'Failed to fetch tasks for raw data:', err)
        return []
      })
    ]).then(([reportsData, typesData, tasksData]) => {
      setReports(reportsData || [])
      setFilteredReports(reportsData || [])
      setIssueTypes(typesData || [])
      setTasks(tasksData || [])
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeSession(() => {
      fetchCleanupTasks().then(t => {
        if (Array.isArray(t) && t.length > 0) setTasks(t)
      }).catch(() => {})
    })
    return () => {
      unsubscribe?.()
    }
  }, [])

  // Apply filters
  useEffect(() => {
    let filtered = reports

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r =>
        (r.title && r.title.toLowerCase().includes(query)) ||
        (r.description && r.description.toLowerCase().includes(query))
      )
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(r => r.issue_type === typeFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter)
    }

    if (validationFilter !== 'all') {
      if (validationFilter === 'pending') {
        // Include both pending and manual_review when filtering by pending
        filtered = filtered.filter(r => 
          (r.validation_status || '').toLowerCase() === 'pending' || 
          (r.validation_status || '').toLowerCase() === 'manual_review'
        )
      } else if (validationFilter === 'manual_review') {
        filtered = filtered.filter(r => (r.validation_status || '').toLowerCase() === 'manual_review')
      } else {
        filtered = filtered.filter(r => (r.validation_status || '').toLowerCase() === validationFilter.toLowerCase())
      }
    }

    setFilteredReports(filtered)
    setCurrentPage(1) // Reset to page 1 when filters change
  }, [searchQuery, typeFilter, statusFilter, validationFilter, reports])

  // Calculate pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage)
  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages))
  const startIndex = (safeCurrentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedReports = filteredReports.slice(startIndex, endIndex)

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleRowClick = (report) => {
    router.push(`/dashboard/raw-data/${report.id}`)
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setTypeFilter('all')
    setStatusFilter('all')
    setValidationFilter('all')
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  // Map reports to matching tasks
  const reportTaskMap = useMemo(() => {
    const map = {}
    if (!tasks || tasks.length === 0) return map

    const activeTasks = tasks.filter(t => t.status !== 'cancelled')

    reports.forEach(report => {
      const reportId = String(report.id)
      const clusterId = report.cluster_id ? String(report.cluster_id) : null
      const directTaskId = report.cleanup_task_id ? String(report.cleanup_task_id) : null

      if (directTaskId) {
        const found = activeTasks.find(t => String(t.id) === directTaskId)
        map[report.id] = found || { id: directTaskId }
        return
      }

      const byReportId = activeTasks.find(t => 
        (Array.isArray(t.report_ids) && t.report_ids.some(id => String(id) === reportId)) ||
        (Array.isArray(t.report_sequence) && t.report_sequence.some(id => String(id) === reportId)) ||
        (Array.isArray(t.satellite_report_ids) && t.satellite_report_ids.some(id => String(id) === reportId)) ||
        (Array.isArray(t.reports) && t.reports.some(r => String(r.id || r) === reportId))
      )
      if (byReportId) {
        map[report.id] = byReportId
        return
      }

      if (clusterId) {
        const byCluster = activeTasks.find(t => 
          String(t.cluster_id) === clusterId ||
          (Array.isArray(t.cluster_ids) && t.cluster_ids.some(cid => String(cid) === clusterId))
        )
        if (byCluster) {
          map[report.id] = byCluster
        }
      }
    })

    return map
  }, [reports, tasks])

  const tableColumns = useMemo(() => {
    const isStaff = ['officer', 'admin'].includes(user?.role)
    const cols = [
      { 
        key: 'title', 
        label: 'Title', 
        width: isStaff ? '18%' : '25%',
        render: (value) => (
          <span className="font-medium text-text-primary">{value}</span>
        )
      },
      { 
        key: 'issue_type', 
        label: 'Issue Type', 
        width: isStaff ? '14%' : '20%',
        render: (value) => (
          <span className="text-sm text-text-secondary">{value || 'N/A'}</span>
        )
      },
      { 
        key: 'status', 
        label: 'Report Status', 
        width: isStaff ? '12%' : '14%',
        render: (value) => (
          <StatusBadge status={value} type="report" />
        )
      },
      { 
        key: 'validation_status', 
        label: 'Review Status', 
        width: isStaff ? '12%' : '14%',
        render: (value) => (
          <StatusBadge status={value} type="validation" />
        )
      },
      { 
        key: 'created_at', 
        label: 'Created', 
        width: isStaff ? '11%' : '15%',
        render: (value) => (
          <span className="text-sm text-text-muted">{formatDate(value)}</span>
        )
      },
      { 
        key: 'stage', 
        label: 'Operational Stage', 
        width: isStaff ? '11%' : '12%',
        render: (value) => (
          <StatusBadge status={value} type="lifecycle" />
        )
      }
    ]

    if (isStaff) {
      cols.push({
        key: 'actions',
        label: 'Action',
        width: '22%',
        render: (_, row) => {
          const existingTask = reportTaskMap[row.id]
          if (existingTask) {
            return (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/dashboard/officer/operations/${existingTask.id}`)
                }}
                className="btn-primary inline-flex items-center flex-nowrap shrink-0 gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium !bg-[#059669] !text-white hover:!bg-[#047857] transition-colors whitespace-nowrap"
                aria-label={`View dispatched task for ${row.title || 'report'}`}
                title="View Dispatched Task"
              >
                <ClipboardCheck size={14} className="shrink-0" aria-hidden="true" />
                <span>View Dispatched Task</span>
              </button>
            )
          }

          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/dashboard/officer/operations/create?preselect=${row.cluster_id || row.id}`)
              }}
              className="btn-primary inline-flex items-center flex-nowrap shrink-0 gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium !bg-[#0052cc] !text-white hover:!bg-[#003d99] transition-colors whitespace-nowrap"
              aria-label={`Dispatch crew for ${row.title || 'report'}`}
              title="Dispatch Field Crew"
            >
              <Wrench size={14} className="shrink-0" aria-hidden="true" />
              <span>Dispatch</span>
            </button>
          )
        }
      })
    }

    return cols
  }, [user?.role, reportTaskMap, router])

  return (
    <div className="workspace-page">
      <PageHeader 
        title="Raw Data"
        subtitle="View and manage environmental reports"
        breadcrumbs={[
          { 
            label: 'Dashboard', 
            href: user?.role === 'officer' ? '/dashboard/officer' : 
                  user?.role === 'field_crew' ? '/dashboard/field-crew' : 
                  '/dashboard' 
          },
          { label: 'Raw Data' }
        ]}
      />

      {/* Search and Filters */}
      <FilterBar
        searchPlaceholder="Search by title or description..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          {
            label: 'All Types',
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { value: 'all', label: 'All Types' },
              ...issueTypes.map(type => ({ value: type, label: type }))
            ]
          },
          {
            label: 'Report Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'all', label: 'All Report Status' },
              { value: 'unresolved', label: 'Unresolved' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' },
              { value: 'pending_owner_consent', label: 'Pending Owner Consent' },
              { value: 'waiting_for_feedback', label: 'Waiting for Feedback' }
            ]
          },
          {
            label: 'Review Status',
            value: validationFilter,
            onChange: setValidationFilter,
            options: [
              { value: 'all', label: 'All Review Status' },
              { value: 'automatically_valid', label: 'Automatically Valid' },
              { value: 'manual_review', label: 'Manual Review' },
              { value: 'validated', label: 'Validated' },
              { value: 'rejected', label: 'Rejected' }
            ]
          }
        ]}
        onReset={handleResetFilters}
        resultsCount={filteredReports.length}
        loading={loading}
        sticky={false}
      />

      {/* Reports List */}
      <div ref={containerRef} className="workspace-scroll">
      <DataTable
        columns={tableColumns}
        data={paginatedReports}
        loading={loading}
        emptyMessage="No reports match your filters"
        onRowClick={handleRowClick}
      />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          itemsPerPage={itemsPerPage}
          totalItems={filteredReports.length}
        />
      )}
    </div>
  )
}
