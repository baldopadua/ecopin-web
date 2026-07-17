'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchClusters, fetchValidatedReports } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import FilterDropdown from '@/components/ui/FilterDropdown'
import { SkeletonLine } from '@/components/ui/Skeleton'

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
    let filtered = clusters.filter(c => {
      // First filter to only clusters with at least 2 reports
      const clusterReports = reports.filter(r => String(r.cluster_id) === String(c.id))
      return clusterReports.length >= 2
    })

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
        return 'bg-error/10 text-error border-error/30'
      case 'medium':
        return 'bg-warning/10 text-warning border-warning/30'
      case 'low':
        return 'bg-info/10 text-info border-info/30'
      default:
        return 'bg-surface text-text-muted border-border'
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
        return 'bg-success/10 text-success border-success/30'
      case 'in_progress':
        return 'bg-warning/10 text-warning border-warning/30'
      case 'waiting_for_feedback':
        return 'bg-info/10 text-info border-info/30'
      case 'closed':
        return 'bg-surface text-text-muted border-border'
      case 'pending_owner_consent':
        return 'bg-warning/10 text-warning border-warning/30'
      default:
        return 'bg-error/10 text-error border-error/30'
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

          {/* Reset Filters Button */}
          {(searchQuery || severityFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSeverityFilter('all')
                setStatusFilter('all')
              }}
              className="btn-secondary whitespace-nowrap cursor-pointer"
            >
              Reset Filters
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
          <div className="space-y-3">
            <div className="flex gap-4 border-b border-border pb-3">
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
              </div>
            ))}
          </div>
        ) : filteredClusters.length === 0 ? (
          <p className="text-text-muted">No clusters match your filters</p>
        ) : (
          <>
            <div className="overflow-x-auto mb-6">
              <table className="w-full">
                <colgroup>
                  <col style={{ width: '40%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
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
                          <span className={`px-2 py-1 rounded text-xs font-semibold border ${getSeverityColor(cluster.severity)}`}>
                            {cluster.severity?.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(clusterStatus)}`}>
                            {clusterStatus.replace(/_/g, ' ').toUpperCase()}
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
