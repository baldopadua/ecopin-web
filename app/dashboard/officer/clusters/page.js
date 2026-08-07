'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchClusters, fetchValidatedReports } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import { OfficerGuard } from '@/components/auth/RequireRole'

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
  }

  const handleRowClick = (cluster) => {
    router.push(`/dashboard/clusters/${cluster.id}`)
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setSeverityFilter('all')
    setStatusFilter('all')
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

  const getReportCount = (clusterId) => {
    return reports.filter(r => String(r.cluster_id) === String(clusterId)).length
  }

  const tableColumns = [
    { 
      key: 'id', 
      label: 'Cluster ID', 
      width: '20%',
      render: (value) => (
        <span className="font-medium text-text-primary">{value}</span>
      )
    },
    { 
      key: 'issue_type', 
      label: 'Issue Type', 
      width: '25%',
      render: (value) => (
        <span className="text-sm text-text-secondary">{value || 'N/A'}</span>
      )
    },
    { 
      key: 'severity', 
      label: 'Severity', 
      width: '15%',
      render: (value) => (
        <StatusBadge status={value} type="severity" />
      )
    },
    { 
      key: 'reports', 
      label: 'Reports', 
      width: '15%',
      render: (value, row) => (
        <span className="text-sm text-text-primary">{getReportCount(row.id)}</span>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      width: '25%',
      render: (value, row) => (
        <StatusBadge status={getClusterStatus(row.id)} type="cluster" />
      )
    }
  ]

  return (
    <OfficerGuard>
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
        <FilterBar
          searchPlaceholder="Search by cluster ID or issue type..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          filters={[
            {
              label: 'All Severities',
              value: severityFilter,
              onChange: setSeverityFilter,
              options: [
                { value: 'all', label: 'All Severities' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' }
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
            }
          ]}
          onReset={handleResetFilters}
          resultsCount={filteredClusters.length}
          loading={loading}
        />

        {/* Clusters List */}
        <DataTable
          columns={tableColumns}
          data={paginatedClusters}
          loading={loading}
          emptyMessage="No clusters found"
          onRowClick={handleRowClick}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            itemsPerPage={itemsPerPage}
            totalItems={filteredClusters.length}
            className="mt-6"
          />
        )}
      </div>
    </OfficerGuard>
  )
}