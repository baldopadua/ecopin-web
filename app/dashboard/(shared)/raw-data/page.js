'use client'
import { Suspense, useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchIssueTypes } from '@/lib/api'
import { useDashboardReports, useDashboardTasks } from '@/components/context/DashboardQueryProvider'
import PageHeader from '@/components/layout/PageHeader'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import useTablePageSize from '@/components/ui/useTablePageSize'
import StatusBadge from '@/components/ui/StatusBadge'
import { useUser } from '@/components/auth/UserContext'
import { Wrench, ClipboardCheck } from 'lucide-react'

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

function RawDataContent() {
  const user = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const reportsQuery = useDashboardReports()
  const tasksQuery = useDashboardTasks()

  const reports = useMemo(() => reportsQuery.data || [], [reportsQuery.data])
  const tasks = useMemo(() => Array.isArray(tasksQuery.data) ? tasksQuery.data : (tasksQuery.data?.tasks || []), [tasksQuery.data])
  const [issueTypes, setIssueTypes] = useState([])
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
  const { containerRef, pageSize: itemsPerPage } = useTablePageSize({ resetKey: `${searchQuery}|${typeFilter}|${statusFilter}|${validationFilter}` })

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

  // Apply filters
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
        label: 'Issue type',
        width: isStaff ? '14%' : '20%',
        render: (value) => (
          <span className="text-sm text-text-secondary">{value || 'N/A'}</span>
        )
      },
      { 
        key: 'status', 
        label: 'Report status',
        width: isStaff ? '12%' : '14%',
        render: (value) => (
          <StatusBadge status={value} type="report" />
        )
      },
      { 
        key: 'validation_status', 
        label: 'Review status',
        width: isStaff ? '12%' : '14%',
        render: (value, row) => {
          const effective = value || (row?.manual_review_id ? 'manual_review' : 'pending')
          return <StatusBadge status={effective} type="validation" />
        }
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
        label: 'Operational stage',
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
              className="btn-primary inline-flex items-center flex-nowrap shrink-0 gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium !bg-[#0052cc] !text-white hover:!bg-[#003d99] transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:!bg-[#0052cc]"
              aria-label={isManualReview ? `Cannot dispatch ${row.title || 'report'} - manual review required` : `Dispatch crew for ${row.title || 'report'}`}
              title={isManualReview ? "Manual review required before dispatch" : "Dispatch Field Crew"}
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
            onChange: (val) => { setStatusFilter(val); setCurrentPage(1) },
            options: [
              { value: 'all', label: 'All Report Status' },
              { value: 'overdue', label: 'Overdue (SLA Risk)' },
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
            onChange: (val) => { setValidationFilter(val); setCurrentPage(1) },
            options: [
              { value: 'all', label: 'All Review Status' },
              { value: 'approved', label: 'Approved' },
              { value: 'manual_review', label: 'Manual Review' },
              { value: 'pending', label: 'Pending AI Validation' },
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

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-6" role="status">Loading raw data…</div>}>
      <RawDataContent />
    </Suspense>
  )
}
