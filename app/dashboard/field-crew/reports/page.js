'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchValidatedReports, fetchIssueTypes } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import { FieldCrewGuard } from '@/components/auth/RequireRole'

export default function FieldCrewReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState([])
  const [filteredReports, setFilteredReports] = useState([])
  const [issueTypes, setIssueTypes] = useState([])
  const [loading, setLoading] = useState(true)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  useEffect(() => {
    Promise.all([
      fetchValidatedReports(),
      fetchIssueTypes()
    ]).then(([reportsData, typesData]) => {
      // Filter to only verified (automatically_valid), unclustered, active reports
      const filteredReports = reportsData.filter(report => {
        const isVerified = report.validation_status === 'automatically_valid'
        const isUnclustered = report.cluster_id === null
        const isActive = report.status.toLowerCase() !== 'invalid' && 
                         report.status.toLowerCase() !== 'resolved' && 
                         report.status.toLowerCase() !== 'closed'
        
        return isVerified && isUnclustered && isActive
      })

      // Sort by newest first
      filteredReports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      
      setReports(filteredReports)
      setFilteredReports(filteredReports)
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

    setFilteredReports(filtered)
    setCurrentPage(1)
  }, [searchQuery, typeFilter, reports])

  // Calculate pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedReports = filteredReports.slice(startIndex, endIndex)

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleRowClick = (report) => {
    router.push(`/dashboard/reports/${report.id}`)
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setTypeFilter('all')
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Available Reports"
        subtitle="Verified reports ready for cleanup"
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
          }
        ]}
        onReset={handleResetFilters}
        resultsCount={filteredReports.length}
        loading={loading}
      />

      {/* Reports List */}
      <DataTable
        columns={[
          { 
            key: 'title', 
            label: 'Title', 
            width: '30%',
            render: (value) => (
              <span className="font-medium text-text-primary">{value}</span>
            )
          },
          { 
            key: 'issue_type', 
            label: 'Issue Type', 
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
            label: 'Validation', 
            width: '15%',
            render: (value) => (
              <StatusBadge status={value} type="validation" />
            )
          },
          { 
            key: 'created_at', 
            label: 'Created', 
            width: '20%',
            render: (value) => (
              <span className="text-sm text-text-muted">{formatDate(value)}</span>
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
  )
}