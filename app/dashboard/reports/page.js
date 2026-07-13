'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchFilteredReports, fetchIssueTypes } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'

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
  const [lifecycleFilter, setLifecycleFilter] = useState('all')

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

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

    if (lifecycleFilter !== 'all') {
      filtered = filtered.filter(r => r.stage === lifecycleFilter)
    }

    setFilteredReports(filtered)
    setCurrentPage(1) // Reset to page 1 when filters change
  }, [searchQuery, typeFilter, statusFilter, validationFilter, lifecycleFilter, reports])

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
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-red-100 text-red-800'
    }
  }

  const getValidationColor = (status) => {
    switch (status) {
      case 'validated':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-gray-100 text-gray-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getLifecycleStageColor = (stage) => {
    switch (stage) {
      case 'submitted':
        return 'bg-purple-100 text-purple-800'
      case 'acknowledged':
        return 'bg-blue-100 text-blue-800'
      case 'responded':
        return 'bg-yellow-100 text-yellow-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'closed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
      <div className="card mb-6 border-l-4 border-l-[var(--accent-green)] no-hover">
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
          <div className="min-w-[150px]">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Types</option>
              {issueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="min-w-[150px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Status</option>
              <option value="unresolved">Unresolved</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Validation Filter */}
          <div className="min-w-[150px]">
            <select
              value={validationFilter}
              onChange={(e) => setValidationFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Validation</option>
              <option value="validated">Validated</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Lifecycle Stage Filter */}
          <div className="min-w-[150px]">
            <select
              value={lifecycleFilter}
              onChange={(e) => setLifecycleFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Stages</option>
              <option value="submitted">Submitted</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="responded">Responded</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {(searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || validationFilter !== 'all' || lifecycleFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setTypeFilter('all')
                setStatusFilter('all')
                setValidationFilter('all')
                setLifecycleFilter('all')
              }}
              className="px-4 py-2 text-sm text-accent-green hover:bg-accent-green/10 rounded-lg transition-colors"
            >
              Clear Filters
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
          <p className="text-text-muted">Loading reports...</p>
        ) : filteredReports.length === 0 ? (
          <p className="text-text-muted">No reports match your filters</p>
        ) : (
          <>
            <div className="overflow-x-auto mb-6">
              <table className="w-full">
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
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                          {report.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getValidationColor(report.validation_status)}`}>
                          {report.validation_status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {report.stage && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLifecycleStageColor(report.stage)}`}>
                            {report.stage.replace('_', ' ')}
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
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-2 rounded-lg ${
                        currentPage === page
                          ? 'bg-accent-green text-white'
                          : 'bg-surface text-text-primary hover:bg-accent-green/10'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
