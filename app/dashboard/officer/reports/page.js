'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchPublicReports, fetchIssueTypes } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import { OfficerGuard } from '@/components/auth/RequireRole'
import { Target, Wrench, AlertTriangle, Clock } from 'lucide-react'

export default function OfficerReportsPage() {
  const [reports, setReports] = useState([])
  const [filteredReports, setFilteredReports] = useState([])
  const [issueTypes, setIssueTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [validationFilter, setValidationFilter] = useState('all')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('filter') === 'overdue') {
        setStatusFilter('overdue')
      } else if (params.get('filter') === 'manual_review') {
        setValidationFilter('manual_review')
      }
    }
  }, [])

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  useEffect(() => {
    Promise.all([
      fetchPublicReports(),
      fetchIssueTypes()
    ]).then(([reportsData, typesData]) => {
      setReports(reportsData)
      setFilteredReports(reportsData)
      setIssueTypes(typesData)
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

    if (statusFilter === 'overdue') {
      const now = new Date()
      filtered = filtered.filter(r => {
        if (r.is_overdue) return true;
        const created = new Date(r.created_at)
        const diffHours = (now - created) / (1000 * 60 * 60)
        return diffHours > 48
      })
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter)
    }

    if (validationFilter !== 'all') {
      if (validationFilter === 'manual_review') {
        filtered = filtered.filter(r => r.validation_status === 'manual_review' || r.validation_status === 'Manual_Review')
      } else {
        filtered = filtered.filter(r => r.validation_status === validationFilter)
      }
    }

    setFilteredReports(filtered)
    setCurrentPage(1)
  }, [searchQuery, typeFilter, statusFilter, validationFilter, reports])

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
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

  const isReportOverdue = (report) => {
    if (!report) return false
    const terminalStatuses = ['resolved', 'closed', 'completed', 'rejected']
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

  const tableColumns = [
    { 
      key: 'title', 
      label: 'Title', 
      width: '25%',
      render: (value, row) => {
        const overdue = isReportOverdue(row)
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="font-medium text-text-primary">{value}</span>
            {overdue && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 dark:border dark:border-red-800/60">
                <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
                Overdue (SLA Risk)
              </span>
            )}
          </div>
        )
      }
    },
    { 
      key: 'issue_type', 
      label: 'Issue Type', 
      width: '15%',
      render: (value) => (
        <span className="text-sm text-text-secondary">{value || 'N/A'}</span>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      width: '12%',
      render: (value, row) => {
        const overdue = isReportOverdue(row)
        return (
          <div className="flex flex-col gap-1 items-start">
            <StatusBadge status={value} type="report" />
            {overdue && (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-red-600 dark:text-red-400">
                <Clock className="w-2.5 h-2.5" /> Overdue
              </span>
            )}
          </div>
        )
      }
    },
    { 
      key: 'cluster_id', 
      label: 'Cluster', 
      width: '15%',
      render: (value, row) => value ? (
        <button 
           onClick={(e) => {
             e.stopPropagation()
             router.push(`/dashboard/officer/hotzone-intel/${value}`)
           }}
           className="flex items-center gap-1 text-xs font-mono bg-transparent px-2 py-1 border border-border hover:border-accent-green hover:text-accent-green transition-colors"
        >
          <Target className="w-3 h-3" /> {String(value).slice(0,8)}
        </button>
      ) : <span className="text-text-muted text-xs font-mono">Unassigned</span>
    },
    { 
      key: 'actions', 
      label: 'Action', 
      width: '15%',
      render: (_, row) => (
        <button 
           onClick={(e) => {
             e.stopPropagation()
             router.push(`/dashboard/officer/operations/create?preselect=${row.cluster_id || row.id}`)
           }}
           className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest bg-transparent px-3 py-1.5 border border-border dark:border-[#333333] hover:border-accent-green hover:text-accent-green transition-colors"
        >
          <Wrench className="w-3 h-3" /> Dispatch
        </button>
      )
    },
    { 
      key: 'created_at', 
      label: 'Created', 
      width: '15%',
      render: (value) => (
        <span className="text-sm text-text-muted">{formatDate(value)}</span>
      )
    }
  ]

  return (
    <OfficerGuard>
      <div className="p-8">
        <PageHeader 
          title="Reports Directory"
          subtitle="View and manage raw environmental data and create operations"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard/officer' },
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
              label: 'Report Status',
              value: statusFilter,
              onChange: setStatusFilter,
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
              onChange: setValidationFilter,
              options: [
                { value: 'all', label: 'All Review Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'pending_ai_validation', label: 'Pending AI Validation' },
                { value: 'manual_review', label: 'Manual Review' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' }
              ]
            }
          ]}
          onReset={handleResetFilters}
          resultsCount={filteredReports.length}
          loading={loading}
        />

        {/* Reports List */}
        <div className="flex flex-col gap-4">
           <DataTable
             columns={tableColumns}
             data={paginatedReports}
             loading={loading}
             emptyMessage="No reports match your filters"
             onRowClick={handleRowClick}
             rowClassName={(row) => isReportOverdue(row) ? 'border-l-4 border-l-red-500 bg-red-50/30 dark:bg-red-950/20' : ''}
           />
        </div>

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
    </OfficerGuard>
  )
}
