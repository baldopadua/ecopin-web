'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { fetchPublicReports, fetchIssueTypes, fetchCleanupTasks } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import { OfficerGuard } from '@/components/auth/RequireRole'
import { Target, Wrench, AlertTriangle, Clock, ClipboardCheck } from 'lucide-react'
import { reportDiagnostic } from '@/lib/diagnostics.mjs'
import styles from './Reports.module.css'

import { subscribeSession } from '@/lib/auth-token.mjs'

const terminalStatuses = ['resolved', 'closed', 'completed', 'rejected']

function isReportOverdue(report) {
  if (!report) return false
  const normalizedStatus = (report.status || '').toLowerCase()
  if (terminalStatuses.includes(normalizedStatus)) return false

  if (report.is_overdue) return true
  if (report.deadline_at) {
    return new Date() > new Date(report.deadline_at)
  }
  if (report.created_at) {
    const diffHours = (new Date() - new Date(report.created_at)) / (1000 * 60 * 60)
    return diffHours > 48
  }
  return false
}

export default function OfficerReportsPage() {
  const [reports, setReports] = useState([])
  const [tasks, setTasks] = useState([])
  const [issueTypes, setIssueTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('filter') === 'overdue') return 'overdue'
    }
    return 'all'
  })
  const [validationFilter, setValidationFilter] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('filter') === 'manual_review') return 'manual_review'
    }
    return 'all'
  })

  // Pagination states - 5 items per page to comfortably fit screen without scrolling
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  useEffect(() => {
    let active = true
    Promise.all([
      fetchPublicReports(),
      fetchIssueTypes(),
      fetchCleanupTasks().catch(err => {
        reportDiagnostic('warn', 'tasks', 'Failed to fetch tasks for reports:', err)
        return []
      })
    ]).then(([reportsData, typesData, tasksData]) => {
      if (!active) return
      setReports(reportsData || [])
      setIssueTypes(typesData || [])
      setTasks(tasksData || [])
      setLoading(false)
    }).catch(() => {
      if (!active) return
      setLoading(false)
    })
    return () => {
      active = false
    }
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

  // Apply filters with useMemo
  const filteredReports = useMemo(() => {
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

    if (statusFilter === 'overdue') {
      filtered = filtered.filter(isReportOverdue)
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter)
    }

    if (validationFilter !== 'all') {
      if (validationFilter === 'manual_review') {
        filtered = filtered.filter(r => (r.validation_status || '').toLowerCase() === 'manual_review')
      } else {
        filtered = filtered.filter(r => (r.validation_status || '').toLowerCase() === validationFilter.toLowerCase())
      }
    }

    return filtered
  }, [searchQuery, typeFilter, statusFilter, validationFilter, reports])

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
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
    if (!dateString) return '—'
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

      // 1. Direct cleanup_task_id on report
      if (directTaskId) {
        const found = activeTasks.find(t => String(t.id) === directTaskId)
        map[report.id] = found || { id: directTaskId }
        return
      }

      // 2. Task containing this report in report_ids, report_sequence, satellite_report_ids, or reports array
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

      // 3. Task linked to report's cluster (cluster_id scalar or cluster_ids array)
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

  const tableColumns = [
    { 
      key: 'title', 
      label: 'Title', 
      width: '22%',
      render: (value, row) => {
        const overdue = isReportOverdue(row)
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className={styles.reportTitle}>{value}</span>
            {overdue && (
              <span className={styles.overdueBadge}>
                <AlertTriangle size={12} aria-hidden="true" />
                Overdue (SLA Risk)
              </span>
            )}
          </div>
        )
      }
    },
    { 
      key: 'issue_type', 
      label: 'Issue type', 
      width: '14%',
      render: (value) => (
        <span className="text-text-secondary capitalize">
          {value ? value.replaceAll('_', ' ') : '—'}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      width: '13%',
      render: (value, row) => {
        const overdue = isReportOverdue(row)
        return (
          <div className="flex flex-col gap-1 items-start">
            <StatusBadge status={value} type="report" />
            {overdue && (
              <span className={styles.overdueSub}>
                <Clock size={12} aria-hidden="true" /> Overdue
              </span>
            )}
          </div>
        )
      }
    },
    { 
      key: 'cluster_id', 
      label: 'Cluster', 
      width: '13%',
      render: (value) => value ? (
        <button 
           type="button"
           onClick={(e) => {
             e.stopPropagation()
             router.push(`/dashboard/officer/hotzone-intel/${value}`)
           }}
           className={styles.clusterButton}
           aria-label={`View cluster ${String(value).slice(0, 8)}`}
        >
          <Target size={14} aria-hidden="true" />
          <span>{String(value).slice(0, 8)}</span>
        </button>
      ) : <span className={styles.unassignedCluster}>Unassigned</span>
    },
    { 
      key: 'actions', 
      label: 'Action', 
      width: '24%',
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
               className={styles.viewDispatchedButton}
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
             className={styles.dispatchButton}
             aria-label={`Dispatch crew for ${row.title || 'report'}`}
             title="Dispatch Field Crew"
          >
            <Wrench size={14} className="shrink-0" aria-hidden="true" />
            <span>Dispatch</span>
          </button>
        )
      }
    },
    { 
      key: 'created_at', 
      label: 'Created', 
      width: '14%',
      render: (value) => (
        <span className="text-text-muted">{formatDate(value)}</span>
      )
    }
  ]

  return (
    <OfficerGuard>
      <div className={styles.page}>
        <PageHeader 
          title="Reports directory"
          subtitle="View and manage raw environmental data and create operations."
          breadcrumbs={[
            { label: 'Officer', href: '/dashboard/officer' },
            { label: 'Reports' }
          ]}
          className={styles.pageHeader}
        />

        {/* Search and Filters */}
        <FilterBar
          searchPlaceholder="Search by title or description..."
          searchValue={searchQuery}
          onSearchChange={val => { setSearchQuery(val); setCurrentPage(1) }}
          filters={[
            {
              label: 'All types',
              value: typeFilter,
              onChange: val => { setTypeFilter(val); setCurrentPage(1) },
              options: [
                { value: 'all', label: 'All types' },
                ...issueTypes.map(type => ({ value: type, label: type.replaceAll('_', ' ') }))
              ]
            },
            {
              label: 'Report status',
              value: statusFilter,
              onChange: val => { setStatusFilter(val); setCurrentPage(1) },
              options: [
                { value: 'all', label: 'All statuses' },
                { value: 'overdue', label: 'Overdue (SLA risk)' },
                { value: 'unresolved', label: 'Unresolved' },
                { value: 'in_progress', label: 'In progress' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'closed', label: 'Closed' },
                { value: 'pending_owner_consent', label: 'Pending owner consent' },
                { value: 'waiting_for_feedback', label: 'Waiting for feedback' }
              ]
            },
            {
              label: 'Review status',
              value: validationFilter,
              onChange: val => { setValidationFilter(val); setCurrentPage(1) },
              options: [
                { value: 'all', label: 'All review statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'pending_ai_validation', label: 'Pending AI validation' },
                { value: 'manual_review', label: 'Manual review' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' }
              ]
            }
          ]}
          onReset={handleResetFilters}
          resultsCount={filteredReports.length}
          loading={loading}
          sticky={false}
          className={styles.filterBar}
        />

        {/* Reports List */}
        <div className={styles.tableWorkspace}>
           <DataTable
             columns={tableColumns}
             data={paginatedReports}
             loading={loading}
             emptyMessage="No reports match your filters."
             onRowClick={handleRowClick}
             rowActionLabel={(report) => `Open ${report.title || 'report'} details`}
             className={styles.tableContainer}
             caption="Reports directory"
           />

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              itemsPerPage={itemsPerPage}
              totalItems={filteredReports.length}
              className={styles.pagination}
            />
          )}
        </div>
      </div>
    </OfficerGuard>
  )
}
