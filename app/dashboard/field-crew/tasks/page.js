'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchClusters } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import { FieldCrewGuard } from '@/components/auth/RequireRole'

export default function FieldCrewTasksPage() {
  const router = useRouter()
  const [clusters, setClusters] = useState([])
  const [filteredClusters, setFilteredClusters] = useState([])
  const [loading, setLoading] = useState(true)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  useEffect(() => {
    const loadClusters = async () => {
      try {
        const data = await fetchClusters()
        setClusters(data)
        setFilteredClusters(data)
      } catch (error) {
        console.error('Failed to load clusters:', error)
      } finally {
        setLoading(false)
      }
    }
    loadClusters()
  }, [])

  // Apply filters
  useEffect(() => {
    let filtered = clusters

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c =>
        (c.id && String(c.id).toLowerCase().includes(query)) ||
        (c.issue_type && c.issue_type.toLowerCase().includes(query))
      )
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(c => c.severity === severityFilter)
    }

    setFilteredClusters(filtered)
    setCurrentPage(1)
  }, [searchQuery, severityFilter, clusters])

  // Calculate pagination
  const totalPages = Math.ceil(filteredClusters.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedClusters = filteredClusters.slice(startIndex, endIndex)

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleRowClick = (cluster) => {
    router.push(`/dashboard/field-crew/clusters/${cluster.id}`)
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setSeverityFilter('all')
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="p-8">
      <PageHeader
        title="My Tasks"
        subtitle="Manage your assigned cleanup tasks"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard/field-crew' },
          { label: 'Tasks' }
        ]}
      />

      {/* Search and Filters */}
      <FilterBar
        searchPlaceholder="Search by cluster ID or issue type..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          {
            label: 'All Severity',
            value: severityFilter,
            onChange: setSeverityFilter,
            options: [
              { value: 'all', label: 'All Severity' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' }
            ]
          }
        ]}
        onReset={handleResetFilters}
        resultsCount={filteredClusters.length}
        loading={loading}
      />

      {/* Tasks List */}
      <DataTable
        columns={[
          { key: 'id', label: 'Cluster ID', width: '15%' },
          { 
            key: 'issue_type', 
            label: 'Issue Type', 
            width: '25%',
            render: (value) => (
              <span className="text-sm text-text-secondary">{value || 'Mixed Issues'}</span>
            )
          },
          { 
            key: 'task_count', 
            label: 'Reports', 
            width: '15%',
            render: (value) => (
              <span className="text-sm text-text-muted">{value || 0}</span>
            )
          },
          { 
            key: 'severity', 
            label: 'Severity', 
            width: '20%',
            render: (value) => (
              <StatusBadge status={value || 'low'} type="task" />
            )
          },
          {
            key: 'created_at',
            label: 'Created',
            width: '25%',
            render: (value) => (
              <span className="text-sm text-text-muted">{formatDate(value)}</span>
            )
          }
        ]}
        data={paginatedClusters}
        loading={loading}
        emptyMessage="No tasks match your filters"
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
  )
}