'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchFilteredReports, fetchIssueTypes } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import FilterDropdown from '@/components/ui/FilterDropdown'
import { SkeletonLine } from '@/components/ui/Skeleton'

export default function ReportsPage() {
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
        // Include both pending and manual_review when filtering by pending
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
    setCurrentPage(1) // Reset to page 1 when filters change
  }, [searchQuery, typeFilter, statusFilter, validationFilter, reports])

  // Calculate pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedReports = filteredReports.slice(startIndex, endIndex)

  const handlePageChange = (page) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRowClick = (reportId) => {
    router.push(`/dashboard/reports/${reportId}`)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-success/20 text-success border-success/30'
      case 'in_progress':
        return 'bg-warning/20 text-warning border-warning/30'
      case 'waiting_for_feedback':
        return 'bg-purple/20 text-purple border-purple/30'
      case 'closed':
        return 'bg-text-muted/20 text-text-muted border-text-muted/30'
      case 'pending_owner_consent':
        return 'bg-info/20 text-info border-info/30'
      default:
        return 'bg-error/20 text-error border-error/30'
    }
  }

  const getValidationColor = (status) => {
    switch (status) {
      case 'validated':
      case 'automatically_valid':
        return 'bg-success/20 text-success border-success/30'
      case 'pending':
      case 'pending_ai_validation':
        return 'bg-warning/20 text-warning border-warning/30'
      case 'manual_review':
      case 'Manual_Review':
        return 'bg-purple/20 text-purple border-purple/30'
      case 'rejected':
        return 'bg-error/20 text-error border-error/30'
      default:
        return 'bg-text-muted/20 text-text-muted border-text-muted/30'
    }
  }

  const getLifecycleStageColor = (stage) => {
    switch (stage) {
      case 'submitted':
        return 'bg-purple/20 text-purple border-purple/30'
      case 'acknowledged':
        return 'bg-info/20 text-info border-info/30'
      case 'responded':
        return 'bg-warning/20 text-warning border-warning/30'
      case 'resolved':
        return 'bg-success/20 text-success border-success/30'
      case 'closed':
        return 'bg-text-muted/20 text-text-muted border-text-muted/30'
      default:
        return 'bg-text-muted/20 text-text-muted border-text-muted/30'
    }
  }

  return (
    <div className="p-8">
      <PageHeader 
        title="Reports"
        subtitle="View and manage environmental reports"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports' }
        ]}
      />

      {/* Search and Filters */}
      <div className="card mb-6 sticky top-[120px] z-10 bg-white/60 dark:bg-black/60 border-l-4 border-l-[var(--accent-green)] no-hover">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
            />
          </div>

          {/* Type Filter */}
          <FilterDropdown
            label="All Types"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: 'all', label: 'All Types' },
              ...issueTypes.map(type => ({ value: type, label: type }))
            ]}
          />

          {/* Status Filter */}
          <FilterDropdown
            label="All Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'unresolved', label: 'Unresolved' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' },
              { value: 'pending_owner_consent', label: 'Pending Owner Consent' },
              { value: 'waiting_for_feedback', label: 'Waiting for Feedback' }
            ]}
          />

          {/* Validation Filter */}
          <FilterDropdown
            label="All Validation"
            value={validationFilter}
            onChange={setValidationFilter}
            options={[
              { value: 'all', label: 'All Validation' },
              { value: 'automatically_valid', label: 'Automatically Valid' },
              { value: 'manual_review', label: 'Manual Review' },
              { value: 'validated', label: 'Validated' },
              { value: 'rejected', label: 'Rejected' }
            ]}
          />

          {/* Reset Filters Button */}
          {(searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || validationFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setTypeFilter('all')
                setStatusFilter('all')
                setValidationFilter('all')
              }}
              className="btn-secondary whitespace-nowrap cursor-pointer"
            >
              Reset Filters
            </button>
          )}

          {/* Results count */}
          <span className="text-sm text-text-secondary ml-auto">
            {loading ? 'Loading...' : `${filteredReports.length} reports`}
          </span>
        </div>
      </div>

      {/* Reports List */}
      <div className="card no-hover">
        <h2 className="text-xl font-bold text-text-primary mb-4">Reports List</h2>
        {loading ? (
          <div className="space-y-3">
            <div className="flex gap-4 border-b border-border pb-3">
              <SkeletonLine className="h-4 flex-1" />
              <SkeletonLine className="h-4 flex-1" />
              <SkeletonLine className="h-4 flex-1" />
              <SkeletonLine className="h-4 flex-1" />
              <SkeletonLine className="h-4 flex-1" />
              <SkeletonLine className="h-4 flex-1" />
              <SkeletonLine className="h-4 flex-1" />
            </div>
            {Array.from({ length: 8 }).map((_, row) => (
              <div key={row} className="flex gap-4 border-b border-border/50 py-3">
                <SkeletonLine className="h-3 flex-1" />
                <SkeletonLine className="h-3 flex-1" />
                <SkeletonLine className="h-3 flex-1" />
                <SkeletonLine className="h-3 flex-1" />
                <SkeletonLine className="h-3 flex-1" />
                <SkeletonLine className="h-3 flex-1" />
                <SkeletonLine className="h-3 flex-1" />
              </div>
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <p className="text-text-muted">No reports match your filters</p>
        ) : (
          <>
            <div className="overflow-x-auto mb-6">
              <table className="w-full">
                <colgroup>
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '10%' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Title</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Description</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Validation</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReports.map((report) => (
                    <tr
                      key={report.id}
                      className="border-b border-border cursor-pointer"
                      onClick={() => handleRowClick(report.id)}
                    >
                      <td className="py-3 px-4">
                        <span className="font-medium text-text-primary">{report.title}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-text-secondary line-clamp-2 max-w-xs">{report.description}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-text-muted">{report.issue_type || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-text-muted">{new Date(report.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(report.status)}`}>
                          {report.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${getValidationColor(report.validation_status)}`}>
                          {report.validation_status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {report.stage && (
                          <span className={`px-2 py-1 rounded text-xs font-semibold border ${getLifecycleStageColor(report.stage)}`}>
                            {report.stage.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <p className="text-sm text-text-muted">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredReports.length)} of {filteredReports.length} reports
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 rounded ${currentPage === pageNum ? 'btn-primary' : 'btn-secondary'}`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
