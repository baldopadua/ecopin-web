'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchPublicReports, fetchIssueTypes, fetchCleanupTasks } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import { FieldCrewGuard } from '@/components/auth/RequireRole'
import { reportDiagnostic } from '../../../../lib/diagnostics.mjs';

export default function FieldCrewReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState([])
  const [filteredReports, setFilteredReports] = useState([])
  const [issueTypes, setIssueTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [reportTaskMap, setReportTaskMap] = useState({})

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [validationFilter, setValidationFilter] = useState('all')

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  useEffect(() => {
    Promise.all([
      fetchPublicReports(),
      fetchCleanupTasks(true), // Only fetch assigned tasks
      fetchIssueTypes()
    ]).then(([allReports, tasksData, typesData]) => {
      const allowedClusterIds = new Set()
      const allowedReportIds = new Set()
      const taskMap = {}

      tasksData.forEach(task => {
        if (task.cluster_id) {
          allowedClusterIds.add(String(task.cluster_id))
        }
        if (task.report_ids && Array.isArray(task.report_ids)) {
          task.report_ids.forEach(rId => allowedReportIds.add(String(rId)))
        }
        if (task.reports) {
          task.reports.forEach(r => {
            if (r.cluster_id) allowedClusterIds.add(String(r.cluster_id))
            allowedReportIds.add(String(r.id))
          })
        }
      })

      const assignedReports = allReports.filter(report => {
        const cMatch = report.cluster_id && allowedClusterIds.has(String(report.cluster_id))
        const rMatch = allowedReportIds.has(String(report.id))
        return cMatch || rMatch
      })

      // Map report to task for routing
      assignedReports.forEach(report => {
        const matchingTask = tasksData.find(t => 
          (t.cluster_id && String(t.cluster_id) === String(report.cluster_id)) ||
          (t.report_ids && t.report_ids.map(String).includes(String(report.id))) ||
          (t.reports && t.reports.some(r => String(r.id) === String(report.id)))
        )
        if (matchingTask) {
          taskMap[report.id] = matchingTask.id
        }
      })

      // Sort by newest first
      assignedReports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      
      setReportTaskMap(taskMap)
      setReports(assignedReports)
      setFilteredReports(assignedReports)
      setIssueTypes(typesData)
      setLoading(false)
    }).catch(error => {
      reportDiagnostic('error', 'media', "Failed to load field crew raw data:", error)
      setLoading(false)
    })
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

    setFilteredReports(filtered)
    setCurrentPage(1)
  }, [searchQuery, typeFilter, statusFilter, validationFilter, reports])

  // Calculate pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedReports = filteredReports.slice(startIndex, endIndex)

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleRowClick = (report) => {
    const taskId = reportTaskMap[report.id]
    if (taskId) {
      router.push(`/dashboard/field-crew/operations/${taskId}`)
    } else {
      reportDiagnostic('warn', 'media', "No assigned task found for report", report.id)
    }
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

  return (
    <FieldCrewGuard>
      <div className="p-8">
        <PageHeader
          title="Reports"
          subtitle="View and manage environmental reports"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard/field-crew' },
            { label: 'Reports' }
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
              label: 'All Status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: 'all', label: 'All Status' },
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
        />

        {/* Reports List */}
        <DataTable
          rowClassName="hover:border-l-4 hover:border-l-[#ccff00]"
          columns={[
            { 
              key: 'title', 
              label: 'Title', 
              width: '25%',
              render: (value) => (
                <span className="font-medium text-text-primary">{value}</span>
              )
            },
            { 
              key: 'issue_type', 
              label: 'Issue type',
              width: '20%',
              render: (value) => (
                <span className="text-sm text-text-secondary">{value || 'N/A'}</span>
              )
            },
            { 
              key: 'status', 
              label: 'Status', 
              width: '15%',
              render: (value) => (
                <StatusBadge status={value} type="report" />
              )
            },
            { 
              key: 'validation_status', 
              label: 'Review status',
              width: '15%',
              render: (value, row) => {
                const effective = value || (row?.manual_review_id ? 'manual_review' : 'pending')
                return <StatusBadge status={effective} type="validation" />
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
              key: 'stage', 
              label: 'Stage', 
              width: '10%',
              render: (value) => (
                <StatusBadge status={value} type="lifecycle" />
              )
            }
          ]}
          data={paginatedReports}
          loading={loading}
          emptyMessage="No available reports match your filters"
          onRowClick={handleRowClick}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            itemsPerPage={itemsPerPage}
            totalItems={filteredReports.length}
            className="mt-6"
          />
        )}
      </div>
    </FieldCrewGuard>
  )
}
