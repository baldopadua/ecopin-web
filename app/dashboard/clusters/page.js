'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchClusters, fetchValidatedReports } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'

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
  const itemsPerPage = 10

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
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'medium':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
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
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      default:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
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
      <div className="card mb-6 border-l-4 border-l-[var(--accent-green)] no-hover">
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
          <div className="min-w-[150px]">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
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
