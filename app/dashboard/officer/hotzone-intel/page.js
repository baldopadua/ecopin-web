'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchClusters } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import { OfficerGuard } from '@/components/auth/RequireRole'
import { Target, Map as MapIcon, List } from 'lucide-react'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
export default function ClustersPage() {
  const [clusters, setClusters] = useState([])
  const [filteredClusters, setFilteredClusters] = useState([])
  const [loading, setLoading] = useState(true)
  
  // List view states
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      try {
        const clustersData = await fetchClusters()
        const sorted = (clustersData || []).sort((a, b) => (b.severity_score || 0) - (a.severity_score || 0))
        setClusters(sorted)
        setFilteredClusters(sorted)
      } catch (error) {
        console.error('Error fetching clusters:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    let result = clusters

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c => 
        (c.label && c.label.toLowerCase().includes(q)) || 
        c.id.toLowerCase().includes(q)
      )
    }

    if (typeFilter !== 'all') {
      result = result.filter(c => c.issue_type === typeFilter)
    }

    if (severityFilter !== 'all') {
      if (severityFilter === 'high') result = result.filter(c => c.severity_score >= 70)
      else if (severityFilter === 'medium') result = result.filter(c => c.severity_score >= 30 && c.severity_score < 70)
      else if (severityFilter === 'low') result = result.filter(c => c.severity_score < 30)
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'unknown') result = result.filter(c => !c.status)
      else result = result.filter(c => c.status === statusFilter)
    }

    setFilteredClusters(result)
    setCurrentPage(1)
  }, [searchQuery, typeFilter, severityFilter, statusFilter, clusters])

  // Top 3 Critical Hotzones (always based on unfiltered data)
  const criticalClusters = clusters
    .filter(c => (c.severity_score || 0) > 0)
    .slice(0, 3)

  // Derived filters
  const issueTypes = [...new Set(clusters.map(c => c.issue_type).filter(Boolean))]

  const handleResetFilters = () => {
    setSearchQuery('')
    setTypeFilter('all')
    setSeverityFilter('all')
    setStatusFilter('all')
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredClusters.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedClusters = filteredClusters.slice(startIndex, startIndex + itemsPerPage)

  const listColumns = [
    { 
      key: 'label', 
      label: 'Cluster ID / Label', 
      width: '20%',
      render: (val, row) => (
        <div>
          <div className="font-bold">{val || `Cluster ${row.id.slice(0,6)}`}</div>
          <div className="text-[10px] font-mono text-text-muted">{row.id}</div>
        </div>
      )
    },
    { key: 'issue_type', label: 'Pollution Type', width: '20%' },
    { 
      key: 'severity_score', 
      label: 'Severity Score', 
      width: '15%',
      render: (val) => (
        <span className={`font-black ${val >= 70 ? 'text-error' : val >= 30 ? 'text-warning' : 'text-info'}`}>
          {Math.round(val || 0)}
        </span>
      )
    },
    { 
      key: 'report_count', 
      label: 'Total Reports', 
      width: '10%',
      render: (val, row) => row.reports?.length || row.report_ids?.length || val || 0
    },
    { 
      key: 'radius_meters', 
      label: 'Radius', 
      width: '10%',
      render: (val) => `${Math.round(val || 50)}m`
    },
    {
      key: 'status',
      label: 'Status',
      width: '10%',
      render: (val) => val ? (
        <span className="uppercase text-xs font-bold font-mono tracking-widest text-text-secondary">{val}</span>
      ) : (
        <span className="text-text-muted text-xs font-mono">UNKNOWN</span>
      )
    }
  ]

  return (
    <OfficerGuard>
      <div className="p-8 h-[calc(100vh-64px)] flex flex-col">
        <div className="flex justify-between items-end mb-6">
          <PageHeader
            title="Hotzone Intel"
            subtitle="Spatial intelligence and cluster mapping"
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard/officer' },
              { label: 'Hotzone Intel' }
            ]}
          />
        </div>

        <div className="flex-1 flex flex-col pb-8">
            <FilterBar
              searchPlaceholder="Search clusters by ID or label..."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              filters={[
                {
                  label: 'Pollution Type',
                  value: typeFilter,
                  onChange: setTypeFilter,
                  options: [
                    { value: 'all', label: 'All Types' },
                    ...issueTypes.map(type => ({ value: type, label: type }))
                  ]
                },
                {
                  label: 'Severity',
                  value: severityFilter,
                  onChange: setSeverityFilter,
                  options: [
                    { value: 'all', label: 'All Severities' },
                    { value: 'high', label: 'High (70+)' },
                    { value: 'medium', label: 'Medium (30-69)' },
                    { value: 'low', label: 'Low (<30)' }
                  ]
                },
                {
                  label: 'Status',
                  value: statusFilter,
                  onChange: setStatusFilter,
                  options: [
                    { value: 'all', label: 'All Statuses' },
                    { value: 'unknown', label: 'Unknown' },
                    { value: 'resolved', label: 'Resolved' }
                  ]
                }
              ]}
              onReset={handleResetFilters}
              resultsCount={filteredClusters.length}
              loading={loading}
            />

            <div className="card p-6 border-2 border-[#1a1a1a] dark:border-[#333333] rounded-none flex-1 flex flex-col">
              <DataTable 
                columns={listColumns}
                data={paginatedClusters}
                loading={loading}
                emptyMessage="No hotzones match your filters."
                onRowClick={(row) => router.push(`/dashboard/officer/hotzone-intel/${row.id}`)}
              />
              
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredClusters.length}
                  className="mt-6"
                />
              )}
            </div>
          </div>
      </div>
    </OfficerGuard>
  )
}