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
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-text-secondary mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by cluster ID or issue type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
            />
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Severity</label>
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
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
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
        </div>

        {/* Results count */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-text-secondary">
            {loading ? 'Loading...' : `Showing ${startIndex + 1}-${Math.min(endIndex, filteredClusters.length)} of ${filteredClusters.length} clusters`}
          </p>
        </div>
      </div>

      {/* Clusters List */}
      <div className="card">
        <h2 className="text-xl font-bold text-text-primary mb-4">Clusters List</h2>
        {loading ? (
          <p className="text-text-muted">Loading clusters...</p>
        ) : filteredClusters.length === 0 ? (
          <p className="text-text-muted">No clusters match your filters</p>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedClusters.map((cluster) => {
                const clusterReports = reports.filter(r => String(r.cluster_id) === String(cluster.id))
                const clusterStatus = getClusterStatus(cluster.id)
                return (
                  <div
                    key={cluster.id}
                    className="p-4 border border-border rounded-lg hover:bg-surface cursor-pointer transition-colors"
                    onClick={() => handleRowClick(cluster.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-text-primary">Cluster #{cluster.id}</h3>
                        <p className="text-text-secondary mt-1">
                          {cluster.issue_type ? `Issue type: ${cluster.issue_type}` : 'Similar environmental issues'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-4 text-sm">
                          <span className="text-text-muted">
                            {clusterReports.length} reports
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 flex flex-col gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(cluster.severity)}`}>
                          {cluster.severity} severity
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(clusterStatus)}`}>
                          {clusterStatus.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
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
