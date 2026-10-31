'use client'
import { Suspense, useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchIssueTypes, fetchReportEvidence, fetchAgencyResponses } from '@/lib/api'
import ReportDetailModal from '@/components/reports/ReportDetailModal'
import { useDashboardReports, useDashboardTasks } from '@/components/context/DashboardQueryProvider'
import PageHeader from '@/components/layout/PageHeader'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import useTablePageSize from '@/components/ui/useTablePageSize'
import StatusBadge from '@/components/ui/StatusBadge'
import { OfficerGuard } from '@/components/auth/RequireRole'
import { Target, Wrench, AlertTriangle, ClipboardCheck } from 'lucide-react'
import styles from './Reports.module.css'

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

function OfficerReportsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reportsQuery = useDashboardReports()
  const tasksQuery = useDashboardTasks()

  const reports = useMemo(() => reportsQuery.data || [], [reportsQuery.data])
  const tasks = useMemo(() => Array.isArray(tasksQuery.data) ? tasksQuery.data : (tasksQuery.data?.tasks || []), [tasksQuery.data])
  const [issueTypes, setIssueTypes] = useState([])
  const [selectedReportId, setSelectedReportId] = useState(null)
  const [selectedEvidence, setSelectedEvidence] = useState([])
  const [selectedResponses, setSelectedResponses] = useState([])
  const loading = reportsQuery.isPending || tasksQuery.isPending

  const getTargetStatus = useCallback(() => {
    const rawStatus = (searchParams.get('status') || searchParams.get('filter') || '').toLowerCase().trim()
    if (rawStatus === 'unresolved') return 'unresolved'
    if (rawStatus === 'overdue' || rawStatus === 'sla' || rawStatus === 'sla_risk') return 'overdue'
    if (['in_progress', 'resolved', 'closed', 'pending_owner_consent', 'waiting_for_feedback'].includes(rawStatus)) return rawStatus
    return 'all'
  }, [searchParams])

  const getTargetValidation = useCallback(() => {
    const rawVal = (searchParams.get('validation') || searchParams.get('review_status') || '').toLowerCase().trim()
    const rawFilter = (searchParams.get('filter') || searchParams.get('status') || '').toLowerCase().trim()
    if (rawVal === 'manual_review' || rawFilter === 'manual_review' || rawVal === 'manual review' || rawVal === 'pending_manual_review') {
      return 'manual_review'
    }
    if (['pending', 'pending_ai_validation', 'approved', 'rejected'].includes(rawVal)) return rawVal
    return 'all'
  }, [searchParams])

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState(getTargetStatus)
  const [validationFilter, setValidationFilter] = useState(getTargetValidation)

  useEffect(() => {
    setStatusFilter(getTargetStatus())
    setValidationFilter(getTargetValidation())
    setCurrentPage(1)
  }, [getTargetStatus, getTargetValidation])

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const { containerRef, pageSize: itemsPerPage } = useTablePageSize({ rowHeight: 72, resetKey: `${searchQuery}|${typeFilter}|${statusFilter}|${validationFilter}` })

  useEffect(() => {
    let active = true
    fetchIssueTypes().then(typesData => {
      if (!active) return
      setIssueTypes(typesData || [])
    }).catch(() => {})
    return () => {
      active = false
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
      const targetStatus = statusFilter.toLowerCase().trim()
      filtered = filtered.filter(r => (r.status || '').toLowerCase().trim() === targetStatus)
    }

    if (validationFilter !== 'all') {
      const targetFilter = validationFilter.toLowerCase().trim()
      if (targetFilter === 'pending' || targetFilter === 'pending_ai_validation') {
        filtered = filtered.filter(r => {
          const v = (r.validation_status || '').toLowerCase().trim()
          return v === 'pending' || v === 'pending_ai_validation'
        })
      } else if (targetFilter === 'manual_review') {
        filtered = filtered.filter(r => {
          const v = (r.validation_status || '').toLowerCase().trim()
          return v === 'manual_review' || v === 'manual review' || v === 'pending_manual_review' || Boolean(r.manual_review_id)
        })
      } else if (targetFilter === 'approved' || targetFilter === 'validated' || targetFilter === 'automatically_valid') {
        filtered = filtered.filter(r => {
          const v = (r.validation_status || '').toLowerCase().trim()
          return v === 'approved' || v === 'validated' || v === 'automatically_valid'
        })
      } else {
        filtered = filtered.filter(r => (r.validation_status || '').toLowerCase().trim() === targetFilter)
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
    setSelectedReportId(report.id)
    setSelectedEvidence([])
    setSelectedResponses([])
    fetchReportEvidence(report.id).then(evidence => setSelectedEvidence(evidence || [])).catch(() => {})
    fetchAgencyResponses(report.id).then(responses => setSelectedResponses(responses || [])).catch(() => {})
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
      width: '18%',
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
      width: '12%',
      render: (value) => (
        <span className="text-text-secondary capitalize">
          {value ? value.replaceAll('_', ' ') : '—'}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      width: '12%',
      render: (value, row) => {
        return <StatusBadge status={value} type="report" />
      }
    },
    { 
      key: 'validation_status', 
      label: 'Review status',
      width: '14%',
      render: (value, row) => {
        const effective = value || (row?.manual_review_id ? 'manual_review' : 'pending')
        return <StatusBadge status={effective} type="validation" />
      }
    },
    { 
      key: 'cluster_id', 
      label: 'Cluster', 
      width: '11%',
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
      width: '21%',
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

        const validationStatus = (row.validation_status || '').toLowerCase().trim()
        const isManualReview = validationStatus === 'manual_review' ||
          validationStatus === 'manual review' ||
          validationStatus === 'pending_manual_review' ||
          Boolean(row.manual_review_id)

        return (
          <button 
             type="button"
             disabled={isManualReview}
             onClick={(e) => {
               e.stopPropagation()
               if (isManualReview) return
               router.push(`/dashboard/officer/operations/create?preselect=${row.cluster_id || row.id}`)
             }}
             onPointerDown={(e) => e.stopPropagation()}
             className={styles.dispatchButton}
             aria-label={isManualReview ? `Cannot dispatch ${row.title || 'report'} - manual review required` : `Dispatch crew for ${row.title || 'report'}`}
             title={isManualReview ? "Manual review required before dispatch" : "Dispatch Field Crew"}
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
      width: '12%',
      render: (value) => (
        <span className="text-text-muted">{formatDate(value)}</span>
      )
    }
  ]

  return (
    <div className={`workspace-page ${styles.page}`}>
        <PageHeader 
          title="Reports directory"
          subtitle="View and manage raw environmental data and create operations."
          breadcrumbs={[
            { label: 'Officer', href: '/dashboard/officer' },
            { label: 'Reports' }
          ]}
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
        />

        {/* Reports List */}
        <div className={`workspace-fill ${styles.tableWorkspace}`}>
           <div ref={containerRef} className={styles.tableViewport}>
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
           </div>

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
        {selectedReportId && (
          <ReportDetailModal
            report={reports.find(r => r.id === selectedReportId)}
            evidence={selectedEvidence}
            agencyResponses={selectedResponses}
            onClose={() => setSelectedReportId(null)}
          />
        )}
      </div>
  )
}

export default function OfficerReportsPage() {
  return (
    <OfficerGuard>
      <Suspense fallback={<div className="workspace-page" role="status">Loading reports…</div>}>
        <OfficerReportsContent />
      </Suspense>
    </OfficerGuard>
  )
}
