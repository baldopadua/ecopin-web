'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchClusters, fetchValidatedReports } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import FilterDropdown from '@/components/ui/FilterDropdown'

export default function ClustersPage() {
  const [clusters, setClusters] = useState([])
  const [reports, setReports] = useState([])
  const [filteredClusters, setFilteredClusters] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  useEffect(() => {
    Promise.all([
      fetchClusters(),
      fetchValidatedReports()
    ]).then(([clustersData, reportsData]) => {
      setClusters(clustersData)
      setFilteredClusters(clustersData)
      setReports(reportsData)
      setLoading(false)
    }).catch(error => {
      console.error('Error fetching data:', error)
      setLoading(false)
    })
  }, [])

  // Apply filters
  useEffect(() => {
    let filtered = clusters

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c =>
        (c.id && c.id.toLowerCase().includes(query)) ||
        (c.issue_type && c.issue_type.toLowerCase().includes(query))
      )
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(c => c.severity === severityFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => {
        const clusterReports = reports.filter(r => String(r.cluster_id) === String(c.id))
        const resolvedCount = clusterReports.filter(r => r.status === 'resolved').length
        const totalCount = clusterReports.length

        if (totalCount === 0) return false

        if (statusFilter === 'resolved') return resolvedCount === totalCount
        if (statusFilter === 'in_progress') return resolvedCount > 0 && resolvedCount < totalCount
        if (statusFilter === 'unresolved') return resolvedCount === 0

        return true
      })
    }

    setFilteredClusters(filtered)
    setCurrentPage(1)
  }, [searchQuery, severityFilter, statusFilter, clusters, reports])

  // Calculate pagination
  const totalPages = Math.ceil(filteredClusters.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedClusters = filteredClusters.slice(startIndex, endIndex)

  const handlePageChange = (page) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRowClick = (clusterId) => {
    router.push(`/dashboard/clusters/${clusterId}`)
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-error/10 text-error dark:bg-error/20 dark:text-error'
      case 'medium':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'low':
        return 'bg-info/10 text-info dark:bg-info/20 dark:text-info'
      default:
        return 'bg-surface text-text-muted dark:bg-surface dark:text-text-muted'
    }
  }

  const getClusterStatus = (clusterId) => {
    const clusterReports = reports.filter(r => String(r.cluster_id) === String(clusterId))
    const resolvedCount = clusterReports.filter(r => r.status === 'resolved').length
    const totalCount = clusterReports.length

    if (totalCount === 0) return 'unresolved'
    if (resolvedCount === totalCount) return 'resolved'
    if (resolvedCount > 0) return 'in_progress'
    return 'unresolved'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-success/10 text-success'
      case 'in_progress':
        return 'bg-warning/10 text-warning'
      case 'waiting_for_feedback':
        return 'bg-info/10 text-info'
      case 'closed':
        return 'bg-surface text-text-muted'
      case 'pending_owner_consent':
        return 'bg-warning/10 text-warning'
      default:
        return 'bg-error/10 text-error'
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Clusters"
        subtitle="Grouped reports of similar environmental issues"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clusters' }
        ]}
      />

      {/* Search and Filters */}
      <div className="card mb-6 sticky top-[120px] z-10 bg-white/60 dark:bg-black/60 border-l-4 border-l-[var(--accent-green)] no-hover">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by cluster ID or issue type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
            />
          </div>

          {/* Severity Filter */}
          <FilterDropdown
            label="All Severities"
            value={severityFilter}
            onChange={setSeverityFilter}
            options={[
              { value: 'all', label: 'All Severities' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' }
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

          {/* Clear Filters Button */}
          {(searchQuery || severityFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSeverityFilter('all')
                setStatusFilter('all')
              }}
              className="px-4 py-2 text-sm text-accent-green hover:bg-accent-green/10 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}

          {/* Results count */}
          <span className="text-sm text-text-secondary ml-auto">
            {loading ? 'Loading...' : `${filteredClusters.length} clusters`}
          </span>
        </div>
      </div>

      {/* Clusters List */}
      <div className="card no-hover">
        <h2 className="text-xl font-bold text-text-primary mb-4">Clusters List</h2>
        {loading ? (
          <p className="text-text-muted">Loading clusters...</p>
        ) : filteredClusters.length === 0 ? (
          <p className="text-text-muted">No clusters match your filters</p>
        ) : (
          <>
            <div className="overflow-x-auto mb-6">
              <table className="w-full">
                <colgroup>
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '35%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '30%' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Cluster ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Issue Type</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Reports</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Severity</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedClusters.map((cluster) => {
                    const clusterReports = reports.filter(r => String(r.cluster_id) === String(cluster.id))
                    const clusterStatus = getClusterStatus(cluster.id)
                    return (
                      <tr
                        key={cluster.id}
                        className="border-b border-border cursor-pointer"
                        onClick={() => handleRowClick(cluster.id)}
                      >
                        <td className="py-3 px-4">
                          <span className="font-medium text-text-primary">#{cluster.id}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-text-secondary">{cluster.issue_type || 'Similar environmental issues'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-text-muted">{clusterReports.length}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(cluster.severity)}`}>
                            {cluster.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(clusterStatus)}`}>
                            {clusterStatus.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <p className="text-sm text-text-muted">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredClusters.length)} of {filteredClusters.length} clusters
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
