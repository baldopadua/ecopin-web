'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchFilteredReports, fetchIssueTypes } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import { OfficerGuard } from '@/components/auth/RequireRole'
import { Target, Wrench } from 'lucide-react'

export default function OfficerReportsPage() {
  const [reports, setReports] = useState([])
  const [filteredReports, setFilteredReports] = useState([])
  const [issueTypes, setIssueTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Filter states - default to unresolved
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('unresolved')
  const [validationFilter, setValidationFilter] = useState('all')

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  useEffect(() => {
    Promise.all([
      fetchFilteredReports(),
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

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter)
    }

    if (validationFilter !== 'all') {
      if (validationFilter === 'pending') {
        filtered = filtered.filter(r => 
          r.validation_status === 'pending' || 
          r.validation_status === 'manual_review' || 
          r.validation_status === 'Manual_Review'
        )
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
    setStatusFilter('unresolved') // Reset defaults back to unresolved
    setValidationFilter('all')
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const tableColumns = [
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
      label: 'Issue Type', 
      width: '15%',
      render: (value) => (
        <span className="text-sm text-text-secondary">{value || 'N/A'}</span>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      width: '10%',
      render: (value) => (
        <StatusBadge status={value} type="report" />
      )
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
           className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest bg-transparent px-3 py-1.5 border-2 border-[#1a1a1a] dark:border-[#333333] hover:border-accent-green hover:text-accent-green transition-colors"
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
              label: 'Status',
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
              label: 'All Validation',
              value: validationFilter,
              onChange: setValidationFilter,
              options: [
                { value: 'all', label: 'All Validation' },
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
        />

        {/* Reports List */}
        <div className="card p-6 border-2 border-[#1a1a1a] dark:border-[#333333] rounded-none">
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
